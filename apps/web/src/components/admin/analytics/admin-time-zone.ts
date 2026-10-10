"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

/**
 * The admin's `timezone` setting (Settings → Account), or undefined for
 * "Browser default". Insights buckets days in it server-side; Insights and Inbox
 * format their dates in it so both read the same calendar.
 */
export function useAdminTimeZone(): string | undefined {
	const query = useQuery(trpc.settings.get.queryOptions({ key: "timezone" }));
	return query.data?.value || undefined;
}

/**
 * `toLocaleString` in `timeZone`, falling back to the viewer's zone when the
 * stored value is unset or not a zone this browser knows.
 */
export function formatInTimeZone(
	value: string | Date,
	timeZone: string | undefined,
	options: Intl.DateTimeFormatOptions = {},
): string {
	const date = typeof value === "string" ? new Date(value) : value;
	try {
		return date.toLocaleString(undefined, { ...options, timeZone });
	} catch {
		return date.toLocaleString(undefined, options);
	}
}
