import { describe, expect, it } from "vitest";
import { utcOffsetMinutes } from "../utils/timezone";

describe("utcOffsetMinutes", () => {
	it("follows DST for a zone west of UTC", () => {
		expect(utcOffsetMinutes("America/Los_Angeles", new Date("2026-01-15T12:34:56Z"))).toBe(-480);
		expect(utcOffsetMinutes("America/Los_Angeles", new Date("2026-07-15T12:34:56Z"))).toBe(-420);
	});

	it("handles half-hour zones east of UTC", () => {
		expect(utcOffsetMinutes("Asia/Kolkata", new Date("2026-07-15T23:59:59Z"))).toBe(330);
	});

	it("degrades an unset or unknown zone to UTC", () => {
		expect(utcOffsetMinutes("UTC")).toBe(0);
		expect(utcOffsetMinutes(undefined)).toBe(0);
		expect(utcOffsetMinutes("")).toBe(0);
		expect(utcOffsetMinutes("Not/AZone")).toBe(0);
	});
});
