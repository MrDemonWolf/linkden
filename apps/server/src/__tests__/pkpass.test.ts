import { describe, it, expect } from "vitest";
import { zipSync, unzipSync } from "fflate";
import { hexToRgb, buildPassJson, solidPng, type PkpassInput } from "../lib/pkpass";

const baseInput: PkpassInput = {
	passTypeIdentifier: "pass.com.example",
	teamIdentifier: "ABCDE12345",
	serialNumber: "sn-1",
	organizationName: "Acme",
	description: "Card",
	backgroundColor: "#091533",
	foregroundColor: "#FFFFFF",
	labelColor: "#0FACED",
	barcodeMessage: "https://example.com",
	headerFields: [],
	primaryFields: [{ key: "name", label: "Name", value: "Jane" }],
	secondaryFields: [{ key: "empty", label: "Empty", value: "  " }],
	auxiliaryFields: [],
	backFields: [],
	images: {},
};

describe("hexToRgb", () => {
	it("converts hex to a CSS rgb() triple (Apple pass.json format)", () => {
		expect(hexToRgb("#091533")).toBe("rgb(9, 21, 51)");
		expect(hexToRgb("FFFFFF")).toBe("rgb(255, 255, 255)");
	});
	it("passes non-hex through untouched", () => {
		expect(hexToRgb("rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
	});
});

describe("buildPassJson", () => {
	const pass = JSON.parse(buildPassJson(baseInput));

	it("uses rgb() colors and formatVersion 1", () => {
		expect(pass.formatVersion).toBe(1);
		expect(pass.backgroundColor).toBe("rgb(9, 21, 51)");
	});
	it("emits a QR barcode when a message is present", () => {
		expect(pass.barcodes[0].format).toBe("PKBarcodeFormatQR");
		expect(pass.barcodes[0].message).toBe("https://example.com");
	});
	it("drops empty-value fields so Wallet renders no blank rows", () => {
		expect(pass.generic.primaryFields).toHaveLength(1);
		expect(pass.generic.secondaryFields).toHaveLength(0);
	});
	it("omits the barcode when there is no message", () => {
		const p = JSON.parse(buildPassJson({ ...baseInput, barcodeMessage: null }));
		expect(p.barcodes).toBeUndefined();
	});
	it("includes relevantDate + locations when provided (context-aware)", () => {
		const p = JSON.parse(
			buildPassJson({
				...baseInput,
				relevantDate: "2026-07-20T00:00:00.000Z",
				locations: [{ latitude: 37.7749, longitude: -122.4194, relevantText: "Save my contact" }],
			}),
		);
		expect(p.relevantDate).toBe("2026-07-20T00:00:00.000Z");
		expect(p.locations[0].latitude).toBe(37.7749);
		expect(p.locations[0].relevantText).toBe("Save my contact");
	});
	it("omits relevance keys when absent", () => {
		expect(pass.relevantDate).toBeUndefined();
		expect(pass.locations).toBeUndefined();
	});
});

describe("solidPng", () => {
	it("produces a valid PNG (signature + non-empty body)", () => {
		const png = solidPng(29, [9, 21, 51]);
		expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(png.length).toBeGreaterThan(50);
	});
});

describe("bundle assembly (unsigned parts)", () => {
	it("zips pass.json + icon so the archive is a real pkpass shell", () => {
		// Mirror the file set generatePkpass builds, minus the forge signature.
		const enc = new TextEncoder();
		const files: Record<string, Uint8Array> = {
			"pass.json": enc.encode(buildPassJson(baseInput)),
			"icon.png": solidPng(87, [9, 21, 51]),
		};
		const zipped = zipSync(files);
		const back = unzipSync(zipped);
		expect(Object.keys(back)).toContain("pass.json");
		expect(Object.keys(back)).toContain("icon.png");
		expect(JSON.parse(new TextDecoder().decode(back["pass.json"])).formatVersion).toBe(1);
	});
});
