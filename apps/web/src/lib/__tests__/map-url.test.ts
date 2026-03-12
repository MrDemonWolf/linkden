import { describe, it, expect } from "vitest";
import { getMapUrl } from "../map-url";

describe("getMapUrl", () => {
	describe("Google Maps", () => {
		it("generates URL from address", () => {
			const url = getMapUrl("google", "San Francisco, CA");
			expect(url).toBe(
				"https://www.google.com/maps/search/?api=1&query=San%20Francisco%2C%20CA",
			);
		});

		it("generates URL from coordinates when provided", () => {
			const url = getMapUrl("google", "San Francisco, CA", {
				lat: 37.7749,
				lng: -122.4194,
			});
			expect(url).toBe(
				"https://www.google.com/maps/search/?api=1&query=37.7749,-122.4194",
			);
		});

		it("encodes special characters in address", () => {
			const url = getMapUrl("google", "123 Main St & Elm Ave");
			expect(url).toContain("123%20Main%20St%20%26%20Elm%20Ave");
		});
	});

	describe("Apple Maps", () => {
		it("generates URL from address", () => {
			const url = getMapUrl("apple", "New York, NY");
			expect(url).toBe("https://maps.apple.com/?q=New%20York%2C%20NY");
		});

		it("generates URL with coordinates", () => {
			const url = getMapUrl("apple", "New York, NY", {
				lat: 40.7128,
				lng: -74.006,
			});
			expect(url).toBe(
				"https://maps.apple.com/?q=New%20York%2C%20NY&ll=40.7128,-74.006",
			);
		});
	});

	describe("Custom", () => {
		it("returns custom URL", () => {
			const url = getMapUrl(
				"custom",
				"",
				undefined,
				"https://my-map.com/location/123",
			);
			expect(url).toBe("https://my-map.com/location/123");
		});

		it("returns null when no custom URL provided", () => {
			const url = getMapUrl("custom", "Some Address");
			expect(url).toBeNull();
		});
	});

	describe("None", () => {
		it("returns null", () => {
			const url = getMapUrl("none", "San Francisco, CA");
			expect(url).toBeNull();
		});
	});

	describe("Edge cases", () => {
		it("returns null for empty address with non-custom type", () => {
			const url = getMapUrl("google", "");
			expect(url).toBeNull();
		});

		it("returns null for unknown link type", () => {
			const url = getMapUrl("unknown", "San Francisco");
			expect(url).toBeNull();
		});
	});
});
