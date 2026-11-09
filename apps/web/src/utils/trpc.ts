import type { AppRouter } from "@linkden/api/routers/index";

import { env } from "@linkden/env/web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";
import { changesPublicationSource } from "@/lib/publication-state";

export const queryClient = new QueryClient({
	mutationCache: new MutationCache({
		onSuccess: (_data, variables, _context, mutation) => {
			if (changesPublicationSource(mutation.options.mutationKey, variables)) {
				void queryClient.invalidateQueries({
					queryKey: trpc.publication.status.queryOptions().queryKey,
				});
			}
		},
	}),
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

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${env.NEXT_PUBLIC_SERVER_URL}/trpc`,
			// The API rejects batches above TRPC_MAX_BATCH_SIZE (20) in
			// apps/server/src/index.ts; stay under it so a busy admin page
			// splits into several requests instead of failing.
			maxItems: 10,
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
