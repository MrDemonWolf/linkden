import { localHttpOrigin, localHttpUrl } from "./local-development";
import { apiServiceBinding } from "./server-api";

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const HOP_HEADERS = [
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
];
const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "[::1]", "::ffff:127.0.0.1"]);
const PROXY_HOP = "x-linkden-api-proxy";

/** Next can canonicalize Request.url to localhost while retaining an IP Host. */
function sameLocalPort(left: URL | null, right: URL | null): boolean {
	return (
		!!left &&
		!!right &&
		left.protocol === right.protocol &&
		(left.port || "80") === (right.port || "80")
	);
}

function localTarget(request: Request): URL | null {
	if (!["development", "production"].includes(process.env.NODE_ENV ?? "")) return null;
	const target = localHttpOrigin(process.env.INTERNAL_SERVER_URL);
	const incoming = localHttpUrl(request.url);
	const host = request.headers.get("host");
	if (
		!target ||
		!incoming ||
		!host ||
		!sameLocalPort(localHttpOrigin(`http://${host}`), incoming) ||
		(target.port || "80") === (incoming.port || "80")
	)
		return null;
	// Do not launder a tunnel/edge request into the local DEV_LOGIN boundary.
	if (request.headers.has("cf-ray") || request.headers.has("forwarded")) return null;
	for (const name of ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"]) {
		const value = request.headers.get(name);
		if (value && !value.split(",").every((ip) => LOOPBACK_IPS.has(ip.trim()))) return null;
	}
	const forwardedHost = request.headers.get("x-forwarded-host");
	if (
		forwardedHost &&
		!forwardedHost
			.split(",")
			.every((value) => sameLocalPort(localHttpOrigin(`http://${value.trim()}`), incoming))
	)
		return null;
	const forwardedProto = request.headers.get("x-forwarded-proto");
	if (forwardedProto && !forwardedProto.split(",").every((value) => value.trim() === "http"))
		return null;
	return target;
}

function connectionHeaders(headers: Headers): string[] {
	return (headers.get("connection") ?? "")
		.split(",")
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
}

function withoutHopHeaders(headers: Headers): Headers {
	const result = new Headers(headers);
	for (const name of [...HOP_HEADERS, ...connectionHeaders(headers)]) result.delete(name);
	return result;
}

function failure(message: string, status: number): Response {
	return Response.json(
		{ error: message },
		{ status, headers: { "cache-control": "private, no-store" } },
	);
}

/** Same-origin browser API bridge. The selected binding, never a caller URL, chooses the service. */
export async function proxyApiRequest(request: Request): Promise<Response> {
	const incoming = new URL(request.url);
	if (!/^\/(?:api|trpc)(?:\/|$)/.test(incoming.pathname)) return failure("API path not found", 404);
	if (/%(?:2f|5c)/i.test(incoming.pathname)) return failure("Ambiguous API path", 400);
	if (!METHODS.includes(request.method)) {
		const response = failure("API method is not supported", 405);
		response.headers.set("allow", METHODS.join(", "));
		return response;
	}
	if (request.headers.has(PROXY_HOP)) return failure("API proxy loop prevented", 508);
	// A Connection nomination must not erase the upstream's CSRF/auth evidence.
	if (
		connectionHeaders(request.headers).some(
			(name) =>
				["origin", "referer", "cookie", "authorization"].includes(name) ||
				name.startsWith("sec-fetch-"),
		)
	) {
		return failure("Invalid API connection headers", 400);
	}
	const { api, trustedEdge } = apiServiceBinding();
	const origin = api ? new URL("https://api.internal") : localTarget(request);
	if (!origin)
		return failure("API binding is unavailable; local preview requires INTERNAL_SERVER_URL", 503);
	const target = new URL(`${incoming.pathname}${incoming.search}`, origin);
	const headers = withoutHopHeaders(request.headers);
	for (const name of [...headers.keys()]) {
		if (
			name === "host" ||
			name === "forwarded" ||
			name === "via" ||
			name.startsWith("x-forwarded-") ||
			name === "x-real-ip" ||
			name === "x-original-url" ||
			name === "x-rewrite-url" ||
			(name.startsWith("cf-") && !(api && trustedEdge && name === "cf-connecting-ip"))
		)
			headers.delete(name);
	}
	headers.set("host", target.host);
	// Prevent a local fetch adapter from decompressing bytes under stale encoding headers.
	headers.set("accept-encoding", "identity");
	headers.set(PROXY_HOP, "1");
	const init: RequestInit & { duplex?: "half" } = {
		method: request.method,
		headers,
		redirect: "manual",
		signal: request.signal,
		body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
		duplex: request.body ? "half" : undefined,
	};
	try {
		const upstream = new Request(target, init);
		// Bodies remain streams. The API's auth/tRPC/upload byte limits remain authoritative.
		const response = api ? await api.fetch(upstream) : await fetch(upstream, { cache: "no-store" });
		const responseHeaders = withoutHopHeaders(response.headers);
		responseHeaders.set("cache-control", "private, no-store");
		return new Response(request.method === "HEAD" ? null : response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
		});
	} catch {
		return failure("API service is unavailable", 502);
	}
}
