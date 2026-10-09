import type { Block } from "./builder-constants";

const text = (value: unknown) => (value ? String(value) : null);
// The editor edits schedules as `datetime-local` (minute precision), so a stored
// value with seconds must not read as an edit the moment the panel opens.
const minute = (value: unknown) =>
	value ? Math.floor(new Date(value as string | number | Date).getTime() / 60_000) : null;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === "object" && !Array.isArray(value);

/** Sorted keys, blank ("") values dropped — at every object level. */
function normalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalize);
	if (!isPlainObject(value)) return value;
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) {
		const v = value[key];
		if (v === "" || v === undefined) continue;
		out[key] = normalize(v);
	}
	return out;
}

/**
 * The config as a canonical string, so formatting (compact on create, pretty
 * after a structured edit), key order and a field that was set then cleared
 * don't count as changes. Text that isn't a JSON object compares raw.
 */
function canonicalConfig(config: string | null | undefined): string {
	const raw = config || "{}";
	try {
		const parsed: unknown = JSON.parse(raw);
		return isPlainObject(parsed) ? JSON.stringify(normalize(parsed)) : raw;
	} catch {
		return raw;
	}
}

export function hasBlockEditChanges(block: Block | null, changes: Partial<Block> | null) {
	if (!block || !changes) return false;

	return (
		text(changes.title) !== text(block.title) ||
		text(changes.url) !== text(block.url) ||
		text(changes.icon) !== text(block.icon) ||
		text(changes.embedType) !== text(block.embedType) ||
		text(changes.embedUrl) !== text(block.embedUrl) ||
		canonicalConfig(changes.config) !== canonicalConfig(block.config) ||
		minute(changes.scheduledStart) !== minute(block.scheduledStart) ||
		minute(changes.scheduledEnd) !== minute(block.scheduledEnd)
	);
}
