import { db } from "@linkden/db";
import { contactSubmission } from "@linkden/db/schema/index";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";

const filterSchema = z.object({
	isRead: z.boolean().optional(),
	blockId: z.string().max(100).optional(),
});

/** Where clause shared by `list` and `count`, so "n of total" always agrees. */
function filterWhere(filter: z.infer<typeof filterSchema> | undefined) {
	const conditions = [];
	if (filter?.isRead !== undefined) {
		conditions.push(eq(contactSubmission.isRead, filter.isRead));
	}
	if (filter?.blockId !== undefined) {
		conditions.push(eq(contactSubmission.blockId, filter.blockId));
	}
	return conditions.length > 0 ? and(...conditions) : undefined;
}

export const formsRouter = router({
	// Newest first, paged with limit/offset; pair with `count` (same filters)
	// to know how many remain past the loaded pages.
	list: protectedProcedure
		.input(
			filterSchema
				.extend({
					limit: z.number().int().min(1).max(100).default(50),
					offset: z.number().int().min(0).default(0),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			return db
				.select()
				.from(contactSubmission)
				.where(filterWhere(input))
				.orderBy(desc(contactSubmission.createdAt), desc(contactSubmission.id))
				.limit(input?.limit ?? 50)
				.offset(input?.offset ?? 0);
		}),

	/** Total submissions matching the same filters `list` takes. */
	count: protectedProcedure.input(filterSchema.optional()).query(async ({ input }) => {
		const [result] = await db
			.select({ total: count() })
			.from(contactSubmission)
			.where(filterWhere(input));
		return { total: result?.total ?? 0 };
	}),

	markRead: protectedProcedure
		.input(z.object({ id: z.string().max(100) }))
		.mutation(async ({ input }) => {
			await db
				.update(contactSubmission)
				.set({ isRead: true, updatedAt: new Date() })
				.where(eq(contactSubmission.id, input.id));
			return { success: true };
		}),

	markUnread: protectedProcedure
		.input(z.object({ id: z.string().max(100) }))
		.mutation(async ({ input }) => {
			await db
				.update(contactSubmission)
				.set({ isRead: false, updatedAt: new Date() })
				.where(eq(contactSubmission.id, input.id));
			return { success: true };
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().max(100) }))
		.mutation(async ({ input }) => {
			await db.delete(contactSubmission).where(eq(contactSubmission.id, input.id));
			await logAudit("contact.delete", "contact", input.id);
			return { success: true };
		}),

	markAllRead: protectedProcedure.mutation(async () => {
		await db
			.update(contactSubmission)
			.set({ isRead: true, updatedAt: new Date() })
			.where(eq(contactSubmission.isRead, false));
		return { success: true };
	}),

	deleteMultiple: protectedProcedure
		.input(z.object({ ids: z.array(z.string().max(100)).min(1).max(100) }))
		.mutation(async ({ input }) => {
			await db.delete(contactSubmission).where(inArray(contactSubmission.id, input.ids));
			await logAudit("contact.deleteMultiple", "contact", undefined, { count: input.ids.length });
			return { success: true };
		}),

	// Polled by the admin shell: an aggregate served by the isRead index, never
	// the rows themselves.
	unreadCount: protectedProcedure.query(async () => {
		const [result] = await db
			.select({ count: count() })
			.from(contactSubmission)
			.where(eq(contactSubmission.isRead, false));
		return { count: result?.count ?? 0 };
	}),
});
