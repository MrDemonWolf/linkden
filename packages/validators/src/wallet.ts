import { z } from "zod";

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const walletConfigSchema = z.object({
	enabled: z.boolean().optional(),
	showEmail: z.boolean().optional(),
	showName: z.boolean().optional(),
	showQrCode: z.boolean().optional(),
	organizationName: z.string().max(100).optional(),
	passDescription: z.string().max(200).optional(),
	backgroundColor: z.string().regex(hexColorRegex).optional(),
	foregroundColor: z.string().regex(hexColorRegex).optional(),
	labelColor: z.string().regex(hexColorRegex).optional(),
	logoUrl: z.string().url().optional(),
});

export type WalletConfig = z.infer<typeof walletConfigSchema>;
