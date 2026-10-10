import { db } from "@linkden/db";
import { retentionDeletes } from "@linkden/db/retention";
import { block, siteSettings } from "@linkden/db/schema/index";
import { extractImageKeys } from "./image-keys";
import { logError } from "./log";

// Grace period before an unreferenced R2 object is considered an orphan — avoids
// deleting an image that was just uploaded but not yet saved to a setting/block.
export const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/** Collect every R2 image key still referenced by a setting value or block. */
export async function collectReferencedKeys(): Promise<Set<string>> {
	const settings = await db.select({ value: siteSettings.value }).from(siteSettings);
	const blocks = await db
		.select({
			url: block.url,
			icon: block.icon,
			socialIcons: block.socialIcons,
			config: block.config,
		})
		.from(block);
	const texts: string[] = [];
	for (const s of settings) texts.push(s.value);
	for (const b of blocks) {
		if (b.url) texts.push(b.url);
		if (b.icon) texts.push(b.icon);
		if (b.socialIcons) texts.push(b.socialIcons);
		if (b.config) texts.push(b.config);
	}
	return extractImageKeys(texts);
}

export interface SweepResult {
	deleted: number;
	failed: number;
}

/**
 * Delete R2 images no longer referenced anywhere and older than the grace
 * window. Deletes go out one batch per listed page (R2 takes up to 1000 keys
 * per call) and only count once R2 confirms them.
 */
export async function sweepOrphanImages(bucket: R2Bucket, now: number): Promise<SweepResult> {
	const referenced = await collectReferencedKeys();
	const result: SweepResult = { deleted: 0, failed: 0 };
	let cursor: string | undefined;
	do {
		const listed = await bucket.list({ cursor });
		const orphans = listed.objects
			.filter((obj) => !referenced.has(obj.key) && now - obj.uploaded.getTime() >= ORPHAN_GRACE_MS)
			.map((obj) => obj.key);
		if (orphans.length > 0) {
			try {
				await bucket.delete(orphans);
				result.deleted += orphans.length;
			} catch (e) {
				result.failed += orphans.length;
				logError({ path: "scheduled", step: "orphan-sweep", keys: orphans.length }, e);
			}
		}
		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);
	return result;
}

/**
 * Scheduled maintenance: prune expired analytics / sessions / contacts / audit
 * logs, then sweep orphaned R2 images. Each step runs even if the other fails
 * and logs its own structured error line; if anything failed the promise
 * rejects with an AggregateError so the cron invocation is reported as an
 * exception instead of a silent success.
 */
export async function runScheduledMaintenance(
	bucket: R2Bucket | undefined,
	now: Date = new Date(),
): Promise<void> {
	const errors: unknown[] = [];
	try {
		await db.batch(retentionDeletes(db, now) as unknown as Parameters<typeof db.batch>[0]);
	} catch (e) {
		logError({ path: "scheduled", step: "prune" }, e);
		errors.push(e);
	}
	if (bucket) {
		try {
			const { deleted, failed } = await sweepOrphanImages(bucket, now.getTime());
			if (deleted > 0) {
				console.log(
					JSON.stringify({ level: "info", path: "scheduled", step: "orphan-sweep", deleted }),
				);
			}
			if (failed > 0) errors.push(new Error(`${failed} orphan image delete(s) failed`));
		} catch (e) {
			logError({ path: "scheduled", step: "orphan-sweep" }, e);
			errors.push(e);
		}
	}
	if (errors.length > 0) throw new AggregateError(errors, "Scheduled maintenance failed");
}
