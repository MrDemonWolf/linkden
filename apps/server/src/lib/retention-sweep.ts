import { db } from "@linkden/db";
import { retentionDeletes } from "@linkden/db/retention";
import { block, siteSettings } from "@linkden/db/schema/index";
import { extractImageKeys } from "./image-keys";

// Grace period before an unreferenced R2 object is considered an orphan — avoids
// deleting an image that was just uploaded but not yet saved to a setting/block.
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/** Collect every R2 image key still referenced by a setting value or block. */
async function collectReferencedKeys(): Promise<Set<string>> {
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

/** Delete R2 images no longer referenced anywhere and older than the grace window. */
async function sweepOrphanImages(bucket: R2Bucket, now: number): Promise<number> {
	const referenced = await collectReferencedKeys();
	let deleted = 0;
	let cursor: string | undefined;
	do {
		const listed = await bucket.list({ cursor });
		for (const obj of listed.objects) {
			if (referenced.has(obj.key)) continue;
			if (now - obj.uploaded.getTime() < ORPHAN_GRACE_MS) continue;
			await bucket.delete(obj.key).catch(() => {});
			deleted++;
		}
		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);
	return deleted;
}

/**
 * Scheduled maintenance: prune expired analytics / sessions / contacts / audit
 * logs, then sweep orphaned R2 images. Best-effort — errors are logged, never
 * thrown, so one failure doesn't abort the rest.
 */
export async function runScheduledMaintenance(bucket: R2Bucket | undefined): Promise<void> {
	const now = new Date();
	try {
		await db.batch(retentionDeletes(db, now) as unknown as Parameters<typeof db.batch>[0]);
	} catch (e) {
		console.error("[retention] prune failed:", e);
	}
	if (bucket) {
		try {
			const deleted = await sweepOrphanImages(bucket, now.getTime());
			if (deleted > 0) console.log(`[retention] swept ${deleted} orphan image(s)`);
		} catch (e) {
			console.error("[retention] orphan sweep failed:", e);
		}
	}
}
