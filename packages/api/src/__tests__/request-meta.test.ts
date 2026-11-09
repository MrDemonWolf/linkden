import { describe, expect, it } from "vitest";
import { requestMeta } from "../utils/request-meta";

describe("requestMeta", () => {
	it("derives IP/country from trusted request headers only", () => {
		const h = new Headers({
			"cf-connecting-ip": "203.0.113.9",
			"cf-ipcountry": "US",
			"user-agent": "Mozilla/5.0 (X) Chrome/120.0.0.0 Safari/537.36",
			referer: "https://ref.example.com/page",
		});
		// The UA and the Referer header are not collected at all.
		expect(requestMeta(h)).toEqual({ ip: "203.0.113.9", country: "US" });
	});

	it("returns empty IP / null country when the edge headers are absent", () => {
		expect(requestMeta(new Headers())).toEqual({ ip: "", country: null });
	});

	it("normalizes unknown/Tor country codes to null", () => {
		expect(requestMeta(new Headers({ "cf-ipcountry": "XX" })).country).toBeNull();
		expect(requestMeta(new Headers({ "cf-ipcountry": "T1" })).country).toBeNull();
	});
});
