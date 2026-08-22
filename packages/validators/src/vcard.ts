import { z } from "zod";
import { httpUrlSchema } from "./blocks";

// ─── vCard data ──────────────────────────────────────────────────────────────
// Single schema for the global vCard (settings → vcard_data) shared by the
// vcard router (write), public/server download routes (read), and the admin
// form (inline errors). Every text field is bounded; blanks are sent as
// `undefined` by the client, and an empty url entry is tolerated and skipped.

const text = (max = 100) => z.string().max(max).optional();
const blankable = <T extends z.ZodType>(schema: T) => schema.optional().or(z.literal(""));

export const vcardUrlEntrySchema = z.object({
	label: z.string().max(40),
	/** "" is tolerated (an unfilled row) and skipped when the vCard is generated. */
	url: httpUrlSchema.or(z.literal("")),
});

export const vcardDataSchema = z.object({
	fullName: text(),
	nickname: text(),
	birthday: text(10),
	photo: blankable(httpUrlSchema),
	org: text(),
	title: text(),
	department: text(),
	workEmail: blankable(z.email().max(254)),
	workPhone: text(40),
	email: blankable(z.email().max(254)),
	phone: text(40),
	address: text(300),
	urls: z.array(vcardUrlEntrySchema).max(20).optional(),
});

export type VcardData = z.infer<typeof vcardDataSchema>;
export type VcardUrlEntry = z.infer<typeof vcardUrlEntrySchema>;
