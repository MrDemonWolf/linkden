import { db } from "@linkden/db";
import { block, siteSettings, user } from "@linkden/db/schema/index";
import { env } from "@linkden/env/server";
import { maskSecret, WALLET_SETTING_KEYS } from "@linkden/validators/settings-registry";
import {
	isCertificateMaterial,
	isPrivateKeyMaterial,
	normalizeSigningMaterial,
	PASS_FIELD_LIMITS,
	PASS_LOCATION_LIMIT,
	type PassField,
	type PassTemplatePreset,
	parsePassLocationsJson,
	resolvePassContent,
	walletConfigSchema,
	walletSigningKeysSchema,
} from "@linkden/validators/wallet";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { stripHtml } from "../utils/sanitize";
import { buildSettingsMap, runBatch, settingUpsertStmt } from "../utils/settings";
import { sanitizeSetting } from "./settings";

const walletKeys: readonly string[] = WALLET_SETTING_KEYS;

/** Registry-driven write: every wallet key goes through the same gate as settings/backup. */
const walletUpsert = (key: string, value: string) =>
	settingUpsertStmt(key, sanitizeSetting(key, value));

const SIGNING_MATERIAL = [
	{
		field: "signerCert",
		key: "wallet_signer_cert",
		label: "Signer certificate",
		check: isCertificateMaterial,
	},
	{
		field: "signerKey",
		key: "wallet_signer_key",
		label: "Signer key",
		check: isPrivateKeyMaterial,
	},
	{
		field: "wwdrCert",
		key: "wallet_wwdr_cert",
		label: "WWDR certificate",
		check: isCertificateMaterial,
	},
] as const;

/** Configured and loadable by the signer (env values may be base64-wrapped PEM too). */
const usable = (value: string | undefined, check: (v: string) => boolean) =>
	!!value && check(normalizeSigningMaterial(value));

type PassSection = keyof typeof PASS_FIELD_LIMITS;

/**
 * Strip and clamp one section's fields. A key made only of tag syntax would
 * strip to "" and then fail the registry gate with a generic message for the
 * whole save, so name the offending field instead.
 */
function clampFields(fields: PassField[], section: PassSection): PassField[] {
	return fields.slice(0, PASS_FIELD_LIMITS[section]).map((f, i) => {
		const key = stripHtml(f.key).trim().slice(0, 64);
		if (!key) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `${section} field ${i + 1}: key must contain text (HTML is removed)`,
			});
		}
		return {
			key,
			label: stripHtml(f.label).slice(0, 40),
			value: stripHtml(f.value).slice(0, 200),
		};
	});
}

