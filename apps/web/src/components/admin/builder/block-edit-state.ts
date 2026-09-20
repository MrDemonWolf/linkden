import type { Block } from "./builder-constants";

const text = (value: unknown) => (value ? String(value) : null);
const time = (value: unknown) =>
	value ? new Date(value as string | number | Date).getTime() : null;

export function hasBlockEditChanges(block: Block | null, changes: Partial<Block> | null) {
	if (!block || !changes) return false;

	return (
		text(changes.title) !== text(block.title) ||
		text(changes.url) !== text(block.url) ||
		text(changes.icon) !== text(block.icon) ||
		text(changes.embedType) !== text(block.embedType) ||
		text(changes.embedUrl) !== text(block.embedUrl) ||
		(changes.config ?? "{}") !== (block.config ?? "{}") ||
		time(changes.scheduledStart) !== time(block.scheduledStart) ||
		time(changes.scheduledEnd) !== time(block.scheduledEnd)
	);
}
