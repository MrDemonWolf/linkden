// Daily buckets come back from analytics.viewsOverTime / clicksOverTime as
// calendar-day keys ("YYYY-MM-DD", in the admin's `timezone` setting), and only
// for days that had traffic. Everything here does day math on those keys as UTC
// dates, so neither the viewer's zone nor DST can shift a bucket.

export interface SeriesPoint {
	date: string;
	count: number;
}

export interface DailyRow {
	date: string;
	/** Short axis label, e.g. "Oct 6". */
	label: string;
	/** Label with the year, for the text alternative. */
	fullLabel: string;
	views: number;
	clicks: number;
}

const DAY_MS = 86_400_000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
/** Past this span the series is left sparse rather than zero-filled. */
const MAX_FILL_DAYS = 3660;

function keyToMs(key: string): number | null {
	if (!DAY_KEY.test(key)) return null;
	const [y, m, d] = key.split("-").map(Number);
	const ms = Date.UTC(y, m - 1, d);
	return Number.isNaN(ms) ? null : ms;
}

function msToKey(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Label a day key from its Y-M-D parts. Never `new Date("YYYY-MM-DD")` in the
 * viewer's zone: that is UTC midnight, i.e. the previous day west of UTC.
 */
export function formatDayKey(
	key: string,
	options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
	const ms = keyToMs(key);
	if (ms === null) return key;
	return new Date(ms).toLocaleDateString(undefined, { ...options, timeZone: "UTC" });
}

/** Today's day key in `timeZone` (the viewer's zone when unset or unknown). */
export function todayKey(timeZone?: string, now: Date = new Date()): string {
	const format = (zone: string | undefined) => {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone: zone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).formatToParts(now);
		const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
		return `${get("year")}-${get("month")}-${get("day")}`;
	};
	try {
		return format(timeZone || undefined);
	} catch {
		return format(undefined);
	}
}

/**
 * One row per calendar day with zeros for the days without traffic, so the
 * axis is evenly spaced in time and the area never bridges a gap. The range
 * runs from `days` before `today` (the first data day when `days` is undefined,
 * i.e. all time) through `today`, widened to any data outside it. No data → [].
 */
export function buildDailySeries(
	views: SeriesPoint[] | undefined,
	clicks: SeriesPoint[] | undefined,
	{ days, today }: { days?: number; today: string },
): DailyRow[] {
	const viewsByDay = new Map<string, number>();
	const clicksByDay = new Map<string, number>();
	for (const d of views ?? []) viewsByDay.set(d.date, d.count);
	for (const d of clicks ?? []) clicksByDay.set(d.date, d.count);

	const dataKeys = [...new Set([...viewsByDay.keys(), ...clicksByDay.keys()])].sort();
	if (dataKeys.length === 0) return [];

	const row = (date: string): DailyRow => ({
		date,
		label: formatDayKey(date),
		fullLabel: formatDayKey(date, { year: "numeric", month: "short", day: "numeric" }),
		views: viewsByDay.get(date) ?? 0,
		clicks: clicksByDay.get(date) ?? 0,
	});

	const dataMs = dataKeys.map(keyToMs).filter((ms): ms is number => ms !== null);
	if (dataMs.length !== dataKeys.length) return dataKeys.map(row);

	const firstMs = dataMs[0];
	const lastMs = dataMs[dataMs.length - 1];
	const todayMs = keyToMs(today) ?? lastMs;
	const startMs = Math.min(days === undefined ? firstMs : todayMs - days * DAY_MS, firstMs);
	const endMs = Math.max(todayMs, lastMs);
	if ((endMs - startMs) / DAY_MS > MAX_FILL_DAYS) return dataKeys.map(row);

	const rows: DailyRow[] = [];
	for (let ms = startMs; ms <= endMs; ms += DAY_MS) rows.push(row(msToKey(ms)));
	return rows;
}
