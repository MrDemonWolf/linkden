"use client";

import { useState } from "react";

interface Row {
	id: string;
	isRead: boolean;
}

/**
 * Inbox selection. Opening an unread message marks it read exactly once — from
 * the click, never from an effect — so a re-render, a refetch or an explicit
 * "Mark as unread" can't re-trigger it.
 *
 * The opened row is also pinned as a snapshot: under the Unread (or Read)
 * filter a read-state change drops it from the refetched list, and the detail
 * pane keeps showing it instead of closing under the admin's cursor. Live rows
 * always win over the snapshot when present.
 */
export function useInboxSelection<T extends Row>(
	rows: readonly T[],
	onAutoMarkRead: (id: string) => void,
) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [pinned, setPinned] = useState<T | null>(null);

	const select = (id: string) => {
		const row = rows.find((r) => r.id === id) ?? null;
		setSelectedId(id);
		if (row && !row.isRead) {
			setPinned({ ...row, isRead: true });
			onAutoMarkRead(id);
		} else {
			setPinned(row);
		}
	};

	const clear = () => {
		setSelectedId(null);
		setPinned(null);
	};

	/** Keep the snapshot honest after an explicit Mark read / Mark unread. */
	const setPinnedRead = (id: string, isRead: boolean) => {
		setPinned((prev) => (prev && prev.id === id ? { ...prev, isRead } : prev));
	};

	const selected =
		rows.find((r) => r.id === selectedId) ?? (pinned && pinned.id === selectedId ? pinned : null);

	return { selectedId, selected, select, clear, setPinnedRead };
}
