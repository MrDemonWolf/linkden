import { z } from "zod";

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

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

// HIG: generic style field counts
export const PASS_FIELD_LIMITS = {
	header: 3,
	primary: 1,
	secondary: 4,
	auxiliary: 4,
	back: 20,
} as const;

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
	backgroundColor: z.string().regex(hexColorRegex).optional(),
	foregroundColor: z.string().regex(hexColorRegex).optional(),
	labelColor: z.string().regex(hexColorRegex).optional(),
	logoUrl: z.string().url().optional().or(z.literal("")),
	iconUrl: z.string().url().optional().or(z.literal("")),
	thumbnailUrl: z.string().url().optional().or(z.literal("")),
	stripUrl: z.string().url().optional().or(z.literal("")),
	headerFields: headerFieldsSchema.optional(),
	primaryFields: primaryFieldsSchema.optional(),
	secondaryFields: secondaryFieldsSchema.optional(),
	auxiliaryFields: auxiliaryFieldsSchema.optional(),
	backFields: backFieldsSchema.optional(),
});
export type WalletConfig = z.infer<typeof walletConfigSchema>;

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
				backFields: [
					{ key: "rules", label: "Rules", value: "Pass must be presented on entry." },
				],
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
		case "contact-card":
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
