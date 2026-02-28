import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { contactSubmission } from "@linkden/db/schema/index";
import { eq, desc, and, inArray } from "drizzle-orm";
import { z } from "zod";

export const contactsRouter = router({
	list: protectedProcedure
		.input(
			z
				.object({
					isRead: z.boolean().optional(),
					limit: z.number().min(1).max(100).default(50),
					offset: z.number().min(0).default(0),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const conditions = [];
			if (input?.isRead !== undefined) {
				conditions.push(eq(contactSubmission.isRead, input.isRead));
			}

			const results = await db
				.select()
				.from(contactSubmission)
				.where(conditions.length > 0 ? and(...conditions) : undefined)
				.orderBy(desc(contactSubmission.createdAt))
				.limit(input?.limit ?? 50)
				.offset(input?.offset ?? 0);

			return results;
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			const [result] = await db
				.select()
				.from(contactSubmission)
				.where(eq(contactSubmission.id, input.id));
			return result ?? null;
		}),

	markRead: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			await db
				.update(contactSubmission)
				.set({ isRead: true, updatedAt: new Date() })
				.where(eq(contactSubmission.id, input.id));
			return { success: true };
		}),

	markUnread: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			await db
				.update(contactSubmission)
				.set({ isRead: false, updatedAt: new Date() })
				.where(eq(contactSubmission.id, input.id));
			return { success: true };
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			await db
				.delete(contactSubmission)
				.where(eq(contactSubmission.id, input.id));
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
		.input(z.object({ ids: z.array(z.string()).min(1).max(100) }))
		.mutation(async ({ input }) => {
			await db
				.delete(contactSubmission)
				.where(inArray(contactSubmission.id, input.ids));
			return { success: true };
		}),

	unreadCount: protectedProcedure.query(async () => {
		const results = await db
			.select()
			.from(contactSubmission)
			.where(eq(contactSubmission.isRead, false));
		return { count: results.length };
	}),
});
