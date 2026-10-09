import { db } from "@linkden/db";
import { block, contactSubmission, siteSettings, socialNetwork } from "@linkden/db/schema/index";
import {
	blockImportSchema,
	type ContactSubmissionImport,
	contactSubmissionImportSchema,
	MAX_BACKUP_CONTACTS,
	MAX_BLOCKS,
	MAX_IMPORT_CONTACTS,
	socialNetworkImportSchema,
	socialNetworkUpdateSchema,
	type ValidBlockImport,
	validateBlockImport,
} from "@linkden/validators";
import {
	getSettingMeta,
	MAX_SETTING_VALUE_LENGTH,
	SECRET_SETTING_KEYS,
	shouldBackup,
} from "@linkden/validators/settings-registry";
import { TRPCError } from "@trpc/server";
import { asc, notInArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { transformLinkStackData } from "../utils/linkstack-transformer";
import { stripHtml } from "../utils/sanitize";
import { runBatch, settingUpsertStmt } from "../utils/settings";
import { sanitizeSetting } from "./settings";

// ─── Backup Router ─────────────────────────────────────────────────────────
// Export format is versioned ("1.0") so future migrations can detect and upgrade
// older backups. Import supports two modes:
//   - "replace": the backup becomes the content — rows not in it are removed.
//     Secrets (never exported) and the click history of blocks that survive by
//     id are kept, so restoring an export can't wipe credentials or analytics.
//   - "merge": upserts by primary key, preserving data not in the backup
//
// The wire format is what export really emits (no tRPC transformer, so dates
// arrive as ISO strings). Rows are re-validated one by one and invalid ones are
// skipped and counted rather than failing the whole restore. Array caps bound
// the payload: blocks at MAX_BLOCKS (the page limit), social links at 500, and
// contact messages at MAX_BACKUP_CONTACTS on the wire, of which the newest
// MAX_IMPORT_CONTACTS are written. Older ones are never deleted by a replace
// while the database still holds them; only those missing from it are
// reported as skipped. Settings are capped at MAX_BACKUP_SETTINGS entries;
// unknown keys are skipped.

/** Far above the registry size; older backups may carry retired keys (skipped). */
const MAX_BACKUP_SETTINGS = 500;

/** Same pattern the retention sweep uses to find referenced R2 objects. */
const IMAGE_KEY_RE = /\/api\/images\/([A-Za-z0-9._/-]+)/g;

function referencedImageKeys(texts: (string | null)[]): string[] {
	const keys = new Set<string>();
	for (const text of texts) {
		if (!text) continue;
		for (const m of text.matchAll(IMAGE_KEY_RE)) if (m[1]) keys.add(m[1]);
	}
	return [...keys].sort();
}

/** Insert values for a backup block (title HTML-stripped, like blocks.create). */
function blockValues(b: ValidBlockImport): typeof block.$inferInsert {
	return { ...b, title: b.title === null ? null : stripHtml(b.title), socialIcons: null };
}

function contactValues(c: ContactSubmissionImport): typeof contactSubmission.$inferInsert {
	return {
		id: c.id,
		name: c.name,
		email: c.email,
		message: c.message,
		phone: c.phone ?? null,
		subject: c.subject ?? null,
		company: c.company ?? null,
		whereMet: c.whereMet ?? null,
		rating: c.rating ?? null,
		attending: c.attending ?? null,
		guests: c.guests ?? null,
		blockId: c.blockId ?? null,
		blockTitle: c.blockTitle ?? null,
		isRead: c.isRead ?? false,
		// NOT NULL with a default: omit rather than write null.
		...(c.createdAt ? { createdAt: c.createdAt } : {}),
		...(c.updatedAt ? { updatedAt: c.updatedAt } : {}),
	};
}

export const backupRouter = router({
	export: protectedProcedure.query(async () => {
		const blocks = await db.select().from(block).orderBy(asc(block.position));
		const settings = await db.select().from(siteSettings);
		const socials = await db.select().from(socialNetwork).orderBy(asc(socialNetwork.slug));
		const contacts = await db.select().from(contactSubmission);

		// Secrets (API keys, signing certs) are excluded from backups —
		// credentials should never leave the database. See settings-registry.
		const backedUpSettings: Record<string, string> = {};
		for (const s of settings) {
			if (shouldBackup(s.key)) backedUpSettings[s.key] = s.value;
		}

		await logAudit("backup.export");
		return {
			version: "1.0",
			exportedAt: new Date().toISOString(),
			notes:
				"Uploaded images are not included — only their /api/images/ URLs (listed in `images`). " +
				"Keep the originals: after a reset, unreferenced images are deleted by the next daily cleanup.",
			images: referencedImageKeys([
				...Object.values(backedUpSettings),
				...blocks.flatMap((b) => [b.url, b.icon, b.config]),
			]),
			data: {
				blocks,
				settings: backedUpSettings,
				socialNetworks: socials,
				contactSubmissions: contacts,
			},
		};
	}),

	import: protectedProcedure
		.input(
			z.object({
				mode: z.enum(["merge", "replace"]),
				data: z.object({
					blocks: z.array(blockImportSchema).max(MAX_BLOCKS).optional(),
					settings: z
						.record(z.string().max(100), z.string().max(MAX_SETTING_VALUE_LENGTH))
						.refine((o) => Object.keys(o).length <= MAX_BACKUP_SETTINGS, "Too many settings")
						.optional(),
					socialNetworks: z.array(socialNetworkImportSchema).max(500).optional(),
					contactSubmissions: z
						.array(contactSubmissionImportSchema)
						.max(MAX_BACKUP_CONTACTS)
						.optional(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			const { mode, data } = input;

			// Build the entire import as one transactional batch so a mid-import
			// failure can't leave a half-wiped / half-restored database. Merge uses
			// upsert semantics (no read-then-write), so both modes are atomic.
			const stmts: BatchItem<"sqlite">[] = [];
			let skippedSettings = 0;
			let skippedBlocks = 0;
			let skippedSocials = 0;
			let skippedContacts = 0;

			if (data.blocks) {
				// Same gate as blocks.create (http(s) URLs, icon format, per-type
				// config): the public page renders stored rows verbatim, so a
				// crafted backup must not be able to plant a javascript: href.
				// Retired types are mapped (form → connect) or dropped (social_icons).
				const valid: ValidBlockImport[] = [];
				for (const row of data.blocks) {
					const b = validateBlockImport(row);
					if (b) valid.push(b);
					else skippedBlocks++;
				}

				if (mode === "merge") {
					// Merge keeps rows the backup doesn't mention; the page cap still holds.
					const existing = await db.select({ id: block.id, position: block.position }).from(block);
					const ids = new Set([...existing.map((r) => r.id), ...valid.map((b) => b.id)]);
					if (ids.size > MAX_BLOCKS) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Import would leave ${ids.size} blocks; the limit is ${MAX_BLOCKS}`,
						});
					}
					// Rows already on the page are restored in place. New rows append
					// after the current last block (in backup order) instead of taking
					// positions existing blocks hold and interleaving with them.
					const existingIds = new Set(existing.map((r) => r.id));
					let next = existing.reduce((max, r) => Math.max(max, r.position), -1) + 1;
					const added = valid
						.filter((b) => !existingIds.has(b.id))
						.sort((a, b) => a.position - b.position);
					for (const b of added) b.position = next++;
				} else {
					// Upsert-in-place instead of DELETE-all: link_click rows cascade on
					// block delete, so wiping the table would erase the click history
					// of blocks the backup restores. One bound parameter (a JSON id
					// list) keeps this inside D1's per-statement parameter limit.
					const keep = JSON.stringify(valid.map((b) => b.id));
					stmts.push(
						db.delete(block).where(sql`${block.id} not in (select value from json_each(${keep}))`),
					);
				}

				for (const b of valid) {
					const { id: _id, ...set } = blockValues(b);
					stmts.push(
						db.insert(block).values(blockValues(b)).onConflictDoUpdate({ target: block.id, set }),
					);
				}
			}

			if (data.settings) {
				if (mode === "replace") {
					// Exports never carry secrets, so a replace must not delete them —
					// that would silently break CAPTCHA, email and wallet signing.
					stmts.push(
						db.delete(siteSettings).where(notInArray(siteSettings.key, [...SECRET_SETTING_KEYS])),
					);
				}
				// Run the same registry-driven sanitization pipeline as settings.update —
				// otherwise a crafted backup can plant unvalidated values (e.g. a
				// non-#RRGGBB custom color that downstream inline styling relies on).
				// The registry (not the settings-router whitelist) is the gate so the
				// wallet/vcard keys that export writes round-trip. Sanitization happens
				// while building the batch; the writes still land atomically below.
				for (const [key, value] of Object.entries(data.settings)) {
					// Secrets are skipped symmetrically with export: a crafted backup
					// must not be able to swap in its own email/CAPTCHA credentials.
					if (!getSettingMeta(key) || !shouldBackup(key)) {
						skippedSettings++;
						continue;
					}
					try {
						stmts.push(settingUpsertStmt(key, sanitizeSetting(key, value)));
					} catch {
						// Value failed validation (bad URL/color/enum/JSON shape/…) —
						// skip it rather than aborting the whole restore.
						skippedSettings++;
					}
				}
			}

			if (data.socialNetworks) {
				if (mode === "replace") stmts.push(db.delete(socialNetwork));
				for (const s of data.socialNetworks) {
					const url = s.url || "";
					if (!url) continue;
					const isActive = s.isActive ?? true;
					// Known slug + http(s) URL, as social.updateBulk enforces.
					if (!socialNetworkUpdateSchema.safeParse({ slug: s.slug, url, isActive }).success) {
						skippedSocials++;
						continue;
					}
					// addedAt orders the public icons; keep it so a restore doesn't reshuffle them.
					const set = { url, isActive, ...(s.addedAt ? { addedAt: s.addedAt } : {}) };
					stmts.push(
						db
							.insert(socialNetwork)
							.values({ slug: s.slug, ...set })
							.onConflictDoUpdate({ target: socialNetwork.slug, set }),
					);
				}
			}

			if (data.contactSubmissions) {
				// Newest first, so a file over the per-restore cap keeps recent mail.
				const contacts = [...data.contactSubmissions].sort(
					(a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
				);
				const written = contacts.slice(0, MAX_IMPORT_CONTACTS);
				const overflow = contacts.slice(MAX_IMPORT_CONTACTS);

				if (mode === "replace") {
					// Never wipe the table: only messages the backup doesn't mention at
					// all are removed, so rows past the per-restore cap that are still
					// in the database survive. One bound parameter, as for blocks.
					const keep = JSON.stringify(contacts.map((c) => c.id));
					stmts.push(
						db
							.delete(contactSubmission)
							.where(sql`${contactSubmission.id} not in (select value from json_each(${keep}))`),
					);
				}
				// Only overflow rows that aren't already stored are actually missing.
				if (overflow.length > 0) {
					const overflowIds = JSON.stringify(overflow.map((c) => c.id));
					const present = await db
						.select({ id: contactSubmission.id })
						.from(contactSubmission)
						.where(sql`${contactSubmission.id} in (select value from json_each(${overflowIds}))`);
					const presentIds = new Set(present.map((r) => r.id));
					skippedContacts = overflow.filter((c) => !presentIds.has(c.id)).length;
				}
				for (const c of written) {
					const values = contactValues(c);
					const insert = db.insert(contactSubmission).values(values);
					if (mode === "replace") {
						// The backup is the content: restore its copy (e.g. read state).
						const { id: _id, ...set } = values;
						stmts.push(insert.onConflictDoUpdate({ target: contactSubmission.id, set }));
					} else {
						// Merge keeps the stored copy of a message it already has.
						stmts.push(insert.onConflictDoNothing());
					}
				}
			}

			await runBatch(stmts);
			if (skippedSettings > 0) {
				await logAudit("backup.import.skipped_settings", undefined, undefined, {
					count: skippedSettings,
				});
			}
			if (skippedBlocks > 0 || skippedSocials > 0 || skippedContacts > 0) {
				await logAudit("backup.import.skipped_rows", undefined, undefined, {
					blocks: skippedBlocks,
					socialNetworks: skippedSocials,
					contactSubmissions: skippedContacts,
				});
			}
			await logAudit("backup.import", undefined, undefined, { mode });
			return {
				success: true,
				skipped: {
					blocks: skippedBlocks,
					socialNetworks: skippedSocials,
					settings: skippedSettings,
					contactSubmissions: skippedContacts,
				},
			};
		}),

	importLinkStack: protectedProcedure
		.input(
			z.object({
				// LinkStack's export is untrusted JSON straight from another app's
				// database: bound every string, cap the link list, and accept its
				// nulls / numeric ids (the admin wizard normalizes first; raw
				// clients may not).
				data: z.object({
					name: z.string().max(100).nullish(),
					littlelink_name: z.string().max(100).nullish(),
					littlelink_description: z.string().max(1000).nullish(),
					theme: z.string().max(2000).nullish(),
					profile_image: z.string().max(2048).nullish(),
					links: z
						.array(
							z.object({
								button_id: z.union([z.string().max(100), z.number().int()]).nullish(),
								link: z.string().max(2048).nullish(),
								title: z.string().max(200).nullish(),
								order: z.number().nullish(),
								click_number: z.number().nullish(),
								custom_css: z.string().max(5000).nullish(),
								custom_icon: z.string().max(200).nullish(),
								type: z.union([z.string().max(100), z.number()]).nullish(),
								type_params: z.string().max(2000).nullish(),
							}),
						)
						.max(MAX_BLOCKS)
						.nullish(),
				}),
				options: z.object({
					importLinks: z.boolean(),
					importProfile: z.boolean(),
					importTheme: z.boolean(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			const { data, options } = input;
			const optional = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

			// Imported links append after the current last block.
			const [maxRow] = await db
				.select({ max: sql<number | null>`max(${block.position})` })
				.from(block);
			const startPosition = (maxRow?.max ?? -1) + 1;

			const transformed = transformLinkStackData(
				{
					littlelink_name: optional(data.littlelink_name),
					littlelink_description: optional(data.littlelink_description),
					theme: optional(data.theme),
					links: (data.links ?? []).map((l) => ({
						button_id: l.button_id == null ? undefined : String(l.button_id),
						link: optional(l.link),
						title: optional(l.title),
						order: optional(l.order),
					})),
				},
				{ startPosition },
			);

			let linksImported = 0;
			const stmts: BatchItem<"sqlite">[] = [];

			if (options.importLinks && transformed.blocks.length > 0) {
				const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(block);
				const total = (countRow?.count ?? 0) + transformed.blocks.length;
				if (total > MAX_BLOCKS) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Import would leave ${total} blocks; the limit is ${MAX_BLOCKS}`,
					});
				}
				for (const b of transformed.blocks) {
					stmts.push(db.insert(block).values(b));
				}
				linksImported = transformed.blocks.length;
			}

			// Only keys something reads: profile_name / bio, and theme_preset when the
			// LinkStack theme names a LinkDen preset (anything else is skipped).
			const settingsToImport: Record<string, string> = {};
			if (options.importProfile) {
				if (transformed.settings.display_name) {
					settingsToImport.profile_name = transformed.settings.display_name;
				}
				if (transformed.settings.bio) {
					settingsToImport.bio = transformed.settings.bio;
				}
			}
			if (options.importTheme && transformed.settings.theme_preset) {
				settingsToImport.theme_preset = transformed.settings.theme_preset;
			}
			for (const [key, value] of Object.entries(settingsToImport)) {
				stmts.push(settingUpsertStmt(key, sanitizeSetting(key, value)));
			}
			const settingsUpdated = Object.keys(settingsToImport).length > 0;

			await runBatch(stmts);

			return {
				success: true,
				stats: { linksImported, settingsUpdated },
			};
		}),
});
