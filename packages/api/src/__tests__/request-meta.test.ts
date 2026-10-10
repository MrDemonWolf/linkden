import { describe, expect, it } from "vitest";
import { ownHostnames, referrerHost, requestMeta } from "../utils/request-meta";

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

describe("ownHostnames", () => {
	it("collects the request Host (port dropped) and the configured site origin", () => {
		const h = new Headers({ host: "API.example.com:8443" });
		expect(ownHostnames(h, "https://links.example.com")).toEqual([
			"api.example.com",
			"links.example.com",
		]);
	});

	it("skips missing or unparseable values", () => {
		expect(ownHostnames(new Headers(), undefined)).toEqual([]);
		expect(ownHostnames(new Headers(), "::not a url::")).toEqual([]);
	});
});

describe("referrerHost", () => {
	const own = ["links.example.com"];

	it("keeps only the hostname — no path or tracking query string", () => {
		expect(referrerHost("https://L.Instagram.com/path?fbclid=IwAR0abc&utm_source=ig", own)).toBe(
			"l.instagram.com",
		);
	});

	it("drops the site's own host so internal navigation counts as Direct", () => {
		expect(referrerHost("https://links.example.com/?utm_source=ig", own)).toBeNull();
	});

	it("drops empty, unparseable and non-http(s) values", () => {
		expect(referrerHost(undefined, own)).toBeNull();
		expect(referrerHost("", own)).toBeNull();
		expect(referrerHost("not a url", own)).toBeNull();
		expect(referrerHost("android-app://com.google.android.gm/", own)).toBeNull();
		expect(referrerHost("javascript:alert(1)", own)).toBeNull();
	});
});
