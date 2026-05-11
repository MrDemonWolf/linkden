import { describe, expect, it } from "vitest";
import {
	PASS_FIELD_LIMITS,
	PASS_TEMPLATE_PRESETS,
	passFieldSchema,
	seedFromPreset,
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
	it.each(PASS_TEMPLATE_PRESETS)("returns a parseable seed for %s", (preset) => {
		const seed = seedFromPreset(preset);
		expect(seed.templatePreset).toBeDefined();
		expect(() =>
			walletConfigSchema.parse({
				templatePreset: seed.templatePreset,
				headerFields: seed.headerFields,
				primaryFields: seed.primaryFields,
				secondaryFields: seed.secondaryFields,
				auxiliaryFields: seed.auxiliaryFields,
				backFields: seed.backFields,
			}),
		).not.toThrow();
	});

	it("respects HIG field count limits", () => {
		for (const preset of PASS_TEMPLATE_PRESETS) {
			const seed = seedFromPreset(preset);
			expect(seed.headerFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.header);
			expect(seed.primaryFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.primary);
			expect(seed.secondaryFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.secondary);
			expect(seed.auxiliaryFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.auxiliary);
			expect(seed.backFields.length).toBeLessThanOrEqual(PASS_FIELD_LIMITS.back);
		}
	});

	it("falls back to contact-card for unknown preset", () => {
		const seed = seedFromPreset("unknown-preset" as Parameters<typeof seedFromPreset>[0]);
		expect(seed.templatePreset).toBe("contact-card");
	});
});
