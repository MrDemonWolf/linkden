import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings, block, user } from "@linkden/db/schema/index";
import { eq, asc } from "drizzle-orm";
import { env } from "@linkden/env/server";
import { z } from "zod";
import { stripHtml } from "../utils/sanitize";
import { buildSettingsMap, runBatch, settingUpsertStmt } from "../utils/settings";
import { maskSecret, WALLET_SETTING_KEYS } from "@linkden/validators/settings-registry";
import {
	passFieldSchema,
	passLocationSchema,
	seedFromPreset,
	PASS_TEMPLATE_PRESETS,
	PASS_FIELD_LIMITS,
	PASS_LOCATION_LIMIT,
	type PassField,
	type PassLocation,
	type PassTemplatePreset,
} from "@linkden/validators/wallet";

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const walletKeys: readonly string[] = WALLET_SETTING_KEYS;

function parseFields(raw: string | undefined): PassField[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(
				(f): f is PassField =>
					typeof f === "object" &&
					f !== null &&
					typeof f.key === "string" &&
					typeof f.label === "string" &&
					typeof f.value === "string",
			)
			.map((f) => ({
				key: f.key.slice(0, 64),
				label: f.label.slice(0, 40),
				value: f.value.slice(0, 200),
			}));
	} catch {
		return [];
	}
}

function parseLocations(raw: string | undefined): PassLocation[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(
				(l): l is PassLocation =>
					l && typeof l.latitude === "number" && typeof l.longitude === "number",
			)
			.slice(0, PASS_LOCATION_LIMIT)
			.map((l) => ({
				latitude: l.latitude,
				longitude: l.longitude,
				relevantText: stripHtml(String(l.relevantText ?? "")).slice(0, 100),
			}));
	} catch {
		return [];
	}
}

