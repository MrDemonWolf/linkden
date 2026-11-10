// @vitest-environment node
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { bodyWithinLimit, countedBodyLimit } from "../lib/body-limit";

const encode = (value: string) => new TextEncoder().encode(value);

describe("counted request body limit", () => {
	it("counts UTF-8 bytes and preserves a bounded request for the real parser", async () => {
		const app = new Hono().post("/", countedBodyLimit(4), async (c) => {
			c.header("x-original", c.req.header("x-original") ?? "");
			return c.text(await c.req.text());
		});
		const response = await app.request("http://local/", {
			method: "POST",
			body: "éé",
			headers: { "content-length": "1", "x-original": "kept" },
		});
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("éé");
		expect(response.headers.get("x-original")).toBe("kept");
	});

	it("preserves a body fragmented into one-byte and empty chunks", async () => {
		const payload = "fragmented é payload\n".repeat(256);
		const bytes = encode(payload);
		let offset = 0;
		let empty = true;
		const stream = new ReadableStream<Uint8Array>({
			pull(controller) {
				if (offset === bytes.byteLength) {
					controller.close();
				} else if (empty) {
					controller.enqueue(new Uint8Array(0));
					empty = false;
				} else {
					controller.enqueue(bytes.subarray(offset, ++offset));
					empty = true;
				}
			},
		});
		const context = {
			req: {
				raw: new Request("http://local/", {
					method: "POST",
					body: stream,
					duplex: "half",
				} as RequestInit),
			},
		};
		expect(await bodyWithinLimit(context, bytes.byteLength)).toBe(true);
		expect(await context.req.raw.text()).toBe(payload);
		expect(stream.locked).toBe(false);
	});

	it("rejects chunked overflow and cancels without waiting for a slow acknowledgement", async () => {
		const cancelled = vi.fn(() => new Promise<void>(() => {}));
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(encode("aa"));
				controller.enqueue(encode("bbb"));
			},
			cancel: cancelled,
		});
		const context = {
			req: {
				raw: new Request("http://local/", {
					method: "POST",
					headers: { "transfer-encoding": "chunked", "content-length": "1" },
					body: stream,
					duplex: "half",
				} as RequestInit),
			},
		};
		expect(await bodyWithinLimit(context, 4)).toBe(false);
		expect(cancelled).toHaveBeenCalledTimes(1);
		expect(stream.locked).toBe(false);
	});

	it("rejects oversized declared bodies early and cancels their stream", async () => {
		const cancelled = vi.fn();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(encode("a"));
			},
			cancel: cancelled,
		});
		const context = {
			req: {
				raw: new Request("http://local/", {
					method: "POST",
					headers: { "content-length": "5" },
					body: stream,
					duplex: "half",
				} as RequestInit),
			},
		};
		expect(await bodyWithinLimit(context, 4)).toBe(false);
		expect(cancelled).toHaveBeenCalledTimes(1);
	});

	it("keeps empty requests usable and releases a failed reader", async () => {
		const empty = { req: { raw: new Request("http://local/") } };
		expect(await bodyWithinLimit(empty, 4)).toBe(true);
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.error(new Error("Read failed"));
			},
		});
		const failed = {
			req: {
				raw: new Request("http://local/", {
					method: "POST",
					body: stream,
					duplex: "half",
				} as RequestInit),
			},
		};
		await expect(bodyWithinLimit(failed, 4)).rejects.toThrow("Read failed");
		expect(stream.locked).toBe(false);
	});
});
