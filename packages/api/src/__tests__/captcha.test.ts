import { describe, expect, it, vi } from "vitest";
import { verifyCaptcha } from "../utils/captcha";

function fakeFetch(
	data: unknown,
	{ ok = true }: { ok?: boolean } = {},
): { fn: typeof fetch; calls: { url: string; body: string }[] } {
	const calls: { url: string; body: string }[] = [];
	const fn = (async (url: string | URL, init?: RequestInit) => {
		calls.push({ url: String(url), body: String(init?.body ?? "") });
		return { ok, json: async () => data } as unknown as Response;
	}) as unknown as typeof fetch;
	return { fn, calls };
}

const base = {
	provider: "turnstile",
	secret: "sekret",
	token: "tok",
	expectedHostname: "example.com",
};

describe("verifyCaptcha", () => {
	it("passes on success with matching hostname/action", async () => {
		const { fn } = fakeFetch({ success: true, hostname: "example.com", action: "contact" });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).resolves.toBeUndefined();
	});

	it("rejects an unknown provider (fail closed, misconfigured)", async () => {
		const { fn } = fakeFetch({ success: true });
		await expect(verifyCaptcha({ ...base, provider: "hunter2", fetchImpl: fn })).rejects.toThrow();
	});

	it("rejects a missing token", async () => {
		const { fn } = fakeFetch({ success: true });
		await expect(verifyCaptcha({ ...base, token: undefined, fetchImpl: fn })).rejects.toThrow();
	});

	it("rejects when the provider returns success:false", async () => {
		const { fn } = fakeFetch({ success: false, "error-codes": ["invalid-input-response"] });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("rejects a hostname mismatch", async () => {
		const { fn } = fakeFetch({ success: true, hostname: "evil.example.net" });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("rejects an action mismatch", async () => {
		const { fn } = fakeFetch({ success: true, action: "login" });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("fails closed on a non-2xx verify response", async () => {
		const { fn } = fakeFetch({ success: true }, { ok: false });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("fails closed when the verify request throws (timeout/outage)", async () => {
		const fn = vi.fn(async () => {
			throw new Error("timeout");
		}) as unknown as typeof fetch;
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("forwards remoteip to the provider", async () => {
		const { fn, calls } = fakeFetch({ success: true });
		await verifyCaptcha({ ...base, remoteip: "203.0.113.7", fetchImpl: fn });
		expect(calls[0]?.body).toContain("remoteip=203.0.113.7");
	});
});
