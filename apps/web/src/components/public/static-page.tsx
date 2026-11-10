"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ComponentProps, useState } from "react";
import { createPublicContactSubmit } from "@/lib/public-contact";
import { PublicPage } from "./public-page";
import { PublicRuntimeProvider } from "./public-runtime";

export interface StaticPagePayload {
	data: ComponentProps<typeof PublicPage>["data"];
	initialColorMode: "light" | "dark";
	contactEndpoint: string | null;
	globalVcardHref: string | null;
	blockVcardHrefs: Record<string, string>;
}

/** The same profile and interactions, supplied only with public snapshot data. */
export function StaticPage({ payload }: { payload: StaticPagePayload }) {
	const [client] = useState(
		() => new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
	);
	const runtime = {
		submitContact: payload.contactEndpoint
			? createPublicContactSubmit(payload.contactEndpoint)
			: async () => {
					throw new Error("Contact delivery is not configured");
				},
		vcardHref: (blockId?: string) =>
			blockId === undefined
				? (payload.globalVcardHref ?? undefined)
				: payload.blockVcardHrefs[blockId],
	};
	return (
		<QueryClientProvider client={client}>
			<PublicRuntimeProvider value={runtime}>
				<PublicPage data={payload.data} initialColorMode={payload.initialColorMode} />
			</PublicRuntimeProvider>
		</QueryClientProvider>
	);
}
