import { type SQL, type SQLWrapper, sql } from "drizzle-orm";

/**
 * UTC offset of an IANA zone at `at`, in whole minutes (east of UTC positive).
 * Returns 0 for an unset or unknown zone, so a bad stored value degrades to UTC
 * instead of failing the query.
 */
export function utcOffsetMinutes(timeZone: string | undefined, at: Date = new Date()): number {
	if (!timeZone) return 0;
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			hourCycle: "h23",
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
		}).formatToParts(at);
		const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
		const wallClockAsUtc = Date.UTC(
			get("year"),
			get("month") - 1,
			get("day"),
			get("hour"),
			get("minute"),
		);
		// The wall clock was read to the minute, so compare against `at` truncated
		// to the minute too (otherwise its seconds skew the result by one).
		const atMinute = Math.floor(at.getTime() / 60_000) * 60_000;
		const offset = Math.round((wallClockAsUtc - atMinute) / 60_000);
		return Number.isFinite(offset) ? offset : 0;
	} catch {
		return 0;
	}
}

/**
 * SQL expression bucketing a `timestamp_ms` column into the calendar day
 * (YYYY-MM-DD) of a zone `offsetMinutes` from UTC. The offset is an integer we
 * computed, never user text, so inlining it as a literal modifier is safe and
 * keeps the SELECT / GROUP BY / ORDER BY expressions textually identical.
 */
export function localDaySql(column: SQLWrapper, offsetMinutes: number): SQL<string> {
	const minutes = Math.trunc(offsetMinutes);
	const modifier = `'${minutes >= 0 ? "+" : "-"}${Math.abs(minutes)} minutes'`;
	return sql<string>`date(${column} / 1000, 'unixepoch', ${sql.raw(modifier)})`;
}
