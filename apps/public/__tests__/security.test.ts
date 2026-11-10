// @vitest-environment node
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { createStaticSecurityFiles, RETIRED_PUBLIC_SERVICE_WORKER } from "../security";

const html =
	'<html><script>document.documentElement.dataset.ldMode="dark"</script><script id="public-profile-data" type="application/json">{"text":"not executable"}</script><script type="module" src="/assets/profile-abc.js"></script></html>';

function headers(options: Partial<Parameters<typeof createStaticSecurityFiles>[0]> = {}) {
	return createStaticSecurityFiles({ html, ...options }).get("_headers")!;
}

describe("static response security", () => {
	it("authorizes the exact executable inline bytes without authorizing payload JSON or arbitrary inline JS", () => {
		const policy = headers();
		const digest = createHash("sha256")
			.update('document.documentElement.dataset.ldMode="dark"')
			.digest("base64");
		expect(policy).toContain(`script-src 'self' 'sha256-${digest}'`);
		expect(policy.match(/sha256-/g)).toHaveLength(1);
		expect(policy).not.toMatch(/script-src[^;]*unsafe-inline|unsafe-eval/);
		expect(policy).toContain("script-src-attr 'none'");
		expect(policy).toContain("style-src 'self' 'unsafe-inline'");
		expect(policy).toContain("connect-src 'self';");
		expect(policy).toContain("frame-ancestors 'none'");
		expect(policy).toContain(
			"Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()",
		);
	});

	it("allows only the deliberate contact action and selected CAPTCHA", () => {
		const policy = headers({
			contactAction: "https://actions.example.test/api/contact",
			captchaProvider: "turnstile",
		});
		expect(policy).toContain(
			"connect-src 'self' https://actions.example.test/api/contact https://challenges.cloudflare.com;",
		);
		expect(policy).not.toContain("https://www.google.com");
		expect(policy).not.toContain("hcaptcha.com");
		expect(policy).not.toMatch(/connect-src[^;]*\shttps:(?:\s|;)/);
		expect(() =>
			headers({
				contactAction: "https://actions.example.test/api/auth",
				captchaProvider: "turnstile",
			}),
		).toThrow(/Contact action/);
		for (const captchaProvider of ["none", "constructor", "__proto__", ""]) {
			expect(() =>
				headers({ contactAction: "https://actions.example.test/api/contact", captchaProvider }),
			).toThrow(/CAPTCHA/);
		}
	});

	it.each(["recaptcha", "hcaptcha"])("retains supported %s widget sources", (captchaProvider) => {
		const policy = headers({
			contactAction: "https://actions.example.test/api/contact",
			captchaProvider,
		});
		expect(policy).toContain(
			captchaProvider === "recaptcha"
				? "https://www.gstatic.com/recaptcha/"
				: "https://*.hcaptcha.com",
		);
	});

	it("preserves declared external images and local media without opening arbitrary connections", () => {
		const policy = headers({
			imageOrigins: [
				"https://images.example.test",
				"http://legacy.example.test",
				"http://127.0.0.1:3004",
				"https://images.example.test",
			],
		});
		expect(policy).toContain(
			"img-src 'self' data: blob: http://127.0.0.1:3004 http://legacy.example.test https://images.example.test;",
		);
		expect(policy).toContain("font-src 'self' data:");
		expect(policy).not.toContain("img-src 'self' data: blob: https:");
		expect(headers({ customCss: ".hero{background:url(https://owner.example/bg.jpg)}" })).toContain(
			"img-src 'self' data: blob: https:;",
		);
	});

	it("rejects header injection, image paths, unsafe sources and overlong Cloudflare rules", () => {
		for (const source of [
			"https://images.example.test\nX-Injected: true",
			"https://images.example.test/picture.png",
			"https://me:password@images.example.test",
			"data:image/png;base64,a",
			"https://images.example.test;script-src *",
		]) {
			expect(() => headers({ imageOrigins: [source] })).toThrow();
		}
		expect(() =>
			headers({
				imageOrigins: Array.from({ length: 100 }, (_, i) => `https://image-${i}.example.test`),
			}),
		).toThrow(/line limit/);
	});

	it("serves a revalidation-free retirement script at the former root URL", () => {
		const files = createStaticSecurityFiles({ html });
		expect(files.get("sw.js")).toBe(RETIRED_PUBLIC_SERVICE_WORKER);
		expect(files.get("_headers")).toContain(
			"/sw.js\n  Cache-Control: no-store\n  Service-Worker-Allowed: /",
		);
	});
});

describe("legacy public worker replacement", () => {
	it("skips waiting, deletes only LinkDen caches, disables preload and unregisters without a fetch handler", async () => {
		const handlers = new Map<
			string,
			(event: { waitUntil: (promise: Promise<unknown>) => void }) => void
		>();
		const cacheDelete = vi.fn(async () => true);
		const skipWaiting = vi.fn(async () => {});
		const claim = vi.fn(async () => {});
		const disable = vi.fn(async () => {});
		const unregister = vi.fn(async () => true);
		runInNewContext(RETIRED_PUBLIC_SERVICE_WORKER, {
			caches: {
				keys: async () => ["linkden-v4-0.5.0", "linkden-v2", "unrelated"],
				delete: cacheDelete,
			},
			self: {
				addEventListener: (
					type: string,
					handler: (event: { waitUntil: (promise: Promise<unknown>) => void }) => void,
				) => handlers.set(type, handler),
				skipWaiting,
				clients: { claim },
				registration: { navigationPreload: { disable }, unregister },
			},
		});
		for (const type of ["install", "activate"]) {
			let task: Promise<unknown> | undefined;
			handlers.get(type)?.({
				waitUntil: (promise) => {
					task = promise;
				},
			});
			await task;
		}
		expect([...handlers.keys()]).toEqual(["install", "activate"]);
		expect(skipWaiting).toHaveBeenCalledOnce();
		expect(cacheDelete.mock.calls).toEqual([["linkden-v4-0.5.0"], ["linkden-v2"]]);
		expect(disable).toHaveBeenCalledOnce();
		expect(claim).toHaveBeenCalledOnce();
		expect(unregister).toHaveBeenCalledOnce();
	});
});
