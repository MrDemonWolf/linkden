import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";

const vcardDataSchema = z.object({
	fullName: z.string().optional(),
	nickname: z.string().optional(),
	birthday: z.string().optional(),
	photo: z.string().optional(),
	org: z.string().optional(),
	title: z.string().optional(),
	department: z.string().optional(),
	workEmail: z.string().optional(),
	workPhone: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	urls: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
});

function generateVCardString(data: z.infer<typeof vcardDataSchema>): string {
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
			lines.push(`URL;TYPE=${u.label}:${u.url}`);
		}
	}

	lines.push("END:VCARD");
	return lines.join("\r\n");
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
			data: dataSetting ? JSON.parse(dataSetting.value) : {},
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
			if (input.enabled !== undefined) {
				const key = "vcard_enabled";
				const value = String(input.enabled);
				const [existing] = await db
					.select()
					.from(siteSettings)
					.where(eq(siteSettings.key, key));
				if (existing) {
					await db
						.update(siteSettings)
						.set({ value })
						.where(eq(siteSettings.key, key));
				} else {
					await db.insert(siteSettings).values({ key, value });
				}
			}

			if (input.data) {
				const key = "vcard_data";
				const value = JSON.stringify(input.data);
				const [existing] = await db
					.select()
					.from(siteSettings)
					.where(eq(siteSettings.key, key));
				if (existing) {
					await db
						.update(siteSettings)
						.set({ value })
						.where(eq(siteSettings.key, key));
				} else {
					await db.insert(siteSettings).values({ key, value });
				}
			}

			return { success: true };
		}),

	preview: protectedProcedure.query(async () => {
		const [dataSetting] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "vcard_data"));

		if (!dataSetting) return { vcardString: "" };

		const data = vcardDataSchema.parse(JSON.parse(dataSetting.value));
		return { vcardString: generateVCardString(data) };
	}),
});

export { generateVCardString, vcardDataSchema };