export const walletRouter = router({
	getConfig: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const config: Record<string, string> = {};
		for (const row of results) {
			if (walletKeys.includes(row.key)) {
				config[row.key] = maskSecret(row.key, row.value);
			}
		}
		return config;
	}),

	updateConfig: protectedProcedure.input(walletConfigSchema).mutation(async ({ input }) => {
		const updates: { key: string; value: string }[] = [];
		const push = (key: string, value: string) => updates.push({ key, value });

		if (input.enabled !== undefined) push("wallet_pass_enabled", JSON.stringify(input.enabled));
		if (input.showEmail !== undefined) push("wallet_show_email", JSON.stringify(input.showEmail));
		if (input.showName !== undefined) push("wallet_show_name", JSON.stringify(input.showName));
		if (input.showQrCode !== undefined)
			push("wallet_show_qr_code", JSON.stringify(input.showQrCode));
		if (input.templatePreset !== undefined) push("wallet_template_preset", input.templatePreset);
		if (input.organizationName !== undefined)
			push("wallet_organization_name", stripHtml(input.organizationName));
		if (input.passDescription !== undefined)
			push("wallet_pass_description", stripHtml(input.passDescription));
		if (input.backgroundColor !== undefined) push("wallet_background_color", input.backgroundColor);
		if (input.foregroundColor !== undefined) push("wallet_foreground_color", input.foregroundColor);
		if (input.labelColor !== undefined) push("wallet_label_color", input.labelColor);
		if (input.logoUrl !== undefined) push("wallet_logo_url", input.logoUrl);
		if (input.iconUrl !== undefined) push("wallet_icon_url", input.iconUrl);
		if (input.thumbnailUrl !== undefined) push("wallet_thumbnail_url", input.thumbnailUrl);
		if (input.stripUrl !== undefined) push("wallet_strip_url", input.stripUrl);
		if (input.headerFields !== undefined)
			push("wallet_header_fields", JSON.stringify(clampFields(input.headerFields, "header")));
		if (input.primaryFields !== undefined)
			push("wallet_primary_fields", JSON.stringify(clampFields(input.primaryFields, "primary")));
		if (input.secondaryFields !== undefined)
			push(
				"wallet_secondary_fields",
				JSON.stringify(clampFields(input.secondaryFields, "secondary")),
			);
		if (input.auxiliaryFields !== undefined)
			push(
				"wallet_auxiliary_fields",
				JSON.stringify(clampFields(input.auxiliaryFields, "auxiliary")),
			);
		if (input.backFields !== undefined)
			push("wallet_back_fields", JSON.stringify(clampFields(input.backFields, "back")));
		if (input.relevantDate !== undefined) push("wallet_relevant_date", input.relevantDate);
		if (input.locations !== undefined)
			push(
				"wallet_locations",
				JSON.stringify(
					input.locations.slice(0, PASS_LOCATION_LIMIT).map((l) => ({
						...l,
						relevantText: l.relevantText ? stripHtml(l.relevantText) : l.relevantText,
					})),
				),
			);

		await runBatch(updates.map(({ key, value }) => walletUpsert(key, value)));
		await logAudit("wallet.updateConfig", "wallet");
		return { success: true };
	}),

	getSigningStatus: protectedProcedure.query(async () => {
		const settingsMap = await buildSettingsMap();
		// The pass route reads `setting || env`, so a stored value shadows env:
		// report the effective value as OK only when the signer can load it.
		return {
			signerCert: usable(
				settingsMap.wallet_signer_cert || env.WALLET_SIGNER_CERT,
				isCertificateMaterial,
			),
			signerKey: usable(
				settingsMap.wallet_signer_key || env.WALLET_SIGNER_KEY,
				isPrivateKeyMaterial,
			),
			wwdrCert: usable(settingsMap.wallet_wwdr_cert || env.WALLET_WWDR_CERT, isCertificateMaterial),
			teamId: !!settingsMap.wallet_team_id || !!env.WALLET_TEAM_ID,
			passTypeId: !!settingsMap.wallet_pass_type_id || !!env.WALLET_PASS_TYPE_ID,
			source: {
				signerCert: settingsMap.wallet_signer_cert
					? "settings"
					: env.WALLET_SIGNER_CERT
						? "env"
						: "missing",
				signerKey: settingsMap.wallet_signer_key
					? "settings"
					: env.WALLET_SIGNER_KEY
						? "env"
						: "missing",
				wwdrCert: settingsMap.wallet_wwdr_cert
					? "settings"
					: env.WALLET_WWDR_CERT
						? "env"
						: "missing",
				teamId: settingsMap.wallet_team_id ? "settings" : env.WALLET_TEAM_ID ? "env" : "missing",
				passTypeId: settingsMap.wallet_pass_type_id
					? "settings"
					: env.WALLET_PASS_TYPE_ID
						? "env"
						: "missing",
			},
		};
	}),

	getSigningKeys: protectedProcedure.query(async () => {
		const settingsMap = await buildSettingsMap();
		return {
			hasSignerCert: !!settingsMap.wallet_signer_cert,
			hasSignerKey: !!settingsMap.wallet_signer_key,
			hasWwdrCert: !!settingsMap.wallet_wwdr_cert,
			teamId: settingsMap.wallet_team_id || "",
			passTypeId: settingsMap.wallet_pass_type_id || "",
		};
	}),

	updateSigningKeys: protectedProcedure
		.input(walletSigningKeysSchema)
		.mutation(async ({ input }) => {
			const updates: { key: string; value: string }[] = [];
			if (input.teamId !== undefined) updates.push({ key: "wallet_team_id", value: input.teamId });
			if (input.passTypeId !== undefined)
				updates.push({ key: "wallet_pass_type_id", value: input.passTypeId });
			// The admin form base64-wraps uploads and pastes; store what the signer
			// reads (raw PEM / base64 DER) and refuse material it can never load,
			// rather than saving it and reporting green.
			for (const { field, key, label, check } of SIGNING_MATERIAL) {
				const raw = input[field];
				if (raw === undefined) continue;
				const value = normalizeSigningMaterial(raw);
				if (value !== "" && !check(value)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							field === "signerKey"
								? `${label} must be an unencrypted or passphrase-protected RSA private key in PEM format`
								: `${label} must be a PEM or DER X.509 certificate`,
					});
				}
				updates.push({ key, value });
			}

			await runBatch(updates.map(({ key, value }) => walletUpsert(key, value)));
			await logAudit("wallet.updateSigningKeys", "wallet");
			return { success: true };
		}),

	generatePreview: protectedProcedure.query(async () => {
		const [profile] = await db.select().from(user).limit(1);
		const blocks = await db
			.select()
			.from(block)
			.where(eq(block.isEnabled, true))
			.orderBy(asc(block.position));

		const settingsMap = await buildSettingsMap();

		// Same resolution as the signed pass (GET /api/admin/wallet-pass).
		const content = resolvePassContent(settingsMap, profile);
		const showEmail = settingsMap.wallet_show_email !== "false";
		const showName = settingsMap.wallet_show_name !== "false";

		return {
			profile: profile
				? {
						name: profile.name,
						email: profile.email,
						image: profile.image,
					}
				: null,
			links: blocks.filter((b) => b.type === "link").map((b) => ({ title: b.title, url: b.url })),
			qrUrl: null,
			templatePreset: (settingsMap.wallet_template_preset as PassTemplatePreset) || "contact-card",
			organizationName: settingsMap.wallet_organization_name || "",
			passDescription: settingsMap.wallet_pass_description || "",
			backgroundColor: content.backgroundColor,
			foregroundColor: content.foregroundColor,
			labelColor: content.labelColor,
			logoUrl: settingsMap.wallet_logo_url || null,
			iconUrl: settingsMap.wallet_icon_url || null,
			thumbnailUrl: settingsMap.wallet_thumbnail_url || null,
			stripUrl: settingsMap.wallet_strip_url || null,
			headerFields: content.headerFields,
			primaryFields: content.primaryFields,
			secondaryFields: content.secondaryFields,
			auxiliaryFields: content.auxiliaryFields,
			backFields: content.backFields,
			relevantDate: settingsMap.wallet_relevant_date || "",
			locations: parsePassLocationsJson(settingsMap.wallet_locations),
			showEmail,
			showName,
			showQrCode: content.showBarcode,
		};
	}),
});
