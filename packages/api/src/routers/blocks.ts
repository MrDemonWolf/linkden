import { db } from "@linkden/db";
import { block } from "@linkden/db/schema/index";
import {
	createBlockSchema,
	parseBlockConfig,
	reorderBlocksSchema,
	updateBlockSchema,
} from "@linkden/validators/blocks";
import { TRPCError } from "@trpc/server";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { stripHtml } from "../utils/sanitize";
import { runBatch } from "../utils/settings";

// ─── Block Router ──────────────────────────────────────────────────────────
// Blocks are the core content units on the public page. Each block has a type
// that determines its rendering and config schema — both come from
// @linkden/validators/blocks, shared with the admin builder so client and
// server validate identically. Blocks follow a draft/published flow: every
// mutation sets status="draft", and publishAll promotes all drafts at once.
//
// URLs are rejected by the shared httpUrlSchema (no silent blanking); titles
// still go through stripHtml as a last line of defence against stored XSS.

export const blocksRouter = router({
	list: protectedProcedure.query(async () => {
		return db.select().from(block).orderBy(asc(block.position));
	}),

	get: protectedProcedure.input(z.object({ id: z.string().max(100) })).query(async ({ input }) => {
		const [result] = await db.select().from(block).where(eq(block.id, input.id));
		return result ?? null;
	}),

	create: protectedProcedure.input(createBlockSchema).mutation(async ({ input }) => {
		const [result] = await db
			.insert(block)
			.values({
				...input,
				title: input.title === undefined ? undefined : stripHtml(input.title),
				isEnabled: input.isEnabled ?? true,
				status: "draft",
				scheduledStart: input.scheduledStart ?? null,
				scheduledEnd: input.scheduledEnd ?? null,
				config: input.config ?? null,
			})
			.returning();
		return result;
	}),

	update: protectedProcedure.input(updateBlockSchema).mutation(async ({ input }) => {
		const { id, ...data } = input;
		// The schema only validates config against the type when both are sent;
		// on a type-less update, check it against the stored row's type.
		if (data.config !== undefined && !data.type) {
			const [existing] = await db.select({ type: block.type }).from(block).where(eq(block.id, id));
			if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
			const parsed = parseBlockConfig(existing.type, data.config);
			if (!parsed.ok) {
				throw new TRPCError({ code: "BAD_REQUEST", message: parsed.issues.join("; ") });
			}
		}
		const [result] = await db
			.update(block)
			.set({
				...data,
				title: data.title === undefined ? undefined : stripHtml(data.title),
				status: "draft",
				updatedAt: new Date(),
			})
			.where(eq(block.id, id))
			.returning();
		return result;
	}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().max(100) }))
		.mutation(async ({ input }) => {
			await db.delete(block).where(eq(block.id, input.id));
			await logAudit("blocks.delete", "block", input.id);
			return { success: true };
		}),

	reorder: protectedProcedure.input(reorderBlocksSchema).mutation(async ({ input }) => {
		// One transactional batch — a partial failure must not leave blocks in
		// an inconsistent order.
		await runBatch(
			input.map((item) =>
				db
					.update(block)
					.set({ position: item.position, status: "draft", updatedAt: new Date() })
					.where(eq(block.id, item.id)),
			),
		);
		return { success: true };
	}),

	toggleEnabled: protectedProcedure
		.input(
			z.object({
				id: z.string().max(100),
				isEnabled: z.boolean(),
			}),
		)
		.mutation(async ({ input }) => {
			const [result] = await db
				.update(block)
				.set({ isEnabled: input.isEnabled, status: "draft", updatedAt: new Date() })
				.where(eq(block.id, input.id))
				.returning();
			return result;
		}),

	publishAll: protectedProcedure.mutation(async () => {
		await db
			.update(block)
			.set({ status: "published", updatedAt: new Date() })
			.where(eq(block.status, "draft"));
		return { success: true };
	}),

	hasDraft: protectedProcedure.query(async () => {
		const [result] = await db
			.select({ count: sql<number>`count(*)` })
			.from(block)
			.where(eq(block.status, "draft"));
		return { hasDraft: (result?.count ?? 0) > 0 };
	}),
});
