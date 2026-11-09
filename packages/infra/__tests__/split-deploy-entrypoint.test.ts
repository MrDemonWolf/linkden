// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { events, alchemy, resource } = vi.hoisted(() => {
	const events: string[] = [];
	const alchemy = Object.assign(
		vi.fn(async () => {
			events.push("alchemy");
			return {
				finalize: vi.fn(async () => {
					events.push("finalize");
				}),
			};
		}),
		{
			env: {
				BETTER_AUTH_URL: "https://admin.example.com",
				CORS_ORIGIN: "https://admin.example.com",
				NEXT_PUBLIC_SERVER_URL: "https://admin.example.com",
			},
			secret: Object.assign(vi.fn(), { env: { BETTER_AUTH_SECRET: "private-test-secret" } }),
		},
	);
	const resource = vi.fn(async (_name: string, _properties: Record<string, unknown>) => {
		events.push("resource");
		return { url: "https://admin.example.com" };
	});
	return { events, alchemy, resource };
});

vi.mock("alchemy", () => ({ default: alchemy }));
vi.mock("alchemy/cloudflare", () => ({
	D1Database: resource,
	R2Bucket: resource,
	Worker: resource,
	Nextjs: resource,
	RateLimit: vi.fn(() => ({})),
}));
vi.mock("alchemy/state", () => ({ CloudflareStateStore: vi.fn() }));
vi.mock("dotenv", () => ({ config: vi.fn() }));

const closed = () =>
	Response.json({ success: true, errors: [], result: { enabled: false, previews_enabled: false } });
const open = () =>
	Response.json({ success: true, errors: [], result: { enabled: false, previews_enabled: true } });

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	events.length = 0;
	for (const [key, value] of Object.entries({
		LINKDEN_SERVING_MODE: "split",
		ALCHEMY_STAGE: "prod",
		SITE_DOMAIN: "",
		ADMIN_SITE_URL: "https://admin.example.com",
		PUBLIC_SITE_URL: "https://links.example.com",
		PUBLIC_CONTACT_URL: "",
		BETTER_AUTH_SECRET: "x".repeat(44),
		BETTER_AUTH_URL: "https://admin.example.com",
		CORS_ORIGIN: "https://admin.example.com",
		NEXT_PUBLIC_SERVER_URL: "https://admin.example.com",
		NEXT_PUBLIC_SITE_URL: "https://links.example.com",
		PUBLICATION_ENABLED: "false",
		PUBLICATION_SCHEDULER_ENABLED: "false",
		CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
		CLOUDFLARE_API_TOKEN: "private-test-token",
	}))
		vi.stubEnv(key, value);
	vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("split deployment entrypoint", () => {
	it("reads both alias states before Alchemy and again after finalization", async () => {
		const read = vi.fn(async () => {
			events.push("read");
			return closed();
		});
		vi.stubGlobal("fetch", read);
		await import("../alchemy.run.ts");
		expect(events.slice(0, 3)).toEqual(["read", "read", "alchemy"]);
		expect(events.slice(-3)).toEqual(["finalize", "read", "read"]);
		expect(read).toHaveBeenCalledTimes(4);
		expect(resource).toHaveBeenCalled();
		for (const name of ["server", "linkden"])
			expect(resource.mock.calls.find(([id]) => id === name)?.[1]).toMatchObject({
				observability: { logs: { invocationLogs: false } },
			});
		expect(resource.mock.calls.find(([name]) => name === "server")?.[1]).toMatchObject({
			url: false,
			routes: [],
			bindings: { LINKDEN_SERVING_MODE: "split" },
		});
	});

	it("routes only explicitly enabled public contact traffic without opening Worker aliases", async () => {
		vi.stubEnv("PUBLIC_CONTACT_URL", "https://api.example.com/api/contact");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => closed()),
		);
		await import("../alchemy.run.ts");
		expect(resource.mock.calls.find(([name]) => name === "server")?.[1]).toMatchObject({
			url: false,
			previewSubdomains: false,
			routes: [{ pattern: "api.example.com/api/contact", adopt: false }],
			bindings: {
				LINKDEN_SERVING_MODE: "split",
				PUBLIC_CONTACT_URL: "https://api.example.com/api/contact",
			},
		});
	});

	it("rejects a wildcard contact route before cloud reads, state or resource mutation", async () => {
		vi.stubEnv("PUBLIC_CONTACT_URL", "https://links.example.com/api/*");
		const read = vi.fn();
		vi.stubGlobal("fetch", read);
		await expect(import("../alchemy.run.ts")).rejects.toThrow("PUBLIC_CONTACT_URL");
		expect(read).not.toHaveBeenCalled();
		expect(alchemy).not.toHaveBeenCalled();
		expect(resource).not.toHaveBeenCalled();
	});

	it("blocks open aliases before initializing state or resources", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => open()),
		);
		await expect(import("../alchemy.run.ts")).rejects.toThrow("aliases remain open");
		expect(alchemy).not.toHaveBeenCalled();
		expect(resource).not.toHaveBeenCalled();
		expect(console.log).not.toHaveBeenCalled();
	});

	it("fails deployment rather than reporting success when post-apply closure is unverified", async () => {
		let calls = 0;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				events.push("read");
				return ++calls <= 2 ? closed() : new Response(null, { status: 404 });
			}),
		);
		await expect(import("../alchemy.run.ts")).rejects.toThrow("could not be verified after apply");
		expect(events.slice(-3)).toEqual(["finalize", "read", "read"]);
		expect(console.log).not.toHaveBeenCalled();
	});

	it("leaves legacy deployments free of the new cloud reads", async () => {
		vi.stubEnv("LINKDEN_SERVING_MODE", "legacy");
		vi.stubEnv("SITE_DOMAIN", "links.example.com");
		vi.stubEnv("BETTER_AUTH_URL", "https://links.example.com");
		vi.stubEnv("CORS_ORIGIN", "https://links.example.com");
		vi.stubEnv("NEXT_PUBLIC_SERVER_URL", "https://links.example.com");
		const read = vi.fn();
		vi.stubGlobal("fetch", read);
		await import("../alchemy.run.ts");
		expect(read).not.toHaveBeenCalled();
		expect(alchemy).toHaveBeenCalledOnce();
		expect(events.at(-1)).toBe("finalize");
	});
});
