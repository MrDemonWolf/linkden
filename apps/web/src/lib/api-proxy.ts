// The deployed web worker's entry (apps/web/worker.ts) hands these paths to the
// API worker through the `API` service binding before Next.js runs, so the site
// and its API share one origin even on workers.dev, where the two workers'
// hostnames are separate sites (workers.dev is on the Public Suffix List and the
// session cookie could not cross them). With SITE_DOMAIN set, zone Routes send
// the same prefixes straight to the API worker and this never runs.
// Keep the prefixes in step with the Routes in packages/infra/alchemy.run.ts.
export const API_PATH_PREFIXES = ["/api/", "/trpc/"] as const;

export function isApiPath(pathname: string): boolean {
	return API_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

interface ProxyEnv {
	API?: Fetcher;
}

/**
 * Forward an API request to the API worker unchanged (method, headers incl.
 * cookies and cf-connecting-ip, body, redirects), or return undefined to let
 * Next.js handle it. Without a binding (never in a deploy) Next.js answers.
 */
export function proxyApiRequest(request: Request, env: ProxyEnv): Promise<Response> | undefined {
	if (!env.API || !isApiPath(new URL(request.url).pathname)) return undefined;
	return env.API.fetch(request);
}
