import { describe, expect, it, vi } from "vitest";

// dev-login.ts imports better-auth runtime helpers only to build the plugin;
// isDevLoginEnabled itself is pure. Stub the imports so the module loads
// without pulling the full better-auth runtime into the test.
vi.mock("better-auth/api", () => ({
	createAuthEndpoint: () => ({}),
	APIError: class extends Error {},
}));
vi.mock("better-auth/cookies", () => ({ setSessionCookie: vi.fn() }));

import { isDevLoginEnabled } from "../dev-login";

describe("isDevLoginEnabled", () => {
	it('is true only for the exact string "true"', () => {
		expect(isDevLoginEnabled("true")).toBe(true);
	});

	it.each([
		undefined,
		"",
		"false",
		"1",
		"TRUE",
		"True",
		"yes",
		"0",
	])("is false for %j (default-deny)", (value) => {
		expect(isDevLoginEnabled(value as string | undefined)).toBe(false);
	});
});
