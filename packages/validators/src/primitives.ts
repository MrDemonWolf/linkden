import { z } from "zod";

// ─── Shared primitives ──────────────────────────────────────────────────────
// Kept in their own module so blocks.ts and vcard.ts can both import them
// without a circular dependency (blocks derives the vcard block config from
// vcardDataSchema, and vcard needs the URL primitive).

export const httpUrlSchema = z.url({ protocol: /^https?$/ }).max(2048);

/** Empty string means "cleared" — the admin sends "" when a field is blanked. */
export const blankable = <T extends z.ZodType>(schema: T) => schema.optional().or(z.literal(""));
