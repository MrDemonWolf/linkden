import { describe, expect, it } from "vitest";
import { requestMeta } from "../utils/request-meta";

describe("requestMeta", () => {
	it("derives IP/country/UA/referrer from trusted request headers", () => {
		const h = new Headers({
			"cf-connecting-ip": "203.0.113.9",
			"cf-ipcountry": "US",
			"user-agent": "Mozilla/5.0 (X) Chrome/120.0.0.0 Safari/537.36",
			referer: "https://ref.example.com/page",
		});
		const meta = requestMeta(h);
		expect(meta.ip).toBe("203.0.113.9");
		expect(meta.country).toBe("US");
		expect(meta.userAgent).toBe("Chrome/120"); // minimized
		expect(meta.referrer).toBe("https://ref.example.com/page");
	});

	it("ignores client-spoofable body fields (only headers are read)", () => {
		// requestMeta takes only Headers — there is no path for client JSON to set
		// country/UA. A forged cf-ipcountry cannot come from the browser; CF strips it.
		const meta = requestMeta(new Headers({ "cf-connecting-ip": "198.51.100.1" }));
		expect(meta.country).toBeNull();
		expect(meta.userAgent).toBeNull();
		expect(meta.referrer).toBeNull();
	});

	it("normalizes unknown/Tor country codes to null", () => {
		expect(requestMeta(new Headers({ "cf-ipcountry": "XX" })).country).toBeNull();
		expect(requestMeta(new Headers({ "cf-ipcountry": "T1" })).country).toBeNull();
	});

	it("caps an overlong referrer", () => {
		const long = `https://x.example/${"a".repeat(5000)}`;
		expect(requestMeta(new Headers({ referer: long })).referrer?.length).toBe(2048);
	});
});
