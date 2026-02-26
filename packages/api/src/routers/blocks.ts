import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { block } from "@linkden/db/schema/index";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";

// Sanitize user-entered block content
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
		return url; // might be a relative URL or partial during editing
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
		} catch {
			// Invalid JSON — clear it
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
					"contact_form",
				]),
				title: z.string().optional(),
				url: z.string().optional(),
				icon: z.string().optional(),
				embedType: z.string().optional(),
				embedUrl: z.string().optional(),
				socialIcons: z.string().optional(),
				isEnabled: z.boolean().default(true),
				position: z.number(),
				scheduledStart: z.date().optional(),
				scheduledEnd: z.date().optional(),
				config: z.string().optional(),
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
				title: z.string().optional(),
				url: z.string().optional(),
				icon: z.string().optional(),
				embedType: z.string().optional(),
				embedUrl: z.string().optional(),
				socialIcons: z.string().optional(),
				isEnabled: z.boolean().optional(),
				position: z.number().optional(),
				scheduledStart: z.date().nullable().optional(),
				scheduledEnd: z.date().nullable().optional(),
				config: z.string().optional(),
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
			),
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
