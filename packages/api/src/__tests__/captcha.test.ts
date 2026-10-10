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

const turnstileOk = { success: true, hostname: "example.com", action: "contact" };

describe("verifyCaptcha", () => {
	it("passes on success with matching hostname/action", async () => {
		const { fn } = fakeFetch(turnstileOk);
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).resolves.toBeUndefined();
	});

	it("rejects an unknown provider (fail closed, misconfigured)", async () => {
		const { fn } = fakeFetch(turnstileOk);
		await expect(verifyCaptcha({ ...base, provider: "hunter2", fetchImpl: fn })).rejects.toThrow(
			/misconfigured/,
		);
		await expect(
			verifyCaptcha({ ...base, provider: "constructor", fetchImpl: fn }),
		).rejects.toThrow(/misconfigured/);
	});

	it("rejects a missing secret as misconfigured without calling the provider", async () => {
		const { fn, calls } = fakeFetch(turnstileOk);
		await expect(verifyCaptcha({ ...base, secret: "", fetchImpl: fn })).rejects.toThrow(
			/misconfigured/,
		);
		expect(calls).toHaveLength(0);
	});

	it("rejects a missing token", async () => {
		const { fn } = fakeFetch(turnstileOk);
		await expect(verifyCaptcha({ ...base, token: undefined, fetchImpl: fn })).rejects.toThrow(
			/required/,
		);
	});

	it("rejects when the provider returns success:false", async () => {
		const { fn } = fakeFetch({ success: false, "error-codes": ["invalid-input-response"] });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("rejects a hostname mismatch", async () => {
		const { fn } = fakeFetch({ ...turnstileOk, hostname: "evil.example.net" });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("rejects a missing hostname when one is expected", async () => {
		const { fn } = fakeFetch({ success: true, action: "contact" });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("rejects an action mismatch", async () => {
		const { fn } = fakeFetch({ ...turnstileOk, action: "login" });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("rejects a Turnstile token minted without the contact action", async () => {
		const { fn } = fakeFetch({ success: true, hostname: "example.com", action: "" });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("reCAPTCHA v3: requires the contact action and a passing score", async () => {
		const v3 = { success: true, hostname: "example.com", action: "contact" };
		const call = (data: unknown) =>
			verifyCaptcha({ ...base, provider: "recaptcha", fetchImpl: fakeFetch(data).fn });
		await expect(call({ ...v3, score: 0.9 })).resolves.toBeUndefined();
		await expect(call({ ...v3, score: 0.1 })).rejects.toThrow();
		await expect(call({ ...v3, action: "", score: 0.9 })).rejects.toThrow();
	});

	it("reCAPTCHA v2 / hCaptcha: pass without an action or score", async () => {
		const plain = { success: true, hostname: "example.com" };
		for (const provider of ["recaptcha", "hcaptcha"]) {
			await expect(
				verifyCaptcha({ ...base, provider, fetchImpl: fakeFetch(plain).fn }),
			).resolves.toBeUndefined();
		}
	});

	it("fails closed on a non-2xx verify response", async () => {
		const { fn } = fakeFetch(turnstileOk, { ok: false });
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow(/unavailable/);
	});

	it("fails closed on a non-object verify body", async () => {
		const { fn } = fakeFetch(null);
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow(/unavailable/);
	});

	it("fails closed when the verify request throws (timeout/outage)", async () => {
		const fn = vi.fn(async () => {
			throw new Error("timeout");
		}) as unknown as typeof fetch;
		await expect(verifyCaptcha({ ...base, fetchImpl: fn })).rejects.toThrow();
	});

	it("forwards remoteip to the provider", async () => {
		const { fn, calls } = fakeFetch(turnstileOk);
		await verifyCaptcha({ ...base, remoteip: "203.0.113.7", fetchImpl: fn });
		expect(calls[0]?.body).toContain("remoteip=203.0.113.7");
	});
});
