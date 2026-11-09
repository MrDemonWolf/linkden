import type { MiddlewareHandler } from "hono";

/** Count received bytes; Content-Length may only reject early, never bypass the cap. */
export async function bodyWithinLimit(
	c: { req: { raw: Request } },
	maxSize: number,
): Promise<boolean> {
	const raw = c.req.raw;
	if (Number(raw.headers.get("content-length")) > maxSize) {
		void raw.body?.cancel().catch(() => {});
		return false;
	}
	if (!raw.body) return true;
	const reader = raw.body.getReader();
	let body = new Uint8Array(0);
	let size = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxSize) {
				// A slow cancellation acknowledgement must not delay rejection.
				void reader.cancel().catch(() => {});
				return false;
			}
			if (size > body.byteLength) {
				const grown = new Uint8Array(Math.min(maxSize, Math.max(size, body.byteLength * 2)));
				grown.set(body);
				body = grown;
			}
			body.set(value, size - value.byteLength);
		}
	} finally {
		reader.releaseLock();
	}
	c.req.raw = new Request(raw, {
		body: body.subarray(0, size),
	});
	return true;
}

export const countedBodyLimit =
	(maxSize: number): MiddlewareHandler =>
	async (c, next) => {
		if (!(await bodyWithinLimit(c, maxSize))) return c.text("Payload Too Large", 413);
		await next();
	};
