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
	"wallet_signer_cert",
	"wallet_signer_key",
	"wallet_wwdr_cert",
	"wallet_team_id",
	"wallet_pass_type_id",
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

	getSigningStatus: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const settingsMap: Record<string, string> = {};
		for (const row of results) {
			settingsMap[row.key] = row.value;
		}
		return {
			signerCert: !!settingsMap.wallet_signer_cert || !!env.WALLET_SIGNER_CERT,
			signerKey: !!settingsMap.wallet_signer_key || !!env.WALLET_SIGNER_KEY,
			wwdrCert: !!settingsMap.wallet_wwdr_cert || !!env.WALLET_WWDR_CERT,
			teamId: !!settingsMap.wallet_team_id || !!env.WALLET_TEAM_ID,
			passTypeId: !!settingsMap.wallet_pass_type_id || !!env.WALLET_PASS_TYPE_ID,
			source: {
				signerCert: settingsMap.wallet_signer_cert ? "settings" : env.WALLET_SIGNER_CERT ? "env" : "missing",
				signerKey: settingsMap.wallet_signer_key ? "settings" : env.WALLET_SIGNER_KEY ? "env" : "missing",
				wwdrCert: settingsMap.wallet_wwdr_cert ? "settings" : env.WALLET_WWDR_CERT ? "env" : "missing",
				teamId: settingsMap.wallet_team_id ? "settings" : env.WALLET_TEAM_ID ? "env" : "missing",
				passTypeId: settingsMap.wallet_pass_type_id ? "settings" : env.WALLET_PASS_TYPE_ID ? "env" : "missing",
			},
		};
	}),

	getSigningKeys: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const settingsMap: Record<string, string> = {};
		for (const row of results) {
			settingsMap[row.key] = row.value;
		}
		return {
			hasSignerCert: !!settingsMap.wallet_signer_cert,
			hasSignerKey: !!settingsMap.wallet_signer_key,
			hasWwdrCert: !!settingsMap.wallet_wwdr_cert,
			teamId: settingsMap.wallet_team_id || "",
			passTypeId: settingsMap.wallet_pass_type_id || "",
		};
	}),

	updateSigningKeys: protectedProcedure
		.input(
			z.object({
				teamId: z.string().max(20).optional(),
				passTypeId: z.string().max(100).optional(),
				signerCert: z.string().optional(),
				signerKey: z.string().optional(),
				wwdrCert: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const updates: { key: string; value: string }[] = [];
			if (input.teamId !== undefined)
				updates.push({ key: "wallet_team_id", value: input.teamId });
			if (input.passTypeId !== undefined)
				updates.push({ key: "wallet_pass_type_id", value: input.passTypeId });
			if (input.signerCert !== undefined)
				updates.push({ key: "wallet_signer_cert", value: input.signerCert });
			if (input.signerKey !== undefined)
				updates.push({ key: "wallet_signer_key", value: input.signerKey });
			if (input.wwdrCert !== undefined)
				updates.push({ key: "wallet_wwdr_cert", value: input.wwdrCert });

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
