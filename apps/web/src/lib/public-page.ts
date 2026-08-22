import type { AppRouter } from "@linkden/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";
import { cache } from "react";
import { apiFetch } from "./server-api";

// Wire shape of `public.getPage`. The tRPC client uses no transformer, so Date
// columns (block.scheduledStart/End, createdAt…) arrive as ISO strings even
// though this type says Date; the public page never reads them.
type PublicPageData = inferRouterOutputs<AppRouter>["public"]["getPage"];

export type PublicPageResult = { ok: true; data: PublicPageData } | { ok: false; data: null };

/**
 * Server-side public page payload, deduped per request with React `cache` so
 * `generateMetadata` and the page RSC share one API call. Never throws —
 * `ok: false` means the API was unreachable or errored (the page shows a
 * retryable error card); `ok: true` with no profile means "not set up yet".
 */
export const getPublicPageResult = cache(async (): Promise<PublicPageResult> => {
	try {
		const res = await apiFetch("/trpc/public.getPage", { cache: "no-store" });
		if (!res.ok) return { ok: false, data: null };
		const json = (await res.json()) as { result?: { data?: PublicPageData } };
		return json.result?.data ? { ok: true, data: json.result.data } : { ok: false, data: null };
	} catch {
		return { ok: false, data: null };
	}
});

/** Convenience for callers that only need the payload (metadata, manifest). */
export const getPublicPage = async (): Promise<PublicPageData | null> =>
	(await getPublicPageResult()).data;
