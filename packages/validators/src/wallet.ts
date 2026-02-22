import { z } from "zod";

const PassFieldSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().max(100),
  value: z.string().max(500),
});

export const UpdateWalletPassSchema = z.object({
  passTypeId: z.string().max(200).optional(),
  teamId: z.string().max(50).optional(),
  organizationName: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  logoText: z.string().max(100).optional(),
  headerFields: z.array(PassFieldSchema).max(3).optional(),
  primaryFields: z.array(PassFieldSchema).max(2).optional(),
  secondaryFields: z.array(PassFieldSchema).max(4).optional(),
  auxiliaryFields: z.array(PassFieldSchema).max(5).optional(),
  backFields: z.array(PassFieldSchema).max(20).optional(),
  barcodeFormat: z
    .enum([
      "PKBarcodeFormatQR",
      "PKBarcodeFormatPDF417",
      "PKBarcodeFormatAztec",
      "PKBarcodeFormatCode128",
    ])
    .optional(),
  barcodeMessage: z.string().max(2000).optional(),
  barcodeAltText: z.string().max(200).optional(),
  backgroundColor: z.string().max(50).optional(),
  foregroundColor: z.string().max(50).optional(),
  labelColor: z.string().max(50).optional(),
  logoUrl: z.string().max(2000).optional(),
  iconUrl: z.string().max(2000).optional(),
  stripUrl: z.string().max(2000).optional(),
  thumbnailUrl: z.string().max(2000).optional(),
});

export type UpdateWalletPassInput = z.infer<typeof UpdateWalletPassSchema>;
