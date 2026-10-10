import { describe, expect, it } from "vitest";
import {
	effectiveDraft,
	memberSlugs,
	missingUrlSlugs,
	NO_SOCIAL_EDITS,
	type SocialEdits,
	socialChanges,
} from "../social-drafts";

const KNOWN = ["github", "instagram", "x"] as const;
const rows = [
	{ slug: "github", url: "https://github.com/me", isActive: true },
	{ slug: "x", url: "https://x.com/me", isActive: true },
];
const edit = (patch: Partial<SocialEdits>): SocialEdits => ({ ...NO_SOCIAL_EDITS, ...patch });

describe("social drafts", () => {
	it("never turns a failed or late load into a write", () => {
		// First load failed: nothing to show, nothing to save.
		expect(socialChanges(KNOWN, [], NO_SOCIAL_EDITS)).toEqual([]);
		// The retry succeeds: the saved rows are what's shown, still nothing to save.
		expect(socialChanges(KNOWN, rows, NO_SOCIAL_EDITS)).toEqual([]);
		expect(memberSlugs(KNOWN, rows, NO_SOCIAL_EDITS)).toEqual(["github", "x"]);
		// Another tab changed a row this tab never touched: still not a change.
		const newer = [{ ...rows[0], url: "https://github.com/new" }, rows[1]];
		expect(socialChanges(KNOWN, newer, NO_SOCIAL_EDITS)).toEqual([]);
	});

	it("keeps a switched-off or cleared network listed, and never deletes it", () => {
		const off = edit({ drafts: { x: { url: "https://x.com/me", isActive: false } } });
		expect(memberSlugs(KNOWN, rows, off)).toContain("x");
		expect(socialChanges(KNOWN, rows, off)).toEqual([
			{ slug: "x", url: "https://x.com/me", isActive: false },
		]);

		const cleared = edit({ drafts: { x: { url: "", isActive: true } } });
		expect(memberSlugs(KNOWN, rows, cleared)).toContain("x");
		expect(missingUrlSlugs(KNOWN, rows, cleared)).toEqual(["x"]);
		expect(socialChanges(KNOWN, rows, cleared)).toEqual([]);
	});

	it("deletes only what the trash button removed", () => {
		const removed = edit({ removed: new Set(["github"]) });
		expect(memberSlugs(KNOWN, rows, removed)).toEqual(["x"]);
		expect(socialChanges(KNOWN, rows, removed)).toEqual([
			{ slug: "github", url: "", isActive: false },
		]);
	});

	it("saves an addition and drops one that was removed again", () => {
		const drafts = { instagram: { url: "https://instagram.com/me", isActive: true } };
		const added = edit({ drafts, added: new Set(["instagram"]) });
		expect(socialChanges(KNOWN, rows, added)).toEqual([
			{ slug: "instagram", url: "https://instagram.com/me", isActive: true },
		]);
		// Removing the unsaved addition leaves no change, but keeps the URL for a re-add.
		const undone = edit({ drafts });
		expect(socialChanges(KNOWN, rows, undone)).toEqual([]);
		expect(effectiveDraft("instagram", rows, undone).url).toBe("https://instagram.com/me");
	});
});
