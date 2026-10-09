import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/trpc", () => ({ trpc: {} }));

import { formatInTimeZone } from "../admin-time-zone";

describe("formatInTimeZone", () => {
	const at = "2026-10-07T01:00:00Z";

	it("formats in the admin's zone, not the viewer's", () => {
		expect(formatInTimeZone(at, "America/Chicago", { day: "numeric" })).toBe("6");
		expect(formatInTimeZone(at, "Asia/Tokyo", { day: "numeric" })).toBe("7");
	});

	it("falls back to the viewer's zone when unset or unknown", () => {
		const viewer = new Date(at).toLocaleString(undefined, { day: "numeric" });
		expect(formatInTimeZone(at, undefined, { day: "numeric" })).toBe(viewer);
		expect(formatInTimeZone(at, "Not/AZone", { day: "numeric" })).toBe(viewer);
	});
});