function clampFields(fields: PassField[], max: number): PassField[] {
	return fields.slice(0, max).map((f) => ({
		key: stripHtml(f.key).slice(0, 64),
		label: stripHtml(f.label).slice(0, 40),
		value: stripHtml(f.value).slice(0, 200),
	}));
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

	updateConfig: protectedProcedure
		.input(
			z.object({
				enabled: z.boolean().optional(),
				showEmail: z.boolean().optional(),
				showName: z.boolean().optional(),
				showQrCode: z.boolean().optional(),
				templatePreset: z.enum(PASS_TEMPLATE_PRESETS).optional(),
				organizationName: z.string().max(100).optional(),
				passDescription: z.string().max(200).optional(),
				backgroundColor: z.string().regex(hexColorRegex).optional().or(z.literal("")),
				foregroundColor: z.string().regex(hexColorRegex).optional().or(z.literal("")),
				labelColor: z.string().regex(hexColorRegex).optional().or(z.literal("")),
				logoUrl: z.string().url().optional().or(z.literal("")),
				iconUrl: z.string().url().optional().or(z.literal("")),
				thumbnailUrl: z.string().url().optional().or(z.literal("")),
				stripUrl: z.string().url().optional().or(z.literal("")),
				headerFields: z.array(passFieldSchema).max(PASS_FIELD_LIMITS.header).optional(),
				primaryFields: z.array(passFieldSchema).max(PASS_FIELD_LIMITS.primary).optional(),
				secondaryFields: z.array(passFieldSchema).max(PASS_FIELD_LIMITS.secondary).optional(),
				auxiliaryFields: z.array(passFieldSchema).max(PASS_FIELD_LIMITS.auxiliary).optional(),
				backFields: z.array(passFieldSchema).max(PASS_FIELD_LIMITS.back).optional(),
				relevantDate: z.string().max(40).optional().or(z.literal("")),
				locations: z.array(passLocationSchema).max(PASS_LOCATION_LIMIT).optional(),
			}),
		)
		.mutation(async ({ input }) => {
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
			if (input.backgroundColor !== undefined)
				push("wallet_background_color", input.backgroundColor);
			if (input.foregroundColor !== undefined)
				push("wallet_foreground_color", input.foregroundColor);
			if (input.labelColor !== undefined) push("wallet_label_color", input.labelColor);
			if (input.logoUrl !== undefined) push("wallet_logo_url", input.logoUrl);
			if (input.iconUrl !== undefined) push("wallet_icon_url", input.iconUrl);
			if (input.thumbnailUrl !== undefined) push("wallet_thumbnail_url", input.thumbnailUrl);
			if (input.stripUrl !== undefined) push("wallet_strip_url", input.stripUrl);
			if (input.headerFields !== undefined)
				push(
					"wallet_header_fields",
					JSON.stringify(clampFields(input.headerFields, PASS_FIELD_LIMITS.header)),
				);
			if (input.primaryFields !== undefined)
				push(
					"wallet_primary_fields",
					JSON.stringify(clampFields(input.primaryFields, PASS_FIELD_LIMITS.primary)),
				);
			if (input.secondaryFields !== undefined)
				push(
					"wallet_secondary_fields",
					JSON.stringify(clampFields(input.secondaryFields, PASS_FIELD_LIMITS.secondary)),
				);
			if (input.auxiliaryFields !== undefined)
				push(
					"wallet_auxiliary_fields",
					JSON.stringify(clampFields(input.auxiliaryFields, PASS_FIELD_LIMITS.auxiliary)),
				);
			if (input.backFields !== undefined)
				push(
					"wallet_back_fields",
					JSON.stringify(clampFields(input.backFields, PASS_FIELD_LIMITS.back)),
				);
			if (input.relevantDate !== undefined) push("wallet_relevant_date", input.relevantDate);
			if (input.locations !== undefined)
				push("wallet_locations", JSON.stringify(input.locations.slice(0, PASS_LOCATION_LIMIT)));

			await runBatch(updates.map(({ key, value }) => settingUpsertStmt(key, value)));
			return { success: true };
		}),

	applyPreset: protectedProcedure
		.input(z.object({ preset: z.enum(PASS_TEMPLATE_PRESETS) }))
		.mutation(async ({ input }) => {
			const seed = seedFromPreset(input.preset as PassTemplatePreset);
			await runBatch([
				settingUpsertStmt("wallet_template_preset", seed.templatePreset),
				settingUpsertStmt("wallet_header_fields", JSON.stringify(seed.headerFields)),
				settingUpsertStmt("wallet_primary_fields", JSON.stringify(seed.primaryFields)),
				settingUpsertStmt("wallet_secondary_fields", JSON.stringify(seed.secondaryFields)),
				settingUpsertStmt("wallet_auxiliary_fields", JSON.stringify(seed.auxiliaryFields)),
				settingUpsertStmt("wallet_back_fields", JSON.stringify(seed.backFields)),
			]);
			return { success: true, seed };
		}),

	getSigningStatus: protectedProcedure.query(async () => {
		const settingsMap = await buildSettingsMap();
		return {
			signerCert: !!settingsMap.wallet_signer_cert || !!env.WALLET_SIGNER_CERT,
			signerKey: !!settingsMap.wallet_signer_key || !!env.WALLET_SIGNER_KEY,
			wwdrCert: !!settingsMap.wallet_wwdr_cert || !!env.WALLET_WWDR_CERT,
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
			if (input.teamId !== undefined) updates.push({ key: "wallet_team_id", value: input.teamId });
			if (input.passTypeId !== undefined)
				updates.push({ key: "wallet_pass_type_id", value: input.passTypeId });
			if (input.signerCert !== undefined)
				updates.push({ key: "wallet_signer_cert", value: input.signerCert });
			if (input.signerKey !== undefined)
				updates.push({ key: "wallet_signer_key", value: input.signerKey });
			if (input.wwdrCert !== undefined)
				updates.push({ key: "wallet_wwdr_cert", value: input.wwdrCert });

			await runBatch(updates.map(({ key, value }) => settingUpsertStmt(key, value)));
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

		// Backwards-compat: if new field arrays empty, derive from old toggles + profile
		const headerFields = parseFields(settingsMap.wallet_header_fields);
		const primaryFieldsStored = parseFields(settingsMap.wallet_primary_fields);
		const secondaryFieldsStored = parseFields(settingsMap.wallet_secondary_fields);
		const auxiliaryFields = parseFields(settingsMap.wallet_auxiliary_fields);
		const backFields = parseFields(settingsMap.wallet_back_fields);

		const showEmail = settingsMap.wallet_show_email !== "false";
		const showName = settingsMap.wallet_show_name !== "false";

		const primaryFields =
			primaryFieldsStored.length > 0
				? primaryFieldsStored
				: showName
					? [{ key: "name", label: "Name", value: profile?.name ?? "" }]
					: [];

		const secondaryFields =
			secondaryFieldsStored.length > 0
				? secondaryFieldsStored
				: showEmail && profile?.email
					? [{ key: "email", label: "Email", value: profile.email }]
					: [];

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
			backgroundColor: settingsMap.wallet_background_color || "#091533",
			foregroundColor: settingsMap.wallet_foreground_color || "#FFFFFF",
			labelColor: settingsMap.wallet_label_color || "#0FACED",
			logoUrl: settingsMap.wallet_logo_url || null,
			iconUrl: settingsMap.wallet_icon_url || null,
			thumbnailUrl: settingsMap.wallet_thumbnail_url || null,
			stripUrl: settingsMap.wallet_strip_url || null,
			headerFields,
			primaryFields,
			secondaryFields,
			auxiliaryFields,
			backFields,
			relevantDate: settingsMap.wallet_relevant_date || "",
			locations: parseLocations(settingsMap.wallet_locations),
			showEmail,
			showName,
			showQrCode: settingsMap.wallet_show_qr_code !== "false",
		};
	}),
});
