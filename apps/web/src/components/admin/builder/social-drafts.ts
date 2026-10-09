import type { SocialNetworkUpdate } from "@linkden/validators/social";
import type { NetworkDraft } from "@/components/admin/social/social-constants";

type Slug = SocialNetworkUpdate["slug"];

/** A saved `social.list` row (only the fields the editor compares). */
export interface SocialRow {
	slug: string;
	url: string;
	isActive: boolean;
}

/**
 * The Social tab's unsaved work, kept as an overlay on the saved rows instead
 * of a full copy of them. Anything the admin didn't touch always reads the
 * latest `social.list` data, so a failed first load, a late refetch or another
 * tab's save can never turn into a write (least of all a delete) on Save.
 */
export interface SocialEdits {
	/** Draft values, only for slugs the admin edited. */
	drafts: Record<string, NetworkDraft>;
	/** Slugs added this session that have no saved row. */
	added: ReadonlySet<string>;
	/** Saved slugs removed with the trash button — the only way to delete one. */
	removed: ReadonlySet<string>;
}

export const NO_SOCIAL_EDITS: SocialEdits = { drafts: {}, added: new Set(), removed: new Set() };

const BLANK: NetworkDraft = { url: "", isActive: false };

/** What the row for `slug` shows: the admin's draft, else the saved row. */
export function effectiveDraft(slug: string, rows: readonly SocialRow[], edits: SocialEdits) {
	const draft = edits.drafts[slug];
	if (draft) return draft;
	const row = rows.find((r) => r.slug === slug);
	return row ? { url: row.url, isActive: row.isActive } : BLANK;
}

/**
 * Listed networks, by membership rather than state: every saved row plus this
 * session's additions, minus removals. Switching one off or clearing its URL
 * keeps it listed (an empty URL is a validation error, not a delete).
 */
export function memberSlugs(
	knownSlugs: readonly Slug[],
	rows: readonly SocialRow[],
	edits: SocialEdits,
): Slug[] {
	const saved = new Set(rows.map((r) => r.slug));
	return knownSlugs.filter(
		(slug) => (saved.has(slug) || edits.added.has(slug)) && !edits.removed.has(slug),
	);
}

/** Listed networks whose URL was cleared — Save is blocked until fixed or removed. */
export function missingUrlSlugs(
	knownSlugs: readonly Slug[],
	rows: readonly SocialRow[],
	edits: SocialEdits,
): Slug[] {
	return memberSlugs(knownSlugs, rows, edits).filter(
		(slug) => !effectiveDraft(slug, rows, edits).url,
	);
}

/** The `social.updateBulk` payload: explicit removals, plus edits that differ from the saved row. */
export function socialChanges(
	knownSlugs: readonly Slug[],
	rows: readonly SocialRow[],
	edits: SocialEdits,
): SocialNetworkUpdate[] {
	const bySlug = new Map(rows.map((r) => [r.slug, r]));
	const members = new Set<string>(memberSlugs(knownSlugs, rows, edits));
	const changes: SocialNetworkUpdate[] = [];
	for (const slug of knownSlugs) {
		const row = bySlug.get(slug);
		if (edits.removed.has(slug)) {
			if (row) changes.push({ slug, url: "", isActive: false });
			continue;
		}
		if (!members.has(slug)) continue;
		const draft = effectiveDraft(slug, rows, edits);
		if (!draft.url) continue;
		if (!row || row.url !== draft.url || row.isActive !== draft.isActive) {
			changes.push({ slug, url: draft.url, isActive: draft.isActive });
		}
	}
	return changes;
}
