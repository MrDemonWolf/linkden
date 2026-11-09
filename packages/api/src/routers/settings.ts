import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { settingKeySchema, VALID_SETTING_KEYS } from "@linkden/validators/settings";
import {
	isSecretKey,
	MAX_SETTING_VALUE_LENGTH,
	maskSecret,
	SECRET_MASK,
} from "@linkden/validators/settings-registry";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { sanitizeSetting } from "../utils/sanitize-setting";
import {
	assertMagicLinkAllowed,
	buildMaskedSettingsMap,
	runBatch,
	settingUpsertStmt,
	upsertSetting,
} from "../utils/settings";

// ─── Settings Router ───────────────────────────────────────────────────────
// Settings are key-value pairs stored in site_settings. The key whitelist
// (settingKeySchema) prevents arbitrary key injection. Per-key metadata —
// sanitizer kind, max length, secret/mask/backup policy — lives in the shared
// settings registry (@linkden/validators/settings-registry), so the settings,
// wallet, and backup routers all agree on one source of truth.

export const settingsRouter = router({
	get: protectedProcedure.input(z.object({ key: settingKeySchema })).query(async ({ input }) => {
		const [result] = await db.select().from(siteSettings).where(eq(siteSettings.key, input.key));
		if (!result) return null;
		return { ...result, value: maskSecret(result.key, result.value) };
	}),

	getAll: protectedProcedure.query(() => buildMaskedSettingsMap()),

	update: protectedProcedure
		.input(z.object({ key: settingKeySchema, value: z.string().max(MAX_SETTING_VALUE_LENGTH) }))
		.mutation(async ({ input }) => {
			// Ignore a re-submitted mask — the real secret is already stored.
			if (isSecretKey(input.key) && input.value === SECRET_MASK) {
				return { success: true };
			}
			const sanitizedValue = sanitizeSetting(input.key, input.value);
			await assertMagicLinkAllowed([{ key: input.key, value: sanitizedValue }]);
			await upsertSetting(input.key, sanitizedValue);
			await logAudit("settings.update", "setting", input.key);

			return { success: true };
		}),

	updateBulk: protectedProcedure
		.input(
			z
				.array(z.object({ key: settingKeySchema, value: z.string().max(MAX_SETTING_VALUE_LENGTH) }))
				.max(VALID_SETTING_KEYS.length),
		)
		.mutation(async ({ input }) => {
			const entries = input
				.filter(({ key, value }) => !(isSecretKey(key) && value === SECRET_MASK))
				.map(({ key, value }) => ({ key, value: sanitizeSetting(key, value) }));
			await assertMagicLinkAllowed(entries);
			await runBatch(entries.map(({ key, value }) => settingUpsertStmt(key, value)));
			await logAudit("settings.updateBulk", "setting");

			return { success: true };
		}),
});
