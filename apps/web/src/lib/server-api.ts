import { env } from "@linkden/env/web";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { localHttpOrigin } from "./local-development";

// The API worker is bound to the web worker as a service binding named `API`
// (packages/infra/alchemy.run.ts). Typed locally so we don't have to augment
// OpenNext's global `CloudflareEnv`.
interface WebBindings {
	API?: Fetcher;
}

/** Shared binding lookup; a genuine edge context supplies trusted client-IP metadata. */
export function apiServiceBinding(): { api?: Fetcher; trustedEdge: boolean } {
	try {
		const context = getCloudflareContext();
		return {
			api: (context.env as WebBindings).API,
			trustedEdge: typeof context.cf?.colo === "string",
		};
	} catch {
		return { trustedEdge: false };
	}
}

/**
 * Server-side fetch against the Hono API.
 *
 * In production the API is reached through the `API` service binding, never
 * by URL: both workers share one zone (`/api/*` + `/trpc/*` are Routes on the
 * API worker, everything else is the web worker's Custom Domain), and a
 * worker's own `fetch()` to its own zone bypasses Routes — the web worker
 * would end up calling itself. Outside a Workers context (local `next dev`,
 * `next build` prerender, vitest) there is no binding. An explicit loopback
 * INTERNAL_SERVER_URL keeps local SSR off a public tunnel; otherwise use
 * NEXT_PUBLIC_SERVER_URL.
 *
 * Note: a service-binding `Request` bypasses Next's fetch cache, so options
 * like `next: { revalidate }` only apply on the URL fallback path.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	const { api } = apiServiceBinding();
	if (api) {
		// The host is a placeholder; service bindings ignore it.
		return api.fetch(new Request(`https://api.internal${path}`, init));
	}
	const origin =
		localHttpOrigin(process.env.INTERNAL_SERVER_URL)?.origin ?? env.NEXT_PUBLIC_SERVER_URL;
	return fetch(`${origin}${path}`, init);
}
