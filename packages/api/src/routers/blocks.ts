import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { block } from "@linkden/db/schema/index";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";

// ─── Block Router ──────────────────────────────────────────────────────────
// Blocks are the core content units on the public page. Each block has a type
// (link, header, social_icons, embed, form, vcard) that determines its rendering
// and config schema. Blocks follow a draft/published flow: every mutation sets
// status="draft", and publishAll promotes all drafts at once. This lets the admin
// preview changes before they go live.
//
// Sanitization strategy: all user-entered strings are run through stripHtml (to
// prevent stored XSS) and sanitizeUrl (to block javascript:/data: schemes).
// The socialIcons field is a JSON string — parsed, sanitized per-entry, then
// re-serialized.
function stripHtml(str: string): string {
	return str.replace(/<[^>]*>/g, "");
}

function sanitizeUrl(url: string): string {
	if (!url) return url;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return "";
		}
		return url;
	} catch {
		// If URL parsing fails, reject it — unparseable URLs could be javascript: or data: schemes
		return "";
	}
}

function sanitizeBlockInput<T extends Record<string, unknown>>(input: T): T {
	const sanitized = { ...input };
	if (typeof sanitized.title === "string") {
		(sanitized as Record<string, unknown>).title = stripHtml(sanitized.title as string);
	}
	if (typeof sanitized.url === "string") {
		(sanitized as Record<string, unknown>).url = sanitizeUrl(sanitized.url as string);
	}
	if (typeof sanitized.embedUrl === "string") {
		(sanitized as Record<string, unknown>).embedUrl = sanitizeUrl(sanitized.embedUrl as string);
	}
	if (typeof sanitized.socialIcons === "string") {
		try {
			const icons = JSON.parse(sanitized.socialIcons as string) as Array<{ platform: string; url: string }>;
			const sanitizedIcons = icons.map((icon) => ({
				platform: stripHtml(icon.platform || ""),
				url: sanitizeUrl(icon.url || ""),
			}));
			(sanitized as Record<string, unknown>).socialIcons = JSON.stringify(sanitizedIcons);
		} catch (err) {
			console.warn("Failed to parse socialIcons JSON, resetting to empty array:", err);
			(sanitized as Record<string, unknown>).socialIcons = "[]";
		}
	}
	return sanitized;
}

export const blocksRouter = router({
	list: protectedProcedure.query(async () => {
		return db.select().from(block).orderBy(asc(block.position));
	}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			const [result] = await db
				.select()
				.from(block)
				.where(eq(block.id, input.id));
			return result ?? null;
		}),

	create: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				type: z.enum([
					"link",
					"header",
					"social_icons",
					"embed",
					"form",
					"vcard",
				]),
				title: z.string().max(200).optional(),
				url: z.string().max(2048).optional(),
				icon: z.string().max(100).optional(),
				embedType: z.string().max(50).optional(),
				embedUrl: z.string().max(2048).optional(),
				socialIcons: z.string().max(50000).optional(),
				isEnabled: z.boolean().default(true),
				position: z.number(),
				scheduledStart: z.date().optional(),
				scheduledEnd: z.date().optional(),
				config: z.string().max(50000).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const sanitized = sanitizeBlockInput(input);
			const [result] = await db
				.insert(block)
				.values({
					...sanitized,
					status: "draft",
					scheduledStart: input.scheduledStart ?? null,
					scheduledEnd: input.scheduledEnd ?? null,
					config: input.config ?? null,
				})
				.returning();
			return result;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				title: z.string().max(200).optional(),
				url: z.string().max(2048).optional(),
				icon: z.string().max(100).optional(),
				embedType: z.string().max(50).optional(),
				embedUrl: z.string().max(2048).optional(),
				socialIcons: z.string().max(50000).optional(),
				isEnabled: z.boolean().optional(),
				position: z.number().optional(),
				scheduledStart: z.date().nullable().optional(),
				scheduledEnd: z.date().nullable().optional(),
				config: z.string().max(50000).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { id, ...data } = input;
			const sanitized = sanitizeBlockInput(data);
			const [result] = await db
				.update(block)
				.set({ ...sanitized, status: "draft", updatedAt: new Date() })
				.where(eq(block.id, id))
				.returning();
			return result;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			await db.delete(block).where(eq(block.id, input.id));
			return { success: true };
		}),

	reorder: protectedProcedure
		.input(
			z.array(
				z.object({
					id: z.string(),
					position: z.number(),
				}),
			).max(200),
		)
		.mutation(async ({ input }) => {
			for (const item of input) {
				await db
					.update(block)
					.set({ position: item.position, status: "draft", updatedAt: new Date() })
					.where(eq(block.id, item.id));
			}
			return { success: true };
		}),

	toggleEnabled: protectedProcedure
		.input(
			z.object({
				id: z.string(),
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
