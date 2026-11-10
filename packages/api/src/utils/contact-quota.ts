import { db } from "@linkden/db";
import { contactQuota } from "@linkden/db/schema/index";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";

export const CONTACT_DAILY_LIMIT = 100;

/** Reserve before delivery; failures conservatively consume the reservation. */
export async function reserveContactDelivery(now = new Date()): Promise<void> {
	const day = now.toISOString().slice(0, 10);
	const [reserved] = await db
		.insert(contactQuota)
		.values({ id: "site", day, reserved: 1 })
		.onConflictDoUpdate({
			target: contactQuota.id,
			set: {
				day,
				reserved: sql`case when ${contactQuota.day} = ${day} then ${contactQuota.reserved} + 1 else 1 end`,
			},
			setWhere: sql`${contactQuota.day} < ${day} or (${contactQuota.day} = ${day} and ${contactQuota.reserved} < ${CONTACT_DAILY_LIMIT})`,
		})
		.returning({ reserved: contactQuota.reserved });
	if (!reserved)
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: "The daily contact limit has been reached. Please try again tomorrow.",
		});
}
