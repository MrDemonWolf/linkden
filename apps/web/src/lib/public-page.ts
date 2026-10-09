import type { AppRouter } from "@linkden/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { apiFetch } from "./server-api";

// Wire shape of `public.getPage`. The tRPC client uses no transformer, so Date
// columns (block.scheduledStart/End, createdAt…) arrive as ISO strings even
// though this type says Date; the public page never reads them.
type PublicPageData = inferRouterOutputs<AppRouter>["public"]["getPage"];

export type PublicPageResult = { ok: true; data: PublicPageData } | { ok: false; data: null };

/**
 * Server-side public page payload, deduped per request with React `cache` so
 * `generateMetadata` and the page RSC share one API call. Never throws for an
 * API failure (only Next's own control-flow signals pass through) —
 * `ok: false` means the API was unreachable or errored (the page throws to
 * app/error.tsx's retry card); `ok: true` with no profile means "not set up yet".
 */
export const getPublicPageResult = cache(async (): Promise<PublicPageResult> => {
	try {
		const res = await apiFetch("/trpc/public.getPage", { cache: "no-store" });
		if (!res.ok) return { ok: false, data: null };
		const json = (await res.json()) as { result?: { data?: PublicPageData } };
		return json.result?.data ? { ok: true, data: json.result.data } : { ok: false, data: null };
	} catch (err) {
		// The `no-store` fetch makes Next bail out of build-time prerendering by
		// throwing its own signal; let it through so "/" and the manifest render
		// per request. Swallowed, the build would prerender them with no data (the
		// page now throws on that, failing `next build`).
		unstable_rethrow(err);
		return { ok: false, data: null };
	}
});

/** Convenience for callers that only need the payload (metadata, manifest). */
export const getPublicPage = async (): Promise<PublicPageData | null> =>
	(await getPublicPageResult()).data;
