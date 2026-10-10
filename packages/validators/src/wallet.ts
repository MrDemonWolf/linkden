import { z } from "zod";
import { hexColorSchema, httpUrlSchema } from "./blocks";

/** Empty string means "cleared" — the admin sends "" when a field is blanked. */
const blankable = <T extends z.ZodType>(schema: T) => schema.optional().or(z.literal(""));

/** PEM certificates / keys pasted into the signing form. */
export const PEM_MAX_LENGTH = 20_000;

export const PASS_TEMPLATE_PRESETS = [
	"contact-card",
	"member-card",
	"access-pass",
	"custom",
] as const;
export type PassTemplatePreset = (typeof PASS_TEMPLATE_PRESETS)[number];

export const passFieldSchema = z.object({
	key: z.string().min(1).max(64),
	label: z.string().max(40),
	value: z.string().max(200),
});
export type PassField = z.infer<typeof passFieldSchema>;

// Context-aware relevance: Wallet surfaces the pass on the Lock Screen near
// these coordinates or around relevantDate. Apple allows up to 10 locations.
export const PASS_LOCATION_LIMIT = 10;
export const passLocationSchema = z.object({
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
	relevantText: z.string().max(100).optional().or(z.literal("")),
});
export type PassLocation = z.infer<typeof passLocationSchema>;

// HIG: generic style field counts
export const PASS_FIELD_LIMITS = {
	header: 3,
	primary: 1,
	secondary: 4,
	auxiliary: 4,
	back: 20,
} as const;

const FIELD_KEY_MAX = 64;
const FIELD_LABEL_MAX = 40;
const FIELD_VALUE_MAX = 200;
const LOCATION_TEXT_MAX = 100;

/**
 * Lenient parse of a stored pass-fields JSON string into validated PassFields.
 * Shared by the wallet router and the .pkpass generator so the shape checks and
 * length clamps live in one place. Values are assumed already HTML-sanitized on
 * write; malformed input yields an empty array rather than throwing. Pass the
 * section's PASS_FIELD_LIMITS entry as `max` to cap the field count too.
 */
export function parsePassFieldsJson(
	raw: string | null | undefined,
	max: number = Number.POSITIVE_INFINITY,
): PassField[] {
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
			.slice(0, max)
			.map((f) => ({
				key: f.key.slice(0, FIELD_KEY_MAX),
				label: f.label.slice(0, FIELD_LABEL_MAX),
				value: f.value.slice(0, FIELD_VALUE_MAX),
			}));
	} catch {
		return [];
	}
}

/** Lenient parse of a stored pass-locations JSON string, capped at PASS_LOCATION_LIMIT. */
export function parsePassLocationsJson(raw: string | null | undefined): PassLocation[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return (
			parsed
				// Finite and in range: `1e999` parses to Infinity and would serialize
				// as null in pass.json, which Wallet refuses.
				.filter(
					(l): l is PassLocation =>
						l &&
						Number.isFinite(l.latitude) &&
						Number.isFinite(l.longitude) &&
						Math.abs(l.latitude) <= 90 &&
						Math.abs(l.longitude) <= 180,
				)
				.slice(0, PASS_LOCATION_LIMIT)
				.map((l) => ({
					latitude: l.latitude,
					longitude: l.longitude,
					relevantText: String(l.relevantText ?? "").slice(0, LOCATION_TEXT_MAX),
				}))
		);
	} catch {
		return [];
	}
}

// ─── Pass content ───────────────────────────────────────────────────────────
// What a pass shows, resolved from the wallet_* settings + the admin profile.
// The signed .pkpass (GET /api/admin/wallet-pass) and the builder preview
// (wallet.generatePreview) both go through resolvePassContent, so the preview
// can't drift from what Wallet renders.

/** Colours and issuer name a pass falls back to when the setting is blank. */
export const WALLET_DEFAULTS = {
	backgroundColor: "#091533",
	foregroundColor: "#FFFFFF",
	labelColor: "#0FACED",
	organizationName: "LinkDen",
} as const;

export interface PassProfile {
	name?: string | null;
	email?: string | null;
}

export interface ResolvedPassContent {
	headerFields: PassField[];
	primaryFields: PassField[];
	secondaryFields: PassField[];
	auxiliaryFields: PassField[];
	backFields: PassField[];
	backgroundColor: string;
	foregroundColor: string;
	labelColor: string;
	organizationName: string;
	description: string;
	/** Draw the QR barcode (wallet_show_qr_code, default on). */
	showBarcode: boolean;
}

/**
 * Resolve the pass content. Each section is capped at its PASS_FIELD_LIMITS
 * entry. An empty primary/secondary section falls back to the profile name /
 * email when the matching show toggle is on (default) and the value exists.
 */
