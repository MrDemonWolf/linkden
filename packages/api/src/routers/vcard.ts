import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { type VcardData, vcardDataSchema } from "@linkden/validators/vcard";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { runBatch, settingUpsertStmt } from "../utils/settings";

function generateVCardString(data: VcardData): string {
	const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

	if (data.fullName) lines.push(`FN:${data.fullName}`);
	if (data.nickname) lines.push(`NICKNAME:${data.nickname}`);
	if (data.birthday) lines.push(`BDAY:${data.birthday}`);
	if (data.org) lines.push(`ORG:${data.org}`);
	if (data.title) lines.push(`TITLE:${data.title}`);
	if (data.email) lines.push(`EMAIL;TYPE=HOME:${data.email}`);
	if (data.workEmail) lines.push(`EMAIL;TYPE=WORK:${data.workEmail}`);
	if (data.phone) lines.push(`TEL;TYPE=HOME:${data.phone}`);
	if (data.workPhone) lines.push(`TEL;TYPE=WORK:${data.workPhone}`);
	if (data.address) lines.push(`ADR;TYPE=HOME:;;${data.address};;;;`);
	if (data.photo) lines.push(`PHOTO;VALUE=uri:${data.photo}`);
	if (data.urls) {
		for (const u of data.urls) {
			if (u.url) lines.push(`URL;TYPE=${u.label}:${u.url}`);
		}
	}

	lines.push("END:VCARD");
	return lines.join("\r\n");
}

function safeParseVcardData(value?: string): VcardData {
	if (!value) return {};
	try {
		const parsed = JSON.parse(value);
		const result = vcardDataSchema.safeParse(parsed);
		return result.success ? result.data : {};
	} catch {
		return {};
	}
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
			const stmts: BatchItem<"sqlite">[] = [];
			if (input.enabled !== undefined) {
				stmts.push(settingUpsertStmt("vcard_enabled", String(input.enabled)));
			}
			if (input.data) {
				stmts.push(settingUpsertStmt("vcard_data", JSON.stringify(input.data)));
			}
			await runBatch(stmts);
			return { success: true };
		}),

	preview: protectedProcedure.query(async () => {
		const [dataSetting] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "vcard_data"));

		if (!dataSetting) return { vcardString: "" };

		const data = safeParseVcardData(dataSetting.value);
		return { vcardString: generateVCardString(data) };
	}),
});

export { generateVCardString, vcardDataSchema };
