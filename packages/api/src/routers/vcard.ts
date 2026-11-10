import { db } from "@linkden/db";
import { block, siteSettings } from "@linkden/db/schema/index";
import {
	generateVCardString,
	hasVcardContent,
	safeParseVcardData,
	type VcardData,
	vcardDataSchema,
} from "@linkden/validators/vcard";
import { and, asc, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { sanitizeSetting } from "../utils/sanitize-setting";
import { publicBlockWhere } from "../utils/schedule";
import { buildSettingsMap, runBatch, settingUpsertStmt } from "../utils/settings";

export {
	escapeVcardText,
	generateVCardString,
	hasVcardContent,
	safeParseVcardData,
} from "@linkden/validators/vcard";

/**
 * The one source of truth for the public vCard download (GET /api/vcard).
 * Requires `vcard_enabled`. Only blocks a visitor may see right now count
 * (publicBlockWhere: enabled, published, inside the schedule window, the same
 * predicate as public.getPage), so a block the admin scheduled to be hidden
 * never leaks its contact details.
 *
 * - With `blockId` (the vCard block's own button): that block's card, or null
 *   when it is missing, not visible or empty. Never another card.
 * - Without (the footer pill): the first visible vCard block when it has
 *   content, else the global vCard the Design → Branding form writes (`vcard_data`).
 */
export async function resolvePublicVcard(
	now: Date = new Date(),
	blockId?: string,
): Promise<{ data: VcardData; vcardString: string } | null> {
	// Public path: read only the two keys it needs, never the secret rows.
	const settings = await buildSettingsMap(["vcard_enabled", "vcard_data"]);
	if (settings.vcard_enabled !== "true") return null;

	const blocks = await db
		.select({ config: block.config })
		.from(block)
		.where(
			and(
				eq(block.type, "vcard"),
				publicBlockWhere(now),
				blockId === undefined ? undefined : eq(block.id, blockId),
			),
		)
		.orderBy(asc(block.position), asc(block.createdAt), asc(block.id));

	let data: VcardData;
	if (blockId !== undefined) {
		data = blocks[0] ? safeParseVcardData(blocks[0].config) : {};
	} else {
		const first = blocks[0] ? safeParseVcardData(blocks[0].config) : {};
		data = hasVcardContent(first) ? first : safeParseVcardData(settings.vcard_data);
	}
	if (!hasVcardContent(data)) return null;
	return { data, vcardString: generateVCardString(data) };
}

export const vcardRouter = router({
	getConfig: protectedProcedure.query(async () => {
		const [enabledSetting] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "vcard_enabled"));
		const [dataSetting] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "vcard_data"));

		return {
			enabled: enabledSetting?.value === "true",
			data: safeParseVcardData(dataSetting?.value),
		};
	}),

	updateConfig: protectedProcedure
		.input(
			z.object({
				enabled: z.boolean().optional(),
				data: vcardDataSchema.optional(),
			}),
		)
		.mutation(async ({ input }) => {
			// Through the registry gate, so the stored blob obeys the same cap and
			// shape check backup.import applies — a vCard that saves must restore.
			const stmts: BatchItem<"sqlite">[] = [];
			if (input.enabled !== undefined) {
				stmts.push(
					settingUpsertStmt(
						"vcard_enabled",
						sanitizeSetting("vcard_enabled", String(input.enabled)),
					),
				);
			}
			if (input.data) {
				stmts.push(
					settingUpsertStmt(
						"vcard_data",
						sanitizeSetting("vcard_data", JSON.stringify(input.data)),
					),
				);
			}
			await runBatch(stmts);
			return { success: true };
		}),
});

export { vcardDataSchema };
