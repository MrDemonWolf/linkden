import { describe, expect, it } from "vitest";
import {
	isCertificateMaterial,
	isPrivateKeyMaterial,
	normalizeRelevantDate,
	normalizeSigningMaterial,
	PASS_FIELD_LIMITS,
	PASS_TEMPLATE_PRESETS,
	parsePassFieldsJson,
	parsePassLocationsJson,
	passFieldSchema,
	resolvePassContent,
	seedFromPreset,
	WALLET_DEFAULTS,
	walletConfigSchema,
} from "../wallet";

describe("passFieldSchema", () => {
	it("accepts a valid field", () => {
		const result = passFieldSchema.parse({
			key: "tier",
			label: "Tier",
			value: "Gold",
		});
		expect(result.key).toBe("tier");
	});

	it("rejects empty key", () => {
		expect(() => passFieldSchema.parse({ key: "", label: "L", value: "v" })).toThrow();
	});

	it("rejects key longer than 64 chars", () => {
		expect(() => passFieldSchema.parse({ key: "x".repeat(65), label: "L", value: "v" })).toThrow();
	});

	it("rejects label longer than 40 chars", () => {
		expect(() => passFieldSchema.parse({ key: "k", label: "L".repeat(41), value: "v" })).toThrow();
	});

	it("rejects value longer than 200 chars", () => {
		expect(() => passFieldSchema.parse({ key: "k", label: "L", value: "v".repeat(201) })).toThrow();
	});
});

describe("walletConfigSchema", () => {
	it("accepts a minimal config", () => {
		expect(() => walletConfigSchema.parse({})).not.toThrow();
	});

	it("accepts valid hex colors", () => {
		const result = walletConfigSchema.parse({
			backgroundColor: "#1a2b3c",
			foregroundColor: "#ffffff",
			labelColor: "#000000",
		});
		expect(result.backgroundColor).toBe("#1a2b3c");
	});

	it("rejects malformed hex colors", () => {
		expect(() => walletConfigSchema.parse({ backgroundColor: "1a2b3c" })).toThrow();
		expect(() => walletConfigSchema.parse({ backgroundColor: "#xyz" })).toThrow();
		expect(() => walletConfigSchema.parse({ backgroundColor: "#fff" })).toThrow();
	});

	it("accepts empty-string image urls", () => {
		const result = walletConfigSchema.parse({
			logoUrl: "",
			iconUrl: "",
			thumbnailUrl: "",
			stripUrl: "",
		});
		expect(result.logoUrl).toBe("");
	});

	it("rejects non-url image url", () => {
		expect(() => walletConfigSchema.parse({ logoUrl: "not-a-url" })).toThrow();
	});

	it("rejects too many header fields", () => {
		const fields = Array.from({ length: PASS_FIELD_LIMITS.header + 1 }, (_, i) => ({
			key: `k${i}`,
			label: "L",
			value: "v",
		}));
		expect(() => walletConfigSchema.parse({ headerFields: fields })).toThrow();
	});

	it("rejects too many primary fields", () => {
		const fields = Array.from({ length: PASS_FIELD_LIMITS.primary + 1 }, (_, i) => ({
			key: `k${i}`,
			label: "L",
			value: "v",
		}));
		expect(() => walletConfigSchema.parse({ primaryFields: fields })).toThrow();
	});

	it("rejects unknown template preset", () => {
		expect(() =>
			walletConfigSchema.parse({ templatePreset: "loyalty" as unknown as string }),
		).toThrow();
	});
});

describe("seedFromPreset", () => {
	it("every preset's seed satisfies walletConfigSchema and HIG field caps", () => {
		for (const preset of PASS_TEMPLATE_PRESETS) {
			const seed = seedFromPreset(preset);
			expect(seed.headerFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.header);
			expect(seed.primaryFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.primary);
			expect(seed.secondaryFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.secondary);
			expect(seed.auxiliaryFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.auxiliary);
			expect(seed.backFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.back);
			expect(() => walletConfigSchema.parse(seed)).not.toThrow();
		}
	});

	it("falls back to contact-card for unknown preset", () => {
		const seed = seedFromPreset("unknown-preset" as Parameters<typeof seedFromPreset>[0]);
		expect(seed.templatePreset).toBe("contact-card");
	});
});

describe("lenient stored-value readers", () => {
	it("parsePassLocationsJson drops infinite and out-of-range coordinates", () => {
		const raw = `[{"latitude":1e999,"longitude":0},{"latitude":500,"longitude":0},{"latitude":10,"longitude":-181},{"latitude":45.5,"longitude":-122.6,"relevantText":"Hi"}]`;
		expect(parsePassLocationsJson(raw)).toEqual([
			{ latitude: 45.5, longitude: -122.6, relevantText: "Hi" },
		]);
	});

	it("parsePassFieldsJson caps the field count when given a section limit", () => {
		const fields = Array.from({ length: 6 }, (_, i) => ({ key: `k${i}`, label: "L", value: "V" }));
		const raw = JSON.stringify(fields);
		expect(parsePassFieldsJson(raw)).toHaveLength(6);
		expect(parsePassFieldsJson(raw, PASS_FIELD_LIMITS.header)).toHaveLength(3);
	});
});

describe("walletConfigSchema.relevantDate", () => {
	it("accepts the builder's ISO output and blank, rejects free text", () => {
		expect(walletConfigSchema.safeParse({ relevantDate: "2026-10-07T18:00:00.000Z" }).success).toBe(
			true,
		);
		expect(
			walletConfigSchema.safeParse({ relevantDate: "2026-10-07T18:00:00+02:00" }).success,
		).toBe(true);
		expect(walletConfigSchema.safeParse({ relevantDate: "" }).success).toBe(true);
		expect(walletConfigSchema.safeParse({ relevantDate: "next friday" }).success).toBe(false);
	});
});

