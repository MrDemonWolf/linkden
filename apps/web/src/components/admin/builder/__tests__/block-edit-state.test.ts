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

	it("compares config by content, not formatting", () => {
		const text = { ...block, type: "text", config: '{"body":"Write something here."}' } as Block;
		// A structured edit that was reverted re-serializes pretty-printed.
		const pretty = JSON.stringify({ body: "Write something here." }, null, 2);
		expect(hasBlockEditChanges(text, { ...unchanged, config: pretty })).toBe(false);
		// Key order and a field that was set then cleared ("") are not edits.
		const reordered = { ...block, config: '{"a":1,"b":{"y":2,"x":1}}' } as Block;
		expect(
			hasBlockEditChanges(reordered, {
				...unchanged,
				config: '{"buttonEmoji":"","b":{"x":1,"y":2},"a":1}',
			}),
		).toBe(false);

		expect(
			hasBlockEditChanges(text, { ...unchanged, config: '{"body":"Write something else."}' }),
		).toBe(true);
		// Unparseable text still compares raw, so it reads as a change.
		expect(hasBlockEditChanges(text, { ...unchanged, config: "{" })).toBe(true);
	});

	it("compares schedules at the editor's minute precision", () => {
		const imported = { ...block, scheduledStart: new Date("2026-09-01T12:00:42Z") } as Block;
		expect(hasBlockEditChanges(imported, unchanged)).toBe(false);
		expect(
			hasBlockEditChanges(imported, {
				...unchanged,
				scheduledStart: new Date("2026-09-01T12:01:00Z"),
			}),
		).toBe(true);
	});
});
