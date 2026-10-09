import { db } from "@linkden/db";
import { block, siteSettings } from "@linkden/db/schema/index";
import { type VcardData, vcardDataSchema } from "@linkden/validators/vcard";
import { and, asc, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { publicBlockWhere } from "../utils/schedule";
import { buildSettingsMap, runBatch, settingUpsertStmt } from "../utils/settings";
import { sanitizeSetting } from "./settings";

/**
 * RFC 6350 §3.4 TEXT escaping (backslash, comma, semicolon, newline). Without
 * it a CR/LF in any field starts a new property line, so a crafted value could
 * inject e.g. a falsified TEL into the public .vcf.
 */
export function escapeVcardText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/\r\n|\r|\n/g, "\\n")
		.replace(/,/g, "\\,")
		.replace(/;/g, "\\;");
}

/** URI / email values can't be TEXT-escaped; dropping line breaks keeps them on one line. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, "");

/** A TYPE parameter must be a bare token — `;`, `:` and `,` are delimiters there. */
const typeToken = (label: string) => label.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);

/** `N:` (required by vCard 3.0) from the display name: last word = family, rest = given. */
function structuredName(fullName: string | undefined): string {
	const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
	const family = parts.length > 1 ? (parts.pop() ?? "") : "";
	const given = parts.join(" ");
	return `N:${escapeVcardText(family)};${escapeVcardText(given)};;;`;
}

function generateVCardString(data: VcardData): string {
	const t = escapeVcardText;
	const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0", structuredName(data.fullName)];

	if (data.fullName) lines.push(`FN:${t(data.fullName)}`);
	if (data.nickname) lines.push(`NICKNAME:${t(data.nickname)}`);
	if (data.birthday) lines.push(`BDAY:${t(data.birthday)}`);
	if (data.org || data.department) {
		lines.push(`ORG:${t(data.org ?? "")}${data.department ? `;${t(data.department)}` : ""}`);
	}
	if (data.title) lines.push(`TITLE:${t(data.title)}`);
	if (data.email) lines.push(`EMAIL;TYPE=HOME:${oneLine(data.email)}`);
	if (data.workEmail) lines.push(`EMAIL;TYPE=WORK:${oneLine(data.workEmail)}`);
	if (data.phone) lines.push(`TEL;TYPE=HOME:${t(data.phone)}`);
	if (data.workPhone) lines.push(`TEL;TYPE=WORK:${t(data.workPhone)}`);
	if (data.address) lines.push(`ADR;TYPE=HOME:;;${t(data.address)};;;;`);
	if (data.photo) lines.push(`PHOTO;VALUE=uri:${oneLine(data.photo)}`);
	if (data.urls) {
		for (const u of data.urls) {
			if (!u.url) continue;
			const type = typeToken(u.label);
			lines.push(`URL${type ? `;TYPE=${type}` : ""}:${oneLine(u.url)}`);
		}
	}

	lines.push("END:VCARD");
	return lines.join("\r\n");
}

export function safeParseVcardData(value?: string | null): VcardData {
	if (!value) return {};
	try {
		const parsed = JSON.parse(value);
		const result = vcardDataSchema.safeParse(parsed);
		return result.success ? result.data : {};
	} catch {
		return {};
	}
}

/** Enough to be worth saving as a contact. */
export function hasVcardContent(data: VcardData): boolean {
	return !!(
		data.fullName ||
		data.org ||
		data.email ||
		data.workEmail ||
		data.phone ||
		data.workPhone
	);
}

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

export { generateVCardString, vcardDataSchema };
