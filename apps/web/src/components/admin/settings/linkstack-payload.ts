import { httpUrlSchema } from "@linkden/validators/blocks";

// A LinkStack "Export all data" file is untrusted JSON straight from another
// app's database: `button_id` is a number (a row id in LinkStack's own buttons
// table), `type` is a string, and unset columns are `null`. Sending it raw made
// backup.importLinkStack reject the whole file. The wizard sends only the
// fields the importer uses, as the types it accepts.

export interface LinkStackLinkPayload {
	link: string;
	title?: string;
	button_id?: string;
	order?: number;
}

export interface LinkStackPayload {
	littlelink_name?: string;
	littlelink_description?: string;
	theme?: string;
	links: LinkStackLinkPayload[];
}

export interface PreparedLinkStackImport {
	payload: LinkStackPayload;
	/** Links in the file that have any URL at all. */
	linksFound: number;
	/** Of those, how many the importer drops (only http/https become blocks). */
	linksSkipped: number;
}

type Obj = Record<string, unknown>;

const isObject = (v: unknown): v is Obj => typeof v === "object" && v !== null;

/** A non-blank string, clamped to the importer's bound; anything else (null, numbers) is unset. */
function text(value: unknown, max: number): string | undefined {
	return typeof value === "string" && value.trim() ? value.slice(0, max) : undefined;
}

/** Same shape check as the server's transformer: LinkStack profile keys plus a links array. */
export function isLinkStackExport(data: unknown): data is Obj & { links: unknown[] } {
	if (!isObject(data)) return false;
	return (
		("littlelink_name" in data || "littlelink_description" in data) && Array.isArray(data.links)
	);
}

export function prepareLinkStackImport(raw: Obj & { links: unknown[] }): PreparedLinkStackImport {
	const withUrl = raw.links
		.filter(isObject)
		.map((row) => ({ row, link: typeof row.link === "string" ? row.link.trim() : "" }))
		.filter((l) => l.link !== "");
	const importable = withUrl.filter((l) => httpUrlSchema.safeParse(l.link).success);

	return {
		payload: {
			littlelink_name: text(raw.littlelink_name, 100),
			littlelink_description: text(raw.littlelink_description, 1000),
			theme: text(raw.theme, 2000),
			links: importable.map(({ row, link }) => ({
				link,
				title: text(row.title, 200),
				// A numeric id names a row in LinkStack's buttons table, not a network;
				// only a string id ("github") can be mapped to an icon.
				button_id: text(row.button_id, 100),
				order: typeof row.order === "number" && Number.isFinite(row.order) ? row.order : undefined,
			})),
		},
		linksFound: withUrl.length,
		linksSkipped: withUrl.length - importable.length,
	};
}