export function resolvePassContent(
	settings: Partial<Record<string, string>>,
	profile: PassProfile | null | undefined,
): ResolvedPassContent {
	const section = (key: string, name: keyof typeof PASS_FIELD_LIMITS) =>
		parsePassFieldsJson(settings[key], PASS_FIELD_LIMITS[name]);
	const showName = settings.wallet_show_name !== "false";
	const showEmail = settings.wallet_show_email !== "false";
	const name = profile?.name || "";
	const email = profile?.email || "";

	const primaryStored = section("wallet_primary_fields", "primary");
	const secondaryStored = section("wallet_secondary_fields", "secondary");

	return {
		headerFields: section("wallet_header_fields", "header"),
		primaryFields:
			primaryStored.length > 0
				? primaryStored
				: showName && name
					? [{ key: "name", label: "Name", value: name }]
					: [],
		secondaryFields:
			secondaryStored.length > 0
				? secondaryStored
				: showEmail && email
					? [{ key: "email", label: "Email", value: email }]
					: [],
		auxiliaryFields: section("wallet_auxiliary_fields", "auxiliary"),
		backFields: section("wallet_back_fields", "back"),
		backgroundColor: settings.wallet_background_color || WALLET_DEFAULTS.backgroundColor,
		foregroundColor: settings.wallet_foreground_color || WALLET_DEFAULTS.foregroundColor,
		labelColor: settings.wallet_label_color || WALLET_DEFAULTS.labelColor,
		organizationName: settings.wallet_organization_name || WALLET_DEFAULTS.organizationName,
		description:
			settings.wallet_pass_description || (name ? `${name} — contact card` : "Contact card"),
		showBarcode: settings.wallet_show_qr_code !== "false",
	};
}

/**
 * A stored relevantDate as the ISO string pass.json needs, or null. Writes are
 * validated (relevantDateSchema); this guards legacy rows Wallet would reject.
 */
export function normalizeRelevantDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/**
 * `wallet_relevant_date`: a UTC/offset ISO datetime (what the builder's
 * localToIso writes) or "" for none. Wallet rejects a pass with a malformed date.
 */
export const relevantDateSchema = z.iso.datetime({ offset: true }).max(40).or(z.literal(""));

/** Per-section stored-array schemas — shared with the settings registry's opaque-key checks. */
export const passFieldsSchemaFor = (section: keyof typeof PASS_FIELD_LIMITS) =>
	z.array(passFieldSchema).max(PASS_FIELD_LIMITS[section]);
export const passLocationsSchema = z.array(passLocationSchema).max(PASS_LOCATION_LIMIT);

const headerFieldsSchema = z
	.array(passFieldSchema)
	.max(PASS_FIELD_LIMITS.header, `At most ${PASS_FIELD_LIMITS.header} header fields`);
const primaryFieldsSchema = z
	.array(passFieldSchema)
	.max(PASS_FIELD_LIMITS.primary, `At most ${PASS_FIELD_LIMITS.primary} primary field`);
const secondaryFieldsSchema = z
	.array(passFieldSchema)
	.max(PASS_FIELD_LIMITS.secondary, `At most ${PASS_FIELD_LIMITS.secondary} secondary fields`);
const auxiliaryFieldsSchema = z
	.array(passFieldSchema)
	.max(PASS_FIELD_LIMITS.auxiliary, `At most ${PASS_FIELD_LIMITS.auxiliary} auxiliary fields`);
const backFieldsSchema = z
	.array(passFieldSchema)
	.max(PASS_FIELD_LIMITS.back, `At most ${PASS_FIELD_LIMITS.back} back fields`);

export const walletConfigSchema = z.object({
	enabled: z.boolean().optional(),
	showEmail: z.boolean().optional(),
	showName: z.boolean().optional(),
	showQrCode: z.boolean().optional(),
	templatePreset: z.enum(PASS_TEMPLATE_PRESETS).optional(),
	organizationName: z.string().max(100).optional(),
	passDescription: z.string().max(200).optional(),
	backgroundColor: blankable(hexColorSchema),
	foregroundColor: blankable(hexColorSchema),
	labelColor: blankable(hexColorSchema),
	logoUrl: blankable(httpUrlSchema),
	iconUrl: blankable(httpUrlSchema),
	thumbnailUrl: blankable(httpUrlSchema),
	stripUrl: blankable(httpUrlSchema),
	headerFields: headerFieldsSchema.optional(),
	primaryFields: primaryFieldsSchema.optional(),
	secondaryFields: secondaryFieldsSchema.optional(),
	auxiliaryFields: auxiliaryFieldsSchema.optional(),
	backFields: backFieldsSchema.optional(),
	relevantDate: relevantDateSchema.optional(),
	locations: z.array(passLocationSchema).max(PASS_LOCATION_LIMIT).optional(),
});
export type WalletConfig = z.infer<typeof walletConfigSchema>;

