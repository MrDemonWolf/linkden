import { afterEach, describe, expect, it, vi } from "vitest";
import { retireLegacyPublicWorker } from "../retire-service-worker";

afterEach(() => vi.unstubAllGlobals());

describe("static client service worker retirement", () => {
	it("unregisters only same-origin root /sw.js and deletes only LinkDen cache names", async () => {
		const origin = "https://profile.example.test";
		const registration = (scope: string, scriptURL: string) => ({
			scope,
			active: { scriptURL },
			unregister: vi.fn(async () => true),
		});
		const owned = registration(`${origin}/`, `${origin}/sw.js?v=0.5.0`);
		const admin = registration(`${origin}/admin/`, `${origin}/sw.js?v=0.5.0`);
		const foreignScript = registration(`${origin}/`, "https://other.example.test/sw.js");
		const unrelated = registration(`${origin}/`, `${origin}/another-sw.js`);
		const replacingOther = {
			...unrelated,
			waiting: { scriptURL: `${origin}/sw.js?v=old` },
			unregister: vi.fn(),
		};
		const invalid = registration("not a URL", `${origin}/sw.js`);
		const foreignScope = registration("https://other.example.test/", `${origin}/sw.js`);
		vi.stubGlobal("location", { origin });
		vi.stubGlobal("navigator", {
			serviceWorker: {
				getRegistrations: async () => [
					owned,
					admin,
					foreignScript,
					unrelated,
					replacingOther,
					invalid,
					foreignScope,
				],
			},
		});
		const removeCache = vi.fn(async () => true);
		vi.stubGlobal("caches", {
			keys: async () => ["linkden-v4-release", "other-app", "linkden-v3"],
			delete: removeCache,
		});
		await retireLegacyPublicWorker();
		expect(owned.unregister).toHaveBeenCalledOnce();
		for (const other of [admin, foreignScript, unrelated, replacingOther, invalid, foreignScope])
			expect(other.unregister).not.toHaveBeenCalled();
		expect(removeCache.mock.calls).toEqual([["linkden-v4-release"], ["linkden-v3"]]);
	});

	it("keeps cleanup failures from rejecting public hydration and still attempts independent cleanup", async () => {
		vi.stubGlobal("navigator", {
			serviceWorker: {
				getRegistrations: () => {
					throw new Error("storage blocked");
				},
			},
		});
		const removeCache = vi.fn(async () => true);
		vi.stubGlobal("caches", { keys: async () => ["linkden-v4-release"], delete: removeCache });
		await expect(retireLegacyPublicWorker()).resolves.toBeUndefined();
		expect(removeCache).toHaveBeenCalledWith("linkden-v4-release");
	});
});
