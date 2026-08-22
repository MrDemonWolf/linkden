import { describe, expect, it, vi } from "vitest";

// routers/settings.ts pulls in the D1 client at import time; sanitizeSetting
// itself is pure, so stub the database out.
vi.mock("@linkden/db", () => ({ db: {} }));

const { sanitizeSetting } = await import("../routers/settings");

describe("sanitizeSetting", () => {
	it("rejects unknown keys", () => {
		expect(() => sanitizeSetting("not_a_key", "x")).toThrow(/Unknown setting/);
	});

	it("enum: accepts listed values and empty, rejects anything else", () => {
		expect(sanitizeSetting("theme_preset", "ocean-blue")).toBe("ocean-blue");
		expect(sanitizeSetting("theme_preset", "")).toBe("");
		expect(() => sanitizeSetting("theme_preset", "neon")).toThrow(/Invalid value for theme_preset/);
		expect(() => sanitizeSetting("social_icon_shape", "hexagon")).toThrow();
		expect(() => sanitizeSetting("default_color_mode", "auto")).toThrow();
		expect(() => sanitizeSetting("captcha_provider", "friendly")).toThrow();
		expect(() => sanitizeSetting("contact_delivery", "webhook")).toThrow();
		expect(sanitizeSetting("seo_og_template", "bold")).toBe("bold");
	});

	it("boolean: only the literal strings true/false", () => {
		expect(sanitizeSetting("banner_enabled", "true")).toBe("true");
		expect(sanitizeSetting("verified_badge", "false")).toBe("false");
		for (const v of ["1", "yes", "TRUE", ""]) {
			expect(() => sanitizeSetting("banner_enabled", v), v).toThrow();
		}
	});

	it("text: strips HTML and clamps to maxLength", () => {
		expect(sanitizeSetting("profile_name", "<b>Ada</b>")).toBe("Ada");
		expect(sanitizeSetting("profile_name", "x".repeat(80))).toHaveLength(50);
		expect(sanitizeSetting("consent_banner_text", "x".repeat(600))).toHaveLength(500);
	});

	it("url/color: empty allowed, malformed rejected", () => {
		expect(sanitizeSetting("avatar_url", "")).toBe("");
		expect(sanitizeSetting("avatar_url", "https://a.b/c.png")).toBe("https://a.b/c.png");
		expect(() => sanitizeSetting("avatar_url", "javascript:alert(1)")).toThrow(/Invalid URL/);
		expect(() => sanitizeSetting("avatar_url", `https://a.b/${"x".repeat(2048)}`)).toThrow();
		expect(sanitizeSetting("custom_primary", "#0FACED")).toBe("#0FACED");
		expect(() => sanitizeSetting("custom_primary", "red")).toThrow(/#RRGGBB/);
	});

	it("bounded opaque/css values reject overflow instead of clamping", () => {
		expect(() => sanitizeSetting("custom_css", "a".repeat(20_001))).toThrow(/exceeds/);
		expect(() => sanitizeSetting("wallet_team_id", "A".repeat(21))).toThrow(/exceeds/);
		expect(sanitizeSetting("wallet_team_id", "ABCDE12345")).toBe("ABCDE12345");
	});

	it("apiKey: strips control characters and clamps", () => {
		expect(sanitizeSetting("email_api_key", "re_\x00live\x1f")).toBe("re_live");
		expect(sanitizeSetting("mapkit_token", "t".repeat(600))).toHaveLength(512);
	});

	it("throws a BAD_REQUEST TRPCError", () => {
		try {
			sanitizeSetting("theme_preset", "nope");
			expect.unreachable();
		} catch (e) {
			expect((e as { code?: string }).code).toBe("BAD_REQUEST");
		}
	});
});
