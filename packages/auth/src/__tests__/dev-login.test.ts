import { describe, expect, it, vi } from "vitest";

// dev-login.ts imports better-auth runtime helpers only to build the plugin;
// isDevLoginEnabled itself is pure. Stub the imports so the module loads
// without pulling the full better-auth runtime into the test.
vi.mock("better-auth/api", () => ({
	createAuthEndpoint: () => ({}),
	formCsrfMiddleware: () => {},
	APIError: class extends Error {},
}));
vi.mock("better-auth/cookies", () => ({ setSessionCookie: vi.fn() }));

import { isDevLoginEnabled } from "../dev-login";
import { isLoopbackHostHeader } from "../local-url";

const LOCAL = "http://localhost:3000";

describe("isDevLoginEnabled", () => {
	it.each([LOCAL, "http://127.0.0.1:3000", "http://[::1]:3000", "http://localhost"])(
		'is true for the exact string "true" with a local http base URL (%s)',
		(baseURL) => {
			expect(isDevLoginEnabled("true", baseURL)).toBe(true);
		},
	);

	it.each([undefined, "", "false", "1", "TRUE", "True", "yes", "0"])(
		"is false for flag %j (default-deny)",
		(value) => {
			expect(isDevLoginEnabled(value as string | undefined, LOCAL)).toBe(false);
		},
	);

	// A second, independent condition: DEV_LOGIN=true alone (e.g. added as a
	// Worker variable in the dashboard) must not expose the bypass on a deploy.
	it.each([
		undefined,
		"",
		"https://links.example.com",
		"https://localhost:3000",
		"http://links.example.com",
		"https://abc.trycloudflare.com",
		"http://localhost.example.com",
		"not a url",
		"http://user:password@localhost:3000",
		"http://%6cocalhost:3000",
		"http://2130706433:3000",
		"http://0x7f000001:3000",
		"http://127.1:3000",
		"http://[::ffff:127.0.0.1]:3000",
		"http://localhost:3000?mode=dev",
		"http://localhost:3000#dev",
	])("is false for a non-local base URL %j even with the flag set", (baseURL) => {
		expect(isDevLoginEnabled("true", baseURL)).toBe(false);
	});

	it.each(["production", "staging", "test", ""])(
		"refuses an explicit non-development runtime %j",
		(nodeEnv) => {
			expect(isDevLoginEnabled("true", LOCAL, nodeEnv)).toBe(false);
		},
	);

	it("supports explicit development and Wrangler's unset NODE_ENV with the local opt-in", () => {
		expect(isDevLoginEnabled("true", LOCAL, "development")).toBe(true);
		expect(isDevLoginEnabled("true", LOCAL, undefined)).toBe(true);
		expect(isDevLoginEnabled(undefined, LOCAL, undefined)).toBe(false);
	});
});

describe("isLoopbackHostHeader", () => {
	it.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "localhost", "LOCALHOST:3000"])(
		"accepts %s",
		(host) => {
			expect(isLoopbackHostHeader(host)).toBe(true);
		},
	);

	it.each([null, "", "links.example.com", "localhost.evil.test", "127.0.0.2:3000"])(
		"rejects %j",
		(host) => {
			expect(isLoopbackHostHeader(host)).toBe(false);
		},
	);
});
