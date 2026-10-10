import { describe, expect, it } from "vitest";
import { buildDailySeries, formatDayKey, todayKey } from "../daily-series";

describe("formatDayKey", () => {
	it("labels the bucket's own calendar day in every viewer zone", () => {
		// The old `new Date("2026-10-07").toLocaleDateString()` read UTC midnight in
		// the viewer's zone and printed "Oct 6" anywhere west of UTC.
		expect(formatDayKey("2026-10-07", { month: "short", day: "numeric" })).toBe(
			new Date(Date.UTC(2026, 9, 7)).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
		);
		expect(formatDayKey("2026-10-07", { day: "numeric", timeZone: "America/Chicago" })).toBe("7");
	});

	it("passes through a key it cannot parse", () => {
		expect(formatDayKey("nope")).toBe("nope");
	});
});

describe("todayKey", () => {
	const now = new Date("2026-10-07T01:00:00Z");

	it("is the calendar day in the given zone", () => {
		expect(todayKey("America/Chicago", now)).toBe("2026-10-06");
		expect(todayKey("UTC", now)).toBe("2026-10-07");
	});

	it("falls back to the viewer's zone for an unknown zone", () => {
		expect(todayKey("Not/AZone", now)).toBe(todayKey(undefined, now));
	});
});

describe("buildDailySeries", () => {
	it("zero-fills every day of the period, including before the first visit", () => {
		const rows = buildDailySeries(
			[
				{ date: "2026-10-02", count: 20 },
				{ date: "2026-10-05", count: 15 },
			],
			[{ date: "2026-10-05", count: 3 }],
			{ days: 7, today: "2026-10-07" },
		);
		expect(rows.map((r) => r.date)).toEqual([
			"2026-09-30",
			"2026-10-01",
			"2026-10-02",
			"2026-10-03",
			"2026-10-04",
			"2026-10-05",
			"2026-10-06",
			"2026-10-07",
		]);
		expect(rows.map((r) => r.views)).toEqual([0, 0, 20, 0, 0, 15, 0, 0]);
		expect(rows.map((r) => r.clicks)).toEqual([0, 0, 0, 0, 0, 3, 0, 0]);
	});

	it("starts all time at the first data day and runs to today", () => {
		const rows = buildDailySeries([{ date: "2026-10-05", count: 1 }], [], {
			today: "2026-10-07",
		});
		expect(rows.map((r) => r.date)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
	});

	it("widens to data outside the window instead of dropping it", () => {
		const rows = buildDailySeries([{ date: "2026-10-08", count: 4 }], undefined, {
			days: 1,
			today: "2026-10-07",
		});
		expect(rows.map((r) => [r.date, r.views])).toEqual([
			["2026-10-06", 0],
			["2026-10-07", 0],
			["2026-10-08", 4],
		]);
	});

	it("crosses month and DST boundaries one calendar day at a time", () => {
		const rows = buildDailySeries([{ date: "2026-11-02", count: 1 }], [], {
			days: 3,
			today: "2026-11-02",
		});
		expect(rows.map((r) => r.date)).toEqual([
			"2026-10-30",
			"2026-10-31",
			"2026-11-01",
			"2026-11-02",
		]);
	});

	it("is empty without data, so the chart keeps its empty state", () => {
		expect(buildDailySeries([], undefined, { days: 30, today: "2026-10-07" })).toEqual([]);
	});
});
