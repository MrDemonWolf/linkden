import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings, block, user } from "@linkden/db/schema/index";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

export const walletRouter = router({
	getConfig: protectedProcedure.query(async () => {
		const keys = [
			"wallet_pass_enabled",
			"wallet_team_id",
			"wallet_pass_type_id",
			"wallet_custom_qr_url",
		];
		const results = await db.select().from(siteSettings);
		const config: Record<string, string> = {};
		for (const row of results) {
			if (keys.includes(row.key)) {
				config[row.key] = row.value;
			}
		}
		return config;
	}),

	updateConfig: protectedProcedure
		.input(
			z.object({
				enabled: z.boolean().optional(),
				teamId: z.string().optional(),
				passTypeId: z.string().optional(),
				customQrUrl: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const updates: { key: string; value: string }[] = [];
			if (input.enabled !== undefined)
				updates.push({
					key: "wallet_pass_enabled",
					value: JSON.stringify(input.enabled),
				});
			if (input.teamId !== undefined)
				updates.push({ key: "wallet_team_id", value: input.teamId });
			if (input.passTypeId !== undefined)
				updates.push({
					key: "wallet_pass_type_id",
					value: input.passTypeId,
				});
			if (input.customQrUrl !== undefined)
				updates.push({
					key: "wallet_custom_qr_url",
					value: input.customQrUrl,
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
			qrUrl: settingsMap.wallet_custom_qr_url || null,
		};
	}),
});