describe("signing material", () => {
	const certPem =
		"-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIUQ0FGRQ==\n-----END CERTIFICATE-----";
	const keyPem =
		"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----";
	const rsaKeyPem =
		"-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----";
	const derB64 = btoa(String.fromCharCode(0x30, 0x82, ...Array.from({ length: 80 }, () => 1)));

	it("unwraps the admin form's base64-of-PEM and keeps raw PEM / DER as is", () => {
		expect(normalizeSigningMaterial(btoa(keyPem))).toBe(keyPem);
		expect(normalizeSigningMaterial(btoa(certPem))).toBe(certPem);
		expect(normalizeSigningMaterial(`  ${certPem}\n`)).toBe(certPem);
		expect(normalizeSigningMaterial(`${derB64.slice(0, 20)}\n${derB64.slice(20)}`)).toBe(derB64);
		expect(normalizeSigningMaterial("")).toBe("");
	});

	it("accepts certificates as PEM or base64 DER only", () => {
		expect(isCertificateMaterial(certPem)).toBe(true);
		expect(isCertificateMaterial(derB64)).toBe(true);
		expect(isCertificateMaterial(btoa(certPem))).toBe(false); // must be normalized first
		expect(isCertificateMaterial(keyPem)).toBe(false);
		expect(isCertificateMaterial("not a cert")).toBe(false);
	});

	it("accepts RSA PEM private keys (PKCS#1, PKCS#8, encrypted), rejects EC and certs", () => {
		expect(isPrivateKeyMaterial(keyPem)).toBe(true);
		expect(isPrivateKeyMaterial(rsaKeyPem)).toBe(true);
		expect(
			isPrivateKeyMaterial(
				"-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFHz\n-----END ENCRYPTED PRIVATE KEY-----",
			),
		).toBe(true);
		expect(
			isPrivateKeyMaterial("-----BEGIN EC PRIVATE KEY-----\nMHcC\n-----END EC PRIVATE KEY-----"),
		).toBe(false);
		expect(isPrivateKeyMaterial(certPem)).toBe(false);
		expect(isPrivateKeyMaterial(btoa(keyPem))).toBe(false);
	});
});

describe("resolvePassContent (shared by the signed pass and the builder preview)", () => {
	const profile = { name: "Ada Lovelace", email: "ada@example.com" };

	it("falls back to the defaults and the profile's name/email", () => {
		const c = resolvePassContent({}, profile);
		expect(c).toMatchObject({
			backgroundColor: WALLET_DEFAULTS.backgroundColor,
			foregroundColor: WALLET_DEFAULTS.foregroundColor,
			labelColor: WALLET_DEFAULTS.labelColor,
			organizationName: WALLET_DEFAULTS.organizationName,
			description: "Ada Lovelace — contact card",
			showBarcode: true,
			headerFields: [],
			auxiliaryFields: [],
			backFields: [],
		});
		expect(c.primaryFields).toEqual([{ key: "name", label: "Name", value: "Ada Lovelace" }]);
		expect(c.secondaryFields).toEqual([{ key: "email", label: "Email", value: "ada@example.com" }]);
	});

	it("honours the show toggles and never adds an empty Name/Email field", () => {
		const off = resolvePassContent(
			{ wallet_show_name: "false", wallet_show_email: "false", wallet_show_qr_code: "false" },
			profile,
		);
		expect(off.primaryFields).toEqual([]);
		expect(off.secondaryFields).toEqual([]);
		expect(off.showBarcode).toBe(false);

		const anonymous = resolvePassContent({}, null);
		expect(anonymous.primaryFields).toEqual([]);
		expect(anonymous.secondaryFields).toEqual([]);
		expect(anonymous.description).toBe("Contact card");
	});

	it("prefers stored fields and settings, capping each section at its limit", () => {
		const many = JSON.stringify(
			Array.from({ length: 6 }, (_, i) => ({ key: `k${i}`, label: "L", value: `v${i}` })),
		);
		const c = resolvePassContent(
			{
				wallet_header_fields: many,
				wallet_primary_fields: many,
				wallet_secondary_fields: many,
				wallet_auxiliary_fields: many,
				wallet_back_fields: many,
				wallet_background_color: "#000000",
				wallet_foreground_color: "#111111",
				wallet_label_color: "#222222",
				wallet_organization_name: "Acme",
				wallet_pass_description: "Member card",
			},
			profile,
		);
		expect(c.headerFields).toHaveLength(PASS_FIELD_LIMITS.header);
		expect(c.primaryFields).toHaveLength(PASS_FIELD_LIMITS.primary);
		expect(c.primaryFields[0]?.key).toBe("k0");
		expect(c.secondaryFields).toHaveLength(PASS_FIELD_LIMITS.secondary);
		expect(c.auxiliaryFields).toHaveLength(PASS_FIELD_LIMITS.auxiliary);
		expect(c.backFields).toHaveLength(6);
		expect(c).toMatchObject({
			backgroundColor: "#000000",
			foregroundColor: "#111111",
			labelColor: "#222222",
			organizationName: "Acme",
			description: "Member card",
		});
	});
});

describe("normalizeRelevantDate", () => {
	it("normalizes parseable dates to UTC ISO and drops the rest", () => {
		expect(normalizeRelevantDate("2026-10-07T18:00:00+02:00")).toBe("2026-10-07T16:00:00.000Z");
		expect(normalizeRelevantDate("")).toBeNull();
		expect(normalizeRelevantDate(undefined)).toBeNull();
		expect(normalizeRelevantDate("next friday")).toBeNull();
	});
});
