import { describe, expect, it } from "vitest";
import { VALID_SETTING_KEYS } from "../settings";
import {
	getSettingMeta,
	isSecretKey,
	maskSecret,
	SECRET_MASK,
	SECRET_SETTING_KEYS,
	SETTING_REGISTRY,
	shouldBackup,
	WALLET_SETTING_KEYS,
} from "../settings-registry";

describe("settings registry", () => {
	it("covers every scalar setting key (no drift with VALID_SETTING_KEYS)", () => {
		for (const key of VALID_SETTING_KEYS) {
			expect(getSettingMeta(key), `missing registry entry for ${key}`).toBeDefined();
		}
	});

	it("every non-wallet registry key is a valid scalar setting key", () => {
		const scalar = new Set<string>(VALID_SETTING_KEYS);
		for (const [key, meta] of Object.entries(SETTING_REGISTRY)) {
			if (!meta.wallet) {
				expect(scalar.has(key), `${key} not in VALID_SETTING_KEYS`).toBe(true);
			}
		}
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
