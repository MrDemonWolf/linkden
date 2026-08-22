import { describe, expect, it } from "vitest";
import { OG_TEMPLATES } from "../../../../apps/web/src/lib/og-templates";
// Relative imports into sibling packages: these parity tests exist precisely
// because validators can't depend on ui/web at runtime.
import { bannerPresets } from "../../../ui/src/banner-presets";
import { themePresets } from "../../../ui/src/themes";
import { settingKeySchema, VALID_SETTING_KEYS } from "../settings";
import {
	BANNER_PRESET_IDS,
	getSettingMeta,
	isSecretKey,
	maskSecret,
	OG_TEMPLATE_IDS,
	SECRET_MASK,
	SECRET_SETTING_KEYS,
	SETTING_REGISTRY,
	shouldBackup,
	THEME_PRESET_NAMES,
	WALLET_SETTING_KEYS,
} from "../settings-registry";
import { PASS_TEMPLATE_PRESETS } from "../wallet";

/** Kinds whose sanitizer bounds the value without an explicit maxLength. */
const SELF_BOUNDED = new Set(["enum", "boolean", "color", "url"]);

/** Registry keys written by another router, not the settings router surface. */
const OWNED_ELSEWHERE = new Set(["vcard_data"]);

describe("settings registry", () => {
	it("covers every scalar setting key (no drift with VALID_SETTING_KEYS)", () => {
		for (const key of VALID_SETTING_KEYS) {
			expect(getSettingMeta(key), `missing registry entry for ${key}`).toBeDefined();
		}
	});

	it("every non-wallet registry key is a valid scalar setting key", () => {
		const scalar = new Set<string>(VALID_SETTING_KEYS);
		for (const [key, meta] of Object.entries(SETTING_REGISTRY)) {
			if (!meta.wallet && !OWNED_ELSEWHERE.has(key)) {
				expect(scalar.has(key), `${key} not in VALID_SETTING_KEYS`).toBe(true);
			}
		}
	});

	it("settingKeySchema rejects unknown keys", () => {
		expect(settingKeySchema.safeParse("theme_preset").success).toBe(true);
		expect(settingKeySchema.safeParse("vcard_data").success).toBe(false);
		expect(settingKeySchema.safeParse("").success).toBe(false);
	});

	it("every key is bounded: a self-bounding kind or an explicit maxLength", () => {
		for (const [key, meta] of Object.entries(SETTING_REGISTRY)) {
			const bounded = SELF_BOUNDED.has(meta.kind) || (meta.maxLength ?? 0) > 0;
			expect(bounded, `${key} (${meta.kind}) has no bound`).toBe(true);
		}
	});

	it("every *_enabled key and verified_badge is a boolean", () => {
		for (const [key, meta] of Object.entries(SETTING_REGISTRY)) {
			if (key.endsWith("_enabled") || key === "verified_badge") {
				expect(meta.kind, `${key} should be boolean`).toBe("boolean");
			}
		}
	});

	it("enum keys carry a non-empty value list", () => {
		for (const [key, meta] of Object.entries(SETTING_REGISTRY)) {
			if (meta.kind === "enum") expect(meta.values.length, key).toBeGreaterThan(0);
		}
		expect(getSettingMeta("theme_preset")?.kind).toBe("enum");
		expect(getSettingMeta("social_icon_shape")).toMatchObject({
			values: ["circle", "rounded-square"],
		});
		expect(getSettingMeta("default_color_mode")).toMatchObject({
			values: ["light", "dark", "system"],
		});
	});

	it("theme_preset values match themePresets names", () => {
		expect([...THEME_PRESET_NAMES]).toEqual(themePresets.map((t) => t.name));
	});

	it("banner preset values cover every bannerPresets id", () => {
		for (const p of bannerPresets) expect(BANNER_PRESET_IDS).toContain(p.id);
	});

	it("seo_og_template values match OG_TEMPLATES ids", () => {
		expect([...OG_TEMPLATE_IDS]).toEqual(OG_TEMPLATES.map((t) => t.id));
	});

	it("wallet_template_preset values match PASS_TEMPLATE_PRESETS", () => {
		expect(getSettingMeta("wallet_template_preset")).toMatchObject({
			values: [...PASS_TEMPLATE_PRESETS],
		});
	});

	it("declares exactly the known secrets", () => {
		expect([...SECRET_SETTING_KEYS].sort()).toEqual(
			[
				"captcha_secret_key",
				"email_api_key",
				"mapkit_token",
				"wallet_signer_cert",
				"wallet_signer_key",
				"wallet_wwdr_cert",
			].sort(),
		);
	});

	it("masks secrets and passes non-secrets through", () => {
		expect(maskSecret("email_api_key", "re_live_abc")).toBe(SECRET_MASK);
		expect(maskSecret("email_api_key", "")).toBe(""); // empty stays empty
		expect(maskSecret("profile_name", "Ada")).toBe("Ada");
		expect(isSecretKey("wallet_signer_key")).toBe(true);
	});

	it("never backs up secrets, backs up everything else", () => {
		expect(shouldBackup("email_api_key")).toBe(false);
		expect(shouldBackup("wallet_signer_cert")).toBe(false);
		expect(shouldBackup("profile_name")).toBe(true);
		expect(shouldBackup("wallet_logo_url")).toBe(true);
	});

	it("exposes the wallet config surface", () => {
		expect(WALLET_SETTING_KEYS).toContain("wallet_pass_enabled");
		expect(WALLET_SETTING_KEYS).toContain("wallet_signer_cert");
		expect(WALLET_SETTING_KEYS).not.toContain("profile_name");
	});
});
