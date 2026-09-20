import { describe, expect, it } from "vitest";
import { hasBlockEditChanges } from "../block-edit-state";
import type { Block } from "../builder-constants";

const block = {
	id: "block-1",
	type: "link",
	title: "Website",
	url: "https://example.com",
	config: null,
	scheduledStart: new Date("2026-09-01T12:00:00Z"),
} as Block;

const unchanged = {
	title: "Website",
	url: "https://example.com",
	icon: null,
	embedType: null,
	embedUrl: null,
	config: "{}",
	scheduledStart: new Date("2026-09-01T12:00:00Z"),
	scheduledEnd: null,
} satisfies Partial<Block>;

describe("hasBlockEditChanges", () => {
	it("ignores editor normalization but detects a saved-field change", () => {
		expect(hasBlockEditChanges(block, unchanged)).toBe(false);

		expect(hasBlockEditChanges(block, { ...unchanged, title: "New website" })).toBe(true);
	});
});
