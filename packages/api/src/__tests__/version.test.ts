import { describe, expect, it } from "vitest";
import { APP_VERSION, compareSemver } from "../utils/version";

describe("compareSemver", () => {
	it("treats equal versions as equal", () => {
		expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
		expect(compareSemver("v1.2.3", "1.2.3")).toBe(0);
	});

	it("orders older below newer across each segment", () => {
		expect(compareSemver("1.2.3", "1.2.4")).toBe(-1);
		expect(compareSemver("1.2.3", "1.3.0")).toBe(-1);
		expect(compareSemver("1.2.3", "2.0.0")).toBe(-1);
		expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
	});

	it("does not treat 0.10.0 as older than 0.9.0 (numeric, not string)", () => {
		expect(compareSemver("0.10.0", "0.9.0")).toBe(1);
	});

	it("ranks a prerelease below its release", () => {
		expect(compareSemver("1.0.0-rc.1", "1.0.0")).toBe(-1);
		expect(compareSemver("1.0.0", "1.0.0-rc.1")).toBe(1);
	});

	it("orders prerelease identifiers by precedence", () => {
		expect(compareSemver("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
		expect(compareSemver("1.0.0-rc.1", "1.0.0-rc.2")).toBe(-1);
		expect(compareSemver("1.0.0-alpha.1", "1.0.0-alpha")).toBe(1);
	});

	it("sources APP_VERSION from version.json as a valid semver", () => {
		expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
		expect(compareSemver(APP_VERSION, APP_VERSION)).toBe(0);
	});
});
