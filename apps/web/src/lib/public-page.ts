import type { AppRouter } from "@linkden/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";
import { cache } from "react";
import { apiFetch } from "./server-api";

// Wire shape of `public.getPage`. The tRPC client uses no transformer, so Date
// columns (block.scheduledStart/End, createdAt…) arrive as ISO strings even
// though this type says Date; the public page never reads them.
type PublicPageData = inferRouterOutputs<AppRouter>["public"]["getPage"];

/**
 * Server-side public page payload, deduped per request with React `cache` so
 * `generateMetadata` and the page RSC share one API call. Never throws —
 * returns `null` when the API is unreachable or responds with an error, which
 * callers treat the same as "no profile yet" (welcome page / defaults).
 */
export const getPublicPage = cache(async (): Promise<PublicPageData | null> => {
	try {
		const res = await apiFetch("/trpc/public.getPage", { cache: "no-store" });
		if (!res.ok) return null;
		const json = (await res.json()) as { result?: { data?: PublicPageData } };
		return json.result?.data ?? null;
	} catch {
		return null;
	}
});
