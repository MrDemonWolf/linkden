import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flattenPages, INBOX_PAGE_SIZE, pageHasMore } from "../inbox-pages";
import { useInboxSelection } from "../use-inbox-selection";

type Row = { id: string; isRead: boolean; name: string };

const unread: Row = { id: "a", isRead: false, name: "Ada" };
const read: Row = { id: "b", isRead: true, name: "Bo" };

describe("useInboxSelection", () => {
	afterEach(cleanup);

	it("marks an unread message read exactly once per open, never on re-render", () => {
		const onAutoMarkRead = vi.fn();
		const { result, rerender } = renderHook(({ rows }) => useInboxSelection(rows, onAutoMarkRead), {
			initialProps: { rows: [unread, read] },
		});

		act(() => result.current.select("a"));
		expect(onAutoMarkRead).toHaveBeenCalledTimes(1);
		expect(onAutoMarkRead).toHaveBeenCalledWith("a");

		// Stale list (refetch not back yet) and repeated renders don't re-fire it.
		rerender({ rows: [unread, read] });
		rerender({ rows: [{ ...unread }, read] });
		expect(onAutoMarkRead).toHaveBeenCalledTimes(1);
	});

	it("does not auto-mark an already-read message", () => {
		const onAutoMarkRead = vi.fn();
		const { result } = renderHook(() => useInboxSelection([unread, read], onAutoMarkRead));
		act(() => result.current.select("b"));
		expect(onAutoMarkRead).not.toHaveBeenCalled();
		expect(result.current.selected?.id).toBe("b");
	});

	it("leaves an explicit 'Mark as unread' alone", () => {
		const onAutoMarkRead = vi.fn();
		const { result, rerender } = renderHook(({ rows }) => useInboxSelection(rows, onAutoMarkRead), {
			initialProps: { rows: [unread] },
		});
		act(() => result.current.select("a"));
		rerender({ rows: [{ ...unread, isRead: true }] });
		// Admin marks it unread again; the refetched row comes back unread.
		act(() => result.current.setPinnedRead("a", false));
		rerender({ rows: [{ ...unread, isRead: false }] });
		expect(onAutoMarkRead).toHaveBeenCalledTimes(1);
		expect(result.current.selected?.isRead).toBe(false);
	});

	it("keeps the open message visible when the Unread filter drops it", () => {
		const { result, rerender } = renderHook(({ rows }) => useInboxSelection(rows, vi.fn()), {
			initialProps: { rows: [unread] as Row[] },
		});
		act(() => result.current.select("a"));
		// The refetched Unread list no longer contains the now-read message.
		rerender({ rows: [] });
		expect(result.current.selected).toMatchObject({ id: "a", isRead: true, name: "Ada" });

		act(() => result.current.clear());
		expect(result.current.selected).toBeNull();
	});
});

describe("inbox pages", () => {
	it("flattens offset pages and drops rows duplicated by a shifted offset", () => {
		const rows = flattenPages([[unread, read], undefined, [read, { ...unread, id: "c" }]]);
		expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
	});

	it("offers older messages only after a full page", () => {
		expect(pageHasMore(undefined)).toBe(false);
		expect(pageHasMore(new Array(INBOX_PAGE_SIZE - 1).fill(0))).toBe(false);
		expect(pageHasMore(new Array(INBOX_PAGE_SIZE).fill(0))).toBe(true);
	});
});
