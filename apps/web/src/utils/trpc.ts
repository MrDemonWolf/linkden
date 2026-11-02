import type { AppRouter } from "@linkden/api/routers/index";

import { env } from "@linkden/env/web";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (query.meta?.skipErrorToast) return;
			toast.error(error.message, {
				action: {
					label: "retry",
					// Sonner calls onClick with `this` = the action object, so an
					// unbound `query.invalidate` threw — and invalidate alone only
					// flags the query. Refetch exactly this query instead.
					onClick: () => {
						void queryClient.refetchQueries({ queryKey: query.queryKey, exact: true });
					},
				},
			});
		},
	}),
});

const trpcUrl = `${env.NEXT_PUBLIC_SERVER_URL}/trpc`;
const withCredentials: typeof fetch = (url, options) =>
	fetch(url, { ...options, credentials: "include" });

const trpcClient = createTRPCClient<AppRouter>({
	links: [
		splitLink({
			// backup.* calls get a request of their own: the API grants the 16MB
			// backup body limit only to a request made solely of backup calls.
			condition: (op) => op.path.startsWith("backup."),
			true: httpLink({ url: trpcUrl, fetch: withCredentials }),
			false: httpBatchLink({
				url: trpcUrl,
				// The API rejects batches above TRPC_MAX_BATCH_SIZE (20) in
				// apps/server/src/index.ts; stay under it so a busy admin page
				// splits into several requests instead of failing.
				maxItems: 10,
				fetch: withCredentials,
			}),
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
