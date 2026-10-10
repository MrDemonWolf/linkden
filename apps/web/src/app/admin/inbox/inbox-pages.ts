/** Messages per forms.list request (the router caps `limit` at 100). */
export const INBOX_PAGE_SIZE = 50;

/**
 * Join the loaded offset pages into one list. A message that arrives while
 * older pages are open shifts every offset by one, so the same row can sit at
 * the end of one page and the start of the next — keep the first copy.
 */
export function flattenPages<T extends { id: string }>(
	pages: ReadonlyArray<readonly T[] | undefined>,
): T[] {
	const seen = new Set<string>();
	const rows: T[] = [];
	for (const page of pages) {
		for (const row of page ?? []) {
			if (seen.has(row.id)) continue;
			seen.add(row.id);
			rows.push(row);
		}
	}
	return rows;
}

/** A full last page means there may be older messages to load. */
export function pageHasMore(page: readonly unknown[] | undefined): boolean {
	return (page?.length ?? 0) >= INBOX_PAGE_SIZE;
}
