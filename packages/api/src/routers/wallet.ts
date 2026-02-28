import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings, block, user } from "@linkden/db/schema/index";
import { eq, asc } from "drizzle-orm";
import { env } from "@linkden/env/server";
import { z } from "zod";

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const walletKeys = [
	"wallet_pass_enabled",
	"wallet_show_email",
	"wallet_show_name",
	"wallet_show_qr_code",
	"wallet_organization_name",
	"wallet_pass_description",
	"wallet_background_color",
	"wallet_foreground_color",
	"wallet_label_color",
	"wallet_logo_url",
];

function stripHtml(str: string): string {
	return str.replace(/<[^>]*>/g, "");
}

export const walletRouter = router({
	getConfig: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const config: Record<string, string> = {};
		for (const row of results) {
			if (walletKeys.includes(row.key)) {
				config[row.key] = row.value;
			}
		}
		return config;
	}),

	updateConfig: protectedProcedure
		.input(
			z.object({
				enabled: z.boolean().optional(),
				showEmail: z.boolean().optional(),
				showName: z.boolean().optional(),
				showQrCode: z.boolean().optional(),
				organizationName: z.string().max(100).optional(),
				passDescription: z.string().max(200).optional(),
				backgroundColor: z
					.string()
					.regex(hexColorRegex)
					.optional()
					.or(z.literal("")),
				foregroundColor: z
					.string()
					.regex(hexColorRegex)
					.optional()
					.or(z.literal("")),
				labelColor: z
					.string()
					.regex(hexColorRegex)
					.optional()
					.or(z.literal("")),
				logoUrl: z.string().url().optional().or(z.literal("")),
			}),
		)
		.mutation(async ({ input }) => {
			const updates: { key: string; value: string }[] = [];
			if (input.enabled !== undefined)
				updates.push({
					key: "wallet_pass_enabled",
					value: JSON.stringify(input.enabled),
				});
			if (input.showEmail !== undefined)
				updates.push({
					key: "wallet_show_email",
					value: JSON.stringify(input.showEmail),
				});
			if (input.showName !== undefined)
				updates.push({
					key: "wallet_show_name",
					value: JSON.stringify(input.showName),
				});
			if (input.showQrCode !== undefined)
				updates.push({
					key: "wallet_show_qr_code",
					value: JSON.stringify(input.showQrCode),
				});
			if (input.organizationName !== undefined)
				updates.push({
					key: "wallet_organization_name",
					value: stripHtml(input.organizationName),
				});
			if (input.passDescription !== undefined)
				updates.push({
					key: "wallet_pass_description",
					value: stripHtml(input.passDescription),
				});
			if (input.backgroundColor !== undefined)
				updates.push({
					key: "wallet_background_color",
					value: input.backgroundColor,
				});
			if (input.foregroundColor !== undefined)
				updates.push({
					key: "wallet_foreground_color",
					value: input.foregroundColor,
				});
			if (input.labelColor !== undefined)
				updates.push({
					key: "wallet_label_color",
					value: input.labelColor,
				});
			if (input.logoUrl !== undefined)
				updates.push({
					key: "wallet_logo_url",
					value: input.logoUrl,
				});

			for (const { key, value } of updates) {
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

	getSigningStatus: protectedProcedure.query(() => {
		return {
			signerCert: !!env.WALLET_SIGNER_CERT,
			signerKey: !!env.WALLET_SIGNER_KEY,
			wwdrCert: !!env.WALLET_WWDR_CERT,
			teamId: !!env.WALLET_TEAM_ID,
			passTypeId: !!env.WALLET_PASS_TYPE_ID,
		};
	}),

	generatePreview: protectedProcedure.query(async () => {
		const [profile] = await db.select().from(user).limit(1);
		const blocks = await db
			.select()
			.from(block)
			.where(eq(block.isEnabled, true))
			.orderBy(asc(block.position));

		const settings = await db.select().from(siteSettings);
		const settingsMap: Record<string, string> = {};
		for (const row of settings) {
			settingsMap[row.key] = row.value;
		}

		return {
			profile: profile
				? {
						name: profile.name,
						email: profile.email,
						image: profile.image,
					}
				: null,
			links: blocks
				.filter((b) => b.type === "link")
				.map((b) => ({ title: b.title, url: b.url })),
			qrUrl: null,
			organizationName: settingsMap.wallet_organization_name || "",
			passDescription: settingsMap.wallet_pass_description || "",
			backgroundColor: settingsMap.wallet_background_color || "#091533",
			foregroundColor: settingsMap.wallet_foreground_color || "#FFFFFF",
			labelColor: settingsMap.wallet_label_color || "#0FACED",
			logoUrl: settingsMap.wallet_logo_url || null,
			showEmail: settingsMap.wallet_show_email !== "false",
			showName: settingsMap.wallet_show_name !== "false",
			showQrCode: settingsMap.wallet_show_qr_code !== "false",
		};
	}),
});
