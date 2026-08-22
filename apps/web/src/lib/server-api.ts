import { env } from "@linkden/env/web";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// The API worker is bound to the web worker as a service binding named `API`
// (packages/infra/alchemy.run.ts). Typed locally so we don't have to augment
// OpenNext's global `CloudflareEnv`.
interface WebBindings {
	API?: Fetcher;
}

/**
 * Server-side fetch against the Hono API.
 *
 * In production the API is reached through the `API` service binding, never
 * by URL: both workers share one zone (`/api/*` + `/trpc/*` are Routes on the
 * API worker, everything else is the web worker's Custom Domain), and a
 * worker's own `fetch()` to its own zone bypasses Routes — the web worker
 * would end up calling itself. Outside a Workers context (local `next dev`,
 * `next build` prerender, vitest) there is no binding, so we fall back to a
 * plain URL fetch against `NEXT_PUBLIC_SERVER_URL`.
 *
 * Note: a service-binding `Request` bypasses Next's fetch cache, so options
 * like `next: { revalidate }` only apply on the URL fallback path.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	let api: Fetcher | undefined;
	try {
		api = (getCloudflareContext().env as WebBindings).API;
	} catch {
		// No Cloudflare context (SSG / plain node) — use the URL fallback.
	}
	if (api) {
		// The host is a placeholder; service bindings ignore it.
		return api.fetch(new Request(`https://api.internal${path}`, init));
	}
	return fetch(`${env.NEXT_PUBLIC_SERVER_URL}${path}`, init);
}

// ponytail: hand-typed subset of public.getPage — PR 3 replaces this with
// inferRouterOutputs<AppRouter> in lib/public-page.ts.
export type PublicPagePayload = {
	profile?: {
		name?: string | null;
		image?: string | null;
		bio?: string | null;
	} | null;
	settings?: {
		seoTitle?: string | null;
		seoDescription?: string | null;
		seoOgImage?: string | null;
		seoOgMode?: string | null;
		seoOgTemplate?: string | null;
		customPrimary?: string | null;
		brandingFaviconUrl?: string | null;
	};
};

/** Public page payload for metadata. Never throws — returns `{}` on any failure. */
export async function getPublicPagePayload(): Promise<PublicPagePayload> {
	try {
		const res = await apiFetch("/trpc/public.getPage", { next: { revalidate: 60 } });
		if (!res.ok) return {};
		const json = (await res.json()) as { result?: { data?: PublicPagePayload } };
		return json?.result?.data ?? {};
	} catch {
		return {};
	}
}