// ─── Signing material ───────────────────────────────────────────────────────
// The admin form base64-encodes whatever it gets (file upload via
// readAsDataURL, or btoa of pasted text), while the .pkpass signer reads raw
// PEM (or base64 DER for certificates). normalizeSigningMaterial unwraps the
// form's encoding; the is* checks are a structural gate so material that can
// never sign a pass is rejected at write time instead of showing green.

const PEM_BEGIN = "-----BEGIN";

/** atob as a binary string, or null when the input isn't base64. */
function decodeBase64(value: string): string | null {
	try {
		return atob(value);
	} catch {
		return null;
	}
}

/**
 * Normalize uploaded/pasted signing material to what the signer reads: raw
 * PEM is kept as is, base64-wrapped PEM is unwrapped, anything else (base64
 * DER) is returned with whitespace removed. "" stays "" (clears the value).
 */
export function normalizeSigningMaterial(value: string): string {
	const trimmed = value.trim();
	if (trimmed === "" || trimmed.includes(PEM_BEGIN)) return trimmed;
	const compact = trimmed.replace(/\s+/g, "");
	const decoded = decodeBase64(compact);
	if (decoded?.includes(PEM_BEGIN)) return decoded.trim();
	return compact;
}

/** A PEM certificate, or base64 DER that starts with an ASN.1 SEQUENCE. */
export function isCertificateMaterial(value: string): boolean {
	if (value.includes(PEM_BEGIN)) {
		return /-----BEGIN CERTIFICATE-----[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----/.test(value);
	}
	const der = decodeBase64(value);
	return der !== null && der.length > 64 && der.charCodeAt(0) === 0x30;
}

/**
 * A PEM RSA private key the signer can load: PKCS#1, PKCS#8, or an encrypted
 * key (decrypted with WALLET_SIGNER_KEY_PASSPHRASE). EC keys and PKCS#12
 * bundles are not supported by the signer, so they are rejected here.
 */
export function isPrivateKeyMaterial(value: string): boolean {
	return /-----BEGIN (RSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]+-----END \1PRIVATE KEY-----/.test(
		value,
	);
}

/** wallet.updateSigningKeys input — PEM blobs are bounded, ids are short. */
export const walletSigningKeysSchema = z.object({
	teamId: z.string().max(20).optional(),
	passTypeId: z.string().max(100).optional(),
	signerCert: z.string().max(PEM_MAX_LENGTH).optional(),
	signerKey: z.string().max(PEM_MAX_LENGTH).optional(),
	wwdrCert: z.string().max(PEM_MAX_LENGTH).optional(),
});
export type WalletSigningKeys = z.infer<typeof walletSigningKeysSchema>;

export interface PresetSeed {
	templatePreset: PassTemplatePreset;
	headerFields: PassField[];
	primaryFields: PassField[];
	secondaryFields: PassField[];
	auxiliaryFields: PassField[];
	backFields: PassField[];
}

export function seedFromPreset(preset: PassTemplatePreset): PresetSeed {
	switch (preset) {
		case "member-card":
			return {
				templatePreset: preset,
				headerFields: [{ key: "tier", label: "Tier", value: "Member" }],
				primaryFields: [{ key: "name", label: "Member", value: "" }],
				secondaryFields: [
					{ key: "memberNo", label: "Member No.", value: "" },
					{ key: "since", label: "Since", value: "" },
				],
				auxiliaryFields: [],
				backFields: [
					{ key: "terms", label: "Terms", value: "Membership subject to terms and conditions." },
				],
			};
		case "access-pass":
			return {
				templatePreset: preset,
				headerFields: [{ key: "level", label: "Access", value: "All Areas" }],
				primaryFields: [{ key: "name", label: "Holder", value: "" }],
				secondaryFields: [
					{ key: "validFrom", label: "Valid From", value: "" },
					{ key: "validTo", label: "Valid To", value: "" },
				],
				auxiliaryFields: [{ key: "zone", label: "Zone", value: "" }],
				backFields: [{ key: "rules", label: "Rules", value: "Pass must be presented on entry." }],
			};
		case "custom":
			return {
				templatePreset: preset,
				headerFields: [],
				primaryFields: [],
				secondaryFields: [],
				auxiliaryFields: [],
				backFields: [],
			};
		default:
			return {
				templatePreset: "contact-card",
				headerFields: [{ key: "type", label: "Profile", value: "LinkDen" }],
				primaryFields: [{ key: "name", label: "Name", value: "" }],
				secondaryFields: [{ key: "email", label: "Email", value: "" }],
				auxiliaryFields: [],
				backFields: [
					{ key: "about", label: "About", value: "" },
					{ key: "links", label: "Links", value: "" },
				],
			};
	}
}
