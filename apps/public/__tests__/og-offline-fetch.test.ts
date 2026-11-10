// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createOfflineOgFetch } from "../og-offline-fetch";

afterEach(() => vi.unstubAllGlobals());

it("denies both fetch and preconnect without invoking the original transport", async () => {
	const original = vi.fn();
	vi.stubGlobal("fetch", original);
	const attempted = vi.fn();
	const offline = createOfflineOgFetch(attempted);
	await expect(offline("https://provider.example.test/private")).rejects.toThrow(
		/cannot load remote/,
	);
	expect(() => offline.preconnect()).toThrow(/cannot load remote/);
	expect(attempted).toHaveBeenCalledTimes(2);
	expect(original).not.toHaveBeenCalled();
});

it("decodes only inline bundled WASM without a transport or network attempt", async () => {
	const original = vi.fn();
	vi.stubGlobal("fetch", original);
	const attempted = vi.fn();
	const offline = createOfflineOgFetch(attempted);
	const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
	const response = await offline(
		`data:application/octet-stream;base64,${Buffer.from(bytes).toString("base64")}`,
	);
	expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
	expect(response.headers.get("Content-Type")).toBe("application/wasm");
	expect(attempted).not.toHaveBeenCalled();
	expect(original).not.toHaveBeenCalled();
});
