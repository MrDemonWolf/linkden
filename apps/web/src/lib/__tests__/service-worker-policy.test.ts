import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (event: Record<string, unknown>) => void;

describe("service worker navigation policy", () => {
	const handlers = new Map<string, Handler>();
	const cache = { add: vi.fn(), put: vi.fn() };
	const caches = {
		open: vi.fn(async () => cache),
		match: vi.fn(async () => new Response("offline")),
		keys: vi.fn(async () => ["linkden-v2", "unrelated-cache"]),
		delete: vi.fn(async () => true),
	};
	const fetch = vi.fn(async () => new Response("ok"));

	beforeEach(() => {
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
				location: { origin: "https://linkden.test" },
				clients: { claim: vi.fn() },
				skipWaiting: vi.fn(),
				addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
			},
		});
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
});
