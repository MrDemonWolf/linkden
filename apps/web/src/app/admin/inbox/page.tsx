"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Handshake, MailCheck, MessageSquare, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ConnectionDetail } from "@/components/admin/connections/connection-detail";
import { ConnectionListItem } from "@/components/admin/connections/connection-list-item";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { flattenPages, INBOX_PAGE_SIZE, pageHasMore } from "./inbox-pages";
import { useInboxSelection } from "./use-inbox-selection";

type FilterMode = "all" | "unread" | "read";

/** forms.deleteMultiple accepts at most this many ids per call. */
const DELETE_CHUNK = 100;

/**
 * Inbox = the contact-form submissions (tRPC `forms.*`). The header carries the
 * "Accepting messages" switch (`contact_form_enabled`) so the toggle lives next
 * to the thing it toggles; it saves instantly, no save bar.
 */
export default function InboxPage() {
	const qc = useQueryClient();

	// ─── Accepting messages (instant save) ───────────────────────────────
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSetting = useMutation(trpc.settings.update.mutationOptions());
	const [accepting, setAccepting] = useState(false);
	useEffect(() => {
		if (settingsQuery.data) setAccepting(settingsQuery.data.contact_form_enabled === "true");
	}, [settingsQuery.data]);
	const handleAcceptingChange = async (enabled: boolean) => {
		setAccepting(enabled);
		try {
			await updateSetting.mutateAsync({ key: "contact_form_enabled", value: String(enabled) });
			// pathKey() covers getAll and every settings.get({ key }) reader at once.
			qc.invalidateQueries({ queryKey: trpc.settings.pathKey() });
			toast.success(enabled ? "Accepting messages" : "Messages turned off");
		} catch {
			setAccepting(!enabled);
			toast.error("Failed to update setting");
		}
	};

	const [filter, setFilter] = useState<FilterMode>("all");
	const [formBlockFilter, setFormBlockFilter] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const [selectMode, setSelectMode] = useState(false);
	const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
	// Pages of INBOX_PAGE_SIZE loaded so far ("Load older" adds one).
	const [pageCount, setPageCount] = useState(1);

	// Form blocks power the per-form filter pills (a page can have several connect blocks)
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const formBlocks = (blocksQuery.data ?? []).filter((b: { type: string }) => b.type === "connect");

	const listParams = {
		...(filter !== "all" ? { isRead: filter === "read" } : {}),
		...(formBlockFilter ? { blockId: formBlockFilter } : {}),
	};
	// One offset page per query: each keeps its own tRPC key, so invalidating
	// the forms.list path refetches every loaded page together.
	const pageQueries = useQueries({
		queries: Array.from({ length: pageCount }, (_, i) =>
			trpc.forms.list.queryOptions({
				...listParams,
				limit: INBOX_PAGE_SIZE,
				offset: i * INBOX_PAGE_SIZE,
			}),
		),
	});
	const firstPage = pageQueries[0];
	const lastPage = pageQueries[pageQueries.length - 1];
	const connections = flattenPages(pageQueries.map((q) => q.data));
	// Same filters as the list, so "n of total" and "Load older" agree with it.
	const countQuery = useQuery(trpc.forms.count.queryOptions(listParams));
	const total = countQuery.data?.total;
	const hasMore =
		total !== undefined ? pageCount * INBOX_PAGE_SIZE < total : pageHasMore(lastPage?.data);
	const isLoadingMore = pageCount > 1 && !!lastPage?.isLoading;
	const loadMoreFailed = pageCount > 1 && !!lastPage?.isError && !lastPage.data;

	// The header's unread state counts every message, not just the loaded slice.
	const unreadCountQuery = useQuery(trpc.forms.unreadCount.queryOptions());
	const totalUnread = unreadCountQuery.data?.count ?? 0;

	const markRead = useMutation(trpc.forms.markRead.mutationOptions());
	const markUnread = useMutation(trpc.forms.markUnread.mutationOptions());
	const deleteConnection = useMutation(trpc.forms.delete.mutationOptions());
	const markAllRead = useMutation(trpc.forms.markAllRead.mutationOptions());
	const deleteMultiple = useMutation(trpc.forms.deleteMultiple.mutationOptions());

	const invalidate = () => {
		// pathKey() covers every loaded page (and its count) under every filter.
		qc.invalidateQueries({ queryKey: trpc.forms.list.pathKey() });
		qc.invalidateQueries({ queryKey: trpc.forms.count.pathKey() });
		qc.invalidateQueries({ queryKey: trpc.forms.unreadCount.queryKey() });
	};

	// Opening an unread message marks it read once, from the click itself.
	const selection = useInboxSelection(connections, (id) => {
		markRead
			.mutateAsync({ id })
			.then(invalidate)
			.catch(() => {});
	});
	const selectedId = selection.selectedId;
	const selectedConnection = selection.selected;

	// A filter change starts a fresh list: back to page one, and no bulk
	// selection or open message that the new view may not even contain.
	const resetView = () => {
		setPageCount(1);
		setCheckedIds(new Set());
		selection.clear();
		setMobileDetailOpen(false);
	};
	const changeFilter = (next: FilterMode) => {
		if (next === filter) return;
		setFilter(next);
		resetView();
	};
	const changeFormFilter = (next: string | null) => {
		if (next === formBlockFilter) return;
		setFormBlockFilter(next);
		resetView();
	};

	// Escape closes the mobile detail overlay
	useEffect(() => {
		if (!mobileDetailOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMobileDetailOpen(false);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [mobileDetailOpen]);

	const handleSelect = (id: string) => {
		selection.select(id);
		if (window.innerWidth < 768) {
			setMobileDetailOpen(true);
		}
	};

	const handleMarkRead = async (id: string) => {
		try {
			await markRead.mutateAsync({ id });
			selection.setPinnedRead(id, true);
			invalidate();
		} catch {
			toast.error("Failed to mark as read");
		}
	};

	const handleMarkUnread = async (id: string) => {
		try {
			await markUnread.mutateAsync({ id });
			selection.setPinnedRead(id, false);
			invalidate();
		} catch {
			toast.error("Failed to mark as unread");
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deleteConnection.mutateAsync({ id });
			if (selectedId === id) selection.clear();
			invalidate();
			toast.success("Connection deleted");
		} catch {
			toast.error("Failed to delete connection");
		}
	};

	const handleMarkAllRead = async () => {
		try {
			await markAllRead.mutateAsync();
			// The open message may only live in the snapshot (Unread filter).
			if (selectedId) selection.setPinnedRead(selectedId, true);
			invalidate();
			toast.success("All connections marked as read");
		} catch {
			toast.error("Failed to mark all as read");
		}
	};

	const exitSelectMode = () => {
		setCheckedIds(new Set());
		setSelectMode(false);
	};

	const handleBulkMarkRead = async () => {
		const ids = Array.from(checkedIds);
		if (ids.length === 0) return;
		try {
			await Promise.all(ids.map((id) => markRead.mutateAsync({ id })));
			if (selectedId && checkedIds.has(selectedId)) selection.setPinnedRead(selectedId, true);
			invalidate();
			exitSelectMode();
			toast.success("Marked as read");
		} catch {
			toast.error("Failed to mark as read");
		}
	};

	const handleBulkDelete = async () => {
		const ids = Array.from(checkedIds);
		if (ids.length === 0) return;
		// More than one call's worth can be selected once older pages are loaded.
		const chunks: string[][] = [];
		for (let i = 0; i < ids.length; i += DELETE_CHUNK) chunks.push(ids.slice(i, i + DELETE_CHUNK));
		try {
			await Promise.all(chunks.map((chunk) => deleteMultiple.mutateAsync({ ids: chunk })));
			if (selectedId && checkedIds.has(selectedId)) selection.clear();
			exitSelectMode();
			toast.success(`${ids.length} connection${ids.length > 1 ? "s" : ""} deleted`);
		} catch {
			toast.error("Failed to delete connections");
		} finally {
			// Even a partial failure changed the list — show what is left.
			invalidate();
		}
	};

	const toggleCheck = (id: string, checked: boolean) => {
		setCheckedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	};

	const allChecked = connections.length > 0 && checkedIds.size === connections.length;
	const toggleSelectAll = () => {
		if (allChecked) {
			setCheckedIds(new Set());
		} else {
			setCheckedIds(new Set(connections.map((c) => c.id)));
		}
	};

	// Checkboxes appear once the admin enters selection mode (or something is
	// already checked); the bulk bar stays until they leave it.
	const showBulkActions = selectMode || checkedIds.size > 0;
	const isFiltered = filter !== "all" || !!formBlockFilter;

	const readFilters: { value: FilterMode; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "unread", label: "Unread" },
		{ value: "read", label: "Read" },
	];

	return (
		<PageShell>
			<PageHeader
				title="Inbox"
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Label htmlFor="accepting-messages" className="mr-1 text-muted-foreground">
							Accepting messages
							<Switch
								id="accepting-messages"
								checked={accepting}
								onCheckedChange={handleAcceptingChange}
								disabled={!settingsQuery.isSuccess || updateSetting.isPending}
							/>
						</Label>
						<div className="flex items-center gap-1">
							{readFilters.map((f) => (
								<Button
									key={f.value}
									variant={filter === f.value ? "default" : "outline"}
									size="xs"
									onClick={() => changeFilter(f.value)}
									aria-pressed={filter === f.value}
								>
									{f.label}
								</Button>
							))}
						</div>
						{connections.length > 0 && !showBulkActions && (
							<Button
								variant="outline"
								size="xs"
								onClick={() => setSelectMode(true)}
								aria-label="Select messages"
							>
								<CheckSquare className="mr-1 h-3 w-3" />
								<span className="hidden sm:inline">Select</span>
							</Button>
						)}
						{totalUnread > 0 && (
							<Button
								variant="outline"
								size="xs"
								onClick={handleMarkAllRead}
								disabled={markAllRead.isPending}
								aria-label="Mark all read"
							>
								<MailCheck className="mr-1 h-3 w-3" />
								<span className="hidden sm:inline">Mark All Read</span>
							</Button>
						)}
					</div>
				}
			/>

			{/* Form block filter pills */}
			{formBlocks.length > 1 && (
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1">
					<span className="shrink-0 text-micro font-medium uppercase tracking-wider text-muted-foreground">
						Form:
					</span>
					<button
						type="button"
						onClick={() => changeFormFilter(null)}
						className={cn(
							"inline-flex h-11 shrink-0 items-center rounded-full px-3 text-micro font-medium transition-colors md:h-auto md:py-1",
							formBlockFilter === null
								? "bg-primary text-primary-foreground"
								: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
						aria-pressed={formBlockFilter === null}
					>
						All Forms
					</button>
					{formBlocks.map((fb) => (
						<button
							key={fb.id}
							type="button"
							onClick={() => changeFormFilter(fb.id)}
							className={cn(
								"inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-micro font-medium transition-colors md:h-auto md:py-1",
								formBlockFilter === fb.id
									? "bg-primary text-primary-foreground"
									: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
							aria-pressed={formBlockFilter === fb.id}
						>
							<MessageSquare className="h-3 w-3" />
							{fb.title || "Untitled Form"}
						</button>
					))}
				</div>
			)}

			{/* Bulk action bar */}
			{showBulkActions && (
				<div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
					<span className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center md:my-0 md:h-6 md:w-6">
						<input
							type="checkbox"
							checked={allChecked}
							onChange={toggleSelectAll}
							className="h-4 w-4 rounded border-border accent-primary"
							aria-label="Select all"
						/>
					</span>
					<span className="text-xs font-medium text-primary">{checkedIds.size} selected</span>
					<Button
						variant="ghost"
						size="xs"
						onClick={handleBulkMarkRead}
						disabled={checkedIds.size === 0}
					>
						<MailCheck className="mr-1 h-3.5 w-3.5" />
						Mark Read
					</Button>
					<Button
						variant="ghost"
						size="xs"
						className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => setBulkDeleteConfirm(true)}
						disabled={checkedIds.size === 0 || deleteMultiple.isPending}
					>
						<Trash2 className="mr-1 h-3.5 w-3.5" />
						Delete
					</Button>
					<Button variant="ghost" size="xs" onClick={exitSelectMode}>
						Done
					</Button>
				</div>
			)}

			<div>
				{firstPage?.isLoading ? (
					<SkeletonRows count={4} />
				) : firstPage?.isError && !firstPage.data ? (
					<QueryError message="Couldn't load messages" onRetry={() => firstPage.refetch()} />
				) : connections.length === 0 && !selectedConnection ? (
					<EmptyState
						icon={Handshake}
						title={isFiltered ? "No matching messages" : "No messages yet"}
						description={
							isFiltered
								? "No matching messages found. Try a different filter."
								: settingsQuery.isSuccess && !accepting
									? "Messages are off. Turn on Accepting messages so visitors can write to you."
									: "When people write to you through your page, they'll appear here."
						}
					/>
				) : (
					<div className="flex gap-4">
						{/* Stretch, not items-start: the detail panel takes its height
						    from the list, which is what gives ConnectionDetail's
						    ScrollArea a bounded region to scroll in. */}
						{/* List panel — `py-0` so the divided rows sit flush with the
						    panel edge, same as the block list on Links. */}
						<Card className="min-w-0 flex-1 overflow-hidden py-0">
							{/* The open message can outlive its row (e.g. read under the
							    Unread filter); the detail pane keeps it, the list says so. */}
							{connections.length === 0 && (
								<p className="px-3 py-6 text-center text-xs text-muted-foreground">
									No other matching messages.
								</p>
							)}
							<ul className="divide-y" aria-label="Messages">
								{connections.map((connection) => (
									<ConnectionListItem
										key={connection.id}
										connection={connection}
										isSelected={selectedId === connection.id}
										isChecked={checkedIds.has(connection.id)}
										onSelect={() => handleSelect(connection.id)}
										onCheck={(checked) => toggleCheck(connection.id, checked)}
										showCheckbox={showBulkActions}
									/>
								))}
							</ul>
							{(hasMore || isLoadingMore || loadMoreFailed) && (
								<div className="flex flex-col items-center gap-1 border-t px-3 py-3">
									{loadMoreFailed ? (
										<QueryError
											message="Couldn't load older messages"
											onRetry={() => lastPage?.refetch()}
											className="py-2"
										/>
									) : (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPageCount((n) => n + 1)}
											disabled={isLoadingMore}
										>
											{isLoadingMore ? "Loading…" : "Load older messages"}
										</Button>
									)}
									<p className="text-micro text-muted-foreground" aria-live="polite">
										{total !== undefined
											? `Showing ${connections.length} of ${total}`
											: `Showing the newest ${connections.length}`}
									</p>
								</div>
							)}
						</Card>

						{/* Desktop detail panel — `py-0` so its own header/action rules
						    are the panel's top and bottom edges. */}
						<Card className="hidden w-[400px] shrink-0 overflow-hidden py-0 md:block">
							{selectedConnection ? (
								<ConnectionDetail
									connection={selectedConnection}
									onMarkRead={() => handleMarkRead(selectedConnection.id)}
									onMarkUnread={() => handleMarkUnread(selectedConnection.id)}
									onDelete={() => setDeleteConfirmId(selectedConnection.id)}
									isMarkingRead={markRead.isPending}
									isMarkingUnread={markUnread.isPending}
								/>
							) : (
								<div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
									<Handshake className="h-8 w-8 text-muted-foreground/30" />
									<p className="text-xs">Select a message to view details</p>
								</div>
							)}
						</Card>
					</div>
				)}
			</div>

			{/* Mobile detail overlay */}
			{selectedConnection && (
				<BottomSheet
					open={mobileDetailOpen}
					onOpenChange={setMobileDetailOpen}
					title="Message"
					breakpoint="md"
				>
					<ConnectionDetail
						connection={selectedConnection}
						onMarkRead={() => handleMarkRead(selectedConnection.id)}
						onMarkUnread={() => handleMarkUnread(selectedConnection.id)}
						onDelete={() => {
							setMobileDetailOpen(false);
							setDeleteConfirmId(selectedConnection.id);
						}}
						isMarkingRead={markRead.isPending}
						isMarkingUnread={markUnread.isPending}
					/>
				</BottomSheet>
			)}

			{/* Single delete confirm */}
			<ConfirmDialog
				open={!!deleteConfirmId}
				onOpenChange={(open) => !open && setDeleteConfirmId(null)}
				title="Delete connection"
				description="Are you sure you want to delete this connection? This action cannot be undone."
				confirmLabel="Delete"
				onConfirm={() => {
					if (deleteConfirmId) {
						handleDelete(deleteConfirmId);
						setDeleteConfirmId(null);
					}
				}}
				isPending={deleteConnection.isPending}
			/>

			{/* Bulk delete confirm */}
			<ConfirmDialog
				open={bulkDeleteConfirm}
				onOpenChange={setBulkDeleteConfirm}
				title={`Delete ${checkedIds.size} connections`}
				description={`Are you sure you want to delete ${checkedIds.size} connection${checkedIds.size > 1 ? "s" : ""}? This action cannot be undone.`}
				confirmLabel="Delete All"
				onConfirm={() => {
					handleBulkDelete();
					setBulkDeleteConfirm(false);
				}}
				isPending={deleteMultiple.isPending}
			/>
		</PageShell>
	);
}
