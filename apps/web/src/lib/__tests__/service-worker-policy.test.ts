import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (event: Record<string, unknown>) => void;

describe("service worker navigation policy", () => {
	const handlers = new Map<string, Handler>();
	const cache = {
		add: vi.fn(),
		put: vi.fn(async () => {}),
		keys: vi.fn(async () => []),
		delete: vi.fn(),
	};
	const caches = {
		open: vi.fn(async () => cache),
		match: vi.fn(async () => new Response("offline")),
		keys: vi.fn(async () => ["linkden-v2", "unrelated-cache"]),
		delete: vi.fn(async () => true),
	};
	const fetch = vi.fn(async () => new Response("ok"));

	function loadWorker(origin = "https://linkden.test") {
		handlers.clear();
		vi.clearAllMocks();
		const source = readFileSync(resolve(process.cwd(), "apps/web/public/sw.js"), "utf8");
		runInNewContext(source, {
			Request,
			Response,
			URL,
			caches,
			fetch,
			self: {
				location: { origin, href: `${origin}/sw.js?v=1.2.3` },
				clients: { claim: vi.fn() },
				skipWaiting: vi.fn(),
				addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
			},
		});
	}
	beforeEach(() => loadWorker());

	it.each([
		"http://localhost:3001",
		"http://127.0.0.1:3001",
		"http://127.1.2.3:3001",
		"http://[::1]:3001",
	])("never intercepts mutable local assets at %s", (origin) => {
		loadWorker(origin);
		const respondWith = vi.fn();
		handlers.get("fetch")?.({
			request: { method: "GET", url: `${origin}/_next/static/chunks/dev.js` },
			respondWith,
		});
		expect(respondWith).not.toHaveBeenCalled();
		expect(caches.match).not.toHaveBeenCalled();
	});

	it("caches only the public root navigation", async () => {
		const waitUntil = vi.fn();
		const respondWith = vi.fn();
		handlers.get("fetch")?.({
			request: { method: "GET", mode: "navigate", url: "https://linkden.test/" },
			respondWith,
			waitUntil,
		});
		await respondWith.mock.calls[0]?.[0];

		expect(cache.put).toHaveBeenCalledOnce();
		expect(waitUntil).toHaveBeenCalledOnce();
	});

	it("never caches or replays an admin navigation", async () => {
		fetch.mockRejectedValueOnce(new Error("offline"));
		const respondWith = vi.fn();
		handlers.get("fetch")?.({
			request: { method: "GET", mode: "navigate", url: "https://linkden.test/admin/links" },
			respondWith,
			waitUntil: vi.fn(),
		});
		await respondWith.mock.calls[0]?.[0];

		expect(cache.put).not.toHaveBeenCalled();
		expect(caches.match).toHaveBeenCalledWith("/offline");
		expect(caches.match).not.toHaveBeenCalledWith(
			expect.objectContaining({ url: "https://linkden.test/admin/links" }),
		);
	});

	it("deletes the previous LinkDen cache during activation", async () => {
		let activation: Promise<unknown> | undefined;
		handlers.get("activate")?.({
			waitUntil: (promise: Promise<unknown>) => (activation = promise),
		});
		await activation;

		expect(caches.delete).toHaveBeenCalledWith("linkden-v2");
		expect(caches.delete).not.toHaveBeenCalledWith("unrelated-cache");
	});

	async function navigate(url: string, extra: Record<string, unknown> = {}) {
		const waitUntil = vi.fn();
		const respondWith = vi.fn();
		handlers.get("fetch")?.({
			request: { method: "GET", mode: "navigate", url },
			respondWith,
			waitUntil,
			...extra,
		});
		const response = await respondWith.mock.calls[0]?.[0];
		await Promise.all(waitUntil.mock.calls.map((c) => c[0]));
		return response as Response;
	}

	it("stores the home page under one key whatever the query string", async () => {
		await navigate("https://linkden.test/?fbclid=abc&utm_source=ig");
		expect(cache.put).toHaveBeenCalledWith("/", expect.any(Response));
	});

	it("never lets an outage render (5xx) replace the last good copy", async () => {
		fetch.mockResolvedValueOnce(new Response("Couldn't load this page", { status: 500 }));
		const response = await navigate("https://linkden.test/");
		expect(response.status).toBe(500);
		expect(cache.put).not.toHaveBeenCalled();
	});

	it.each([
		{ url: "https://linkden.test/admin/links", redirected: true },
		{ url: "https://linkden.test/admin/login", redirected: false },
		{ url: "https://another.test/", redirected: false },
	])(
		"does not cache a root response that resolves outside the public root: %s",
		async ({ url, redirected }) => {
			const response = new Response("private destination");
			Object.defineProperties(response, { url: { value: url }, redirected: { value: redirected } });
			fetch.mockResolvedValueOnce(response);
			expect(await navigate("https://linkden.test/")).toBe(response);
			expect(cache.put).not.toHaveBeenCalled();
		},
	);

	it("serves the cached home page offline, ignoring the query", async () => {
		fetch.mockRejectedValueOnce(new Error("offline"));
		await navigate("https://linkden.test/?utm_campaign=x");
		expect(caches.match).toHaveBeenCalledWith("/");
	});

	it("uses the navigation preload response instead of a second fetch", async () => {
		const preloaded = new Response("preloaded");
		await navigate("https://linkden.test/", { preloadResponse: Promise.resolve(preloaded) });
		expect(fetch).not.toHaveBeenCalled();
		expect(cache.put).toHaveBeenCalledOnce();
	});

	it("names its cache after the release so each deploy starts clean", async () => {
		let activation: Promise<unknown> | undefined;
		caches.keys.mockResolvedValueOnce(["linkden-v5-1.2.3", "linkden-v6-1.2.2", "linkden-v6-1.2.3"]);
		handlers.get("activate")?.({
			waitUntil: (promise: Promise<unknown>) => (activation = promise),
		});
		await activation;
		expect(caches.delete).toHaveBeenCalledWith("linkden-v5-1.2.3");
		expect(caches.delete).toHaveBeenCalledWith("linkden-v6-1.2.2");
		expect(caches.delete).not.toHaveBeenCalledWith("linkden-v6-1.2.3");
	});
});
