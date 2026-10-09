import { block } from "@linkden/db/schema/index";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";

/**
 * SQL predicate: the block's schedule window contains `now` (an unset start or
 * end is open-ended).
 */
export function inScheduleWhere(now: Date) {
	return and(
		or(isNull(block.scheduledStart), lte(block.scheduledStart, now)),
		or(isNull(block.scheduledEnd), gte(block.scheduledEnd, now)),
	);
}

/**
 * SQL predicate for a block a visitor may see right now: enabled, published and
 * inside its schedule window. The single definition shared by every public read
 * of blocks (getPage, the /api/vcard download) so they cannot drift apart.
 */
export function publicBlockWhere(now: Date) {
	return and(eq(block.isEnabled, true), eq(block.status, "published"), inScheduleWhere(now));
}
