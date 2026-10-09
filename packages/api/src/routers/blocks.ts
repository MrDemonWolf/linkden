import { db } from "@linkden/db";
import { block } from "@linkden/db/schema/index";
import {
	createBlockSchema,
	MAX_BLOCKS,
	parseBlockConfig,
	reorderBlocksSchema,
	updateBlockSchema,
} from "@linkden/validators/blocks";
import { TRPCError } from "@trpc/server";
import { asc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { stripHtml } from "../utils/sanitize";
import { runBatch } from "../utils/settings";

// ─── Block Router ──────────────────────────────────────────────────────────
// Blocks are the core content units on the public page. Each block has a type
// that determines its rendering and config schema — both come from
// @linkden/validators/blocks, shared with the admin builder so client and
// server validate identically. Blocks follow a draft/published flow: a new
// block starts as "draft" and publishAll promotes all drafts at once. Editing
// an ALREADY-PUBLISHED block must NOT demote it back to draft — that would
// silently pull a live block off the public page (public.getPage filters on
// status="published") until the next Publish.
//
// URLs are rejected by the shared httpUrlSchema (no silent blanking); titles
// still go through stripHtml as a last line of defence against stored XSS.
//
// Positions are assigned here, not trusted from the client: a new block always
// appends after the current maximum, and Undo re-inserts at its old slot by
// shifting the blocks at or after it — so two blocks never share a position.

export const blocksRouter = router({
	list: protectedProcedure.query(async () => {
		return db
			.select()
			.from(block)
			.orderBy(asc(block.position), asc(block.createdAt), asc(block.id));
	}),

	create: protectedProcedure.input(createBlockSchema).mutation(async ({ input }) => {
		// An explicit status only comes from Undo-after-delete; it restores the
		// block where it was. A new block defaults to draft and appends.
		const isRestore = input.status !== undefined;
		// reorder accepts at most MAX_BLOCKS rows, so a page can never grow past it.
		const [existing] = await db.select({ count: sql<number>`count(*)` }).from(block);
		if ((existing?.count ?? 0) >= MAX_BLOCKS) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Page is limited to ${MAX_BLOCKS} blocks`,
			});
		}
		const values = {
			...input,
			title: input.title === undefined ? undefined : stripHtml(input.title),
			isEnabled: input.isEnabled ?? true,
			status: input.status ?? "draft",
			scheduledStart: input.scheduledStart ?? null,
			scheduledEnd: input.scheduledEnd ?? null,
			config: input.config ?? null,
		};

		if (!isRestore) {
			const [result] = await db
				.insert(block)
				.values({
					...values,
					position: sql`(select coalesce(max(${block.position}), -1) + 1 from ${block})`,
				})
				.returning();
			return result;
		}

		// One batch: make room at the old slot, then re-insert there.
		const [, inserted] = await db.batch([
			db
				.update(block)
				.set({ position: sql`${block.position} + 1` })
				.where(gte(block.position, input.position)),
			db.insert(block).values(values).returning(),
		]);
		return inserted[0];
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
					.set({ position: item.position, updatedAt: new Date() })
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
				.set({ isEnabled: input.isEnabled, updatedAt: new Date() })
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
