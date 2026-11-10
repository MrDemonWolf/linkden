import { z } from "zod";

// ─── Shared primitives ──────────────────────────────────────────────────────
// Kept in their own module so blocks.ts and vcard.ts can both import them
// without a circular dependency (blocks derives the vcard block config from
// vcardDataSchema, and vcard needs the URL primitive).

export const httpUrlSchema = z.url({ protocol: /^https?$/ }).max(2048);

/**
 * An uploaded image as stored: the origin-relative path `POST /api/upload`
 * returns (`/api/images/<purpose>/<id>.<ext>`), so saved images survive a move
 * to another origin. Same shape the API serves (`SERVABLE_KEY` in
 * apps/server/src/lib/upload-validation.ts, which a test keeps in step).
 */
export const UPLOADED_IMAGE_PATH =
	/^\/api\/images\/[a-z_]+\/[a-z0-9-]+\.(?:jpg|jpeg|png|gif|webp|ico)$/i;

/** An image field: an uploaded image's path, or an external http(s) URL. */
export const imageUrlSchema = z.union([httpUrlSchema, z.string().regex(UPLOADED_IMAGE_PATH)]);

/** Empty string means "cleared" — the admin sends "" when a field is blanked. */
export const blankable = <T extends z.ZodType>(schema: T) => schema.optional().or(z.literal(""));
