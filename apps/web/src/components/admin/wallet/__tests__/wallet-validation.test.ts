import { describe, expect, it } from "vitest";
import {
	locationErrors,
	PASS_FIELD_LABEL_MAX,
	PASS_FIELD_VALUE_MAX,
	parseStoredFields,
	type WalletFieldsState,
	walletFieldsError,
} from "../wallet-validation";

const empty: WalletFieldsState = {
	headerFields: [],
	primaryFields: [],
	secondaryFields: [],
	auxiliaryFields: [],
	backFields: [],
	locations: [],
};

describe("parseStoredFields", () => {
	it("returns [] for stored JSON that isn't an array (corrupt backup)", () => {
		for (const raw of ["{}", "null", '"text"', "42", "not json", undefined]) {
			expect(parseStoredFields(raw, 20, "back")).toEqual([]);
		}
	});

	it("drops malformed rows, caps the count and fills a blank key", () => {
		const raw = JSON.stringify([
			{ key: "", label: "About", value: "Hi" },
			{ label: "no key" },
			{ key: "b", label: "B", value: "x" },
			{ key: "c", label: "C", value: "y" },
		]);
		expect(parseStoredFields(raw, 2, "back")).toEqual([
			{ key: "back1", label: "About", value: "Hi" },
			{ key: "b", label: "B", value: "x" },
		]);
	});
});

describe("walletFieldsError", () => {
	it("is null for a valid config", () => {
		expect(
			walletFieldsError({
				...empty,
				backFields: [{ key: "about", label: "About", value: "x".repeat(PASS_FIELD_VALUE_MAX) }],
				locations: [{ latitude: 37.7, longitude: -122.4, relevantText: "" }],
			}),
		).toBeNull();
	});

	it("names the zone and row of an over-long value or label", () => {
		expect(
			walletFieldsError({
				...empty,
				backFields: [
					{ key: "a", label: "A", value: "ok" },
					{ key: "b", label: "B", value: "x".repeat(PASS_FIELD_VALUE_MAX + 1) },
				],
			}),
		).toBe(`Back of pass field 2: value is longer than ${PASS_FIELD_VALUE_MAX} characters`);
		expect(
			walletFieldsError({
				...empty,
				headerFields: [{ key: "a", label: "L".repeat(PASS_FIELD_LABEL_MAX + 1), value: "" }],
			}),
		).toBe(`Header field 1: label is longer than ${PASS_FIELD_LABEL_MAX} characters`);
	});

	it("names an out-of-range or blank location", () => {
		expect(
			walletFieldsError({
				...empty,
				locations: [{ latitude: 10, longitude: 200, relevantText: "" }],
			}),
		).toBe("Location 1: enter a longitude from -180 to 180");
		expect(
			walletFieldsError({
				...empty,
				locations: [{ latitude: Number.NaN, longitude: 0, relevantText: "" }],
			}),
		).toBe("Location 1: enter a latitude from -90 to 90");
	});
});

describe("locationErrors", () => {
	it("flags each bad coordinate separately", () => {
		expect(locationErrors({ latitude: 91, longitude: -181, relevantText: "" })).toEqual({
			latitude: "Enter a latitude from -90 to 90",
			longitude: "Enter a longitude from -180 to 180",
		});
		expect(locationErrors({ latitude: 0, longitude: 0, relevantText: "" })).toEqual({});
	});
});
