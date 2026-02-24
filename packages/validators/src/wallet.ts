import { z } from "zod";

export const walletConfigSchema = z.object({
  enabled: z.boolean().optional(),
  teamId: z.string().optional(),
  passTypeId: z.string().optional(),
  customQrUrl: z.string().optional(),
});

export type WalletConfig = z.infer<typeof walletConfigSchema>;
