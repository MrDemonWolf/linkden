import { z } from "zod";
import { blankable, httpUrlSchema } from "./primitives";

// ─── vCard data ──────────────────────────────────────────────────────────────
// Single schema for the global vCard (settings → vcard_data) shared by the
// vcard router (write), public/server download routes (read), and the admin
// form (inline errors). Every text field is bounded; blanks are sent as
// `undefined` by the client, and an empty url entry is tolerated and skipped.

const text = (max = 100) => z.string().max(max).optional();

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

/**
 * RFC 6350 §3.4 TEXT escaping (backslash, comma, semicolon, newline). Without
 * it a CR/LF in any field starts a new property line, so a crafted value could
 * inject e.g. a falsified TEL into the public .vcf.
 */
export function escapeVcardText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/\r\n|\r|\n/g, "\\n")
		.replace(/,/g, "\\,")
		.replace(/;/g, "\\;");
}

/** URI / email values can't be TEXT-escaped; dropping line breaks keeps them on one line. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, "");

/** A TYPE parameter must be a bare token — `;`, `:` and `,` are delimiters there. */
const typeToken = (label: string) => label.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);

/** `N:` (required by vCard 3.0) from the display name: last word = family, rest = given. */
function structuredName(fullName: string | undefined): string {
	const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
	const family = parts.length > 1 ? (parts.pop() ?? "") : "";
	const given = parts.join(" ");
	return `N:${escapeVcardText(family)};${escapeVcardText(given)};;;`;
}

export function generateVCardString(data: VcardData): string {
	const t = escapeVcardText;
	const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0", structuredName(data.fullName)];

	if (data.fullName) lines.push(`FN:${t(data.fullName)}`);
	if (data.nickname) lines.push(`NICKNAME:${t(data.nickname)}`);
	if (data.birthday) lines.push(`BDAY:${t(data.birthday)}`);
	if (data.org || data.department) {
		lines.push(`ORG:${t(data.org ?? "")}${data.department ? `;${t(data.department)}` : ""}`);
	}
	if (data.title) lines.push(`TITLE:${t(data.title)}`);
	if (data.email) lines.push(`EMAIL;TYPE=HOME:${oneLine(data.email)}`);
	if (data.workEmail) lines.push(`EMAIL;TYPE=WORK:${oneLine(data.workEmail)}`);
	if (data.phone) lines.push(`TEL;TYPE=HOME:${t(data.phone)}`);
	if (data.workPhone) lines.push(`TEL;TYPE=WORK:${t(data.workPhone)}`);
	if (data.address) lines.push(`ADR;TYPE=HOME:;;${t(data.address)};;;;`);
	if (data.photo) lines.push(`PHOTO;VALUE=uri:${oneLine(data.photo)}`);
	if (data.urls) {
		for (const u of data.urls) {
			if (!u.url) continue;
			const type = typeToken(u.label);
			lines.push(`URL${type ? `;TYPE=${type}` : ""}:${oneLine(u.url)}`);
		}
	}

	lines.push("END:VCARD");
	return lines.join("\r\n");
}

export function safeParseVcardData(value?: string | null): VcardData {
	if (!value) return {};
	try {
		const parsed = JSON.parse(value);
		const result = vcardDataSchema.safeParse(parsed);
		return result.success ? result.data : {};
	} catch {
		return {};
	}
}

/** Enough to be worth saving as a contact. */
export function hasVcardContent(data: VcardData): boolean {
	return !!(
		data.fullName ||
		data.org ||
		data.email ||
		data.workEmail ||
		data.phone ||
		data.workPhone
	);
}
