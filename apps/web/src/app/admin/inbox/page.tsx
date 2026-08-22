"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Handshake, MailCheck, MessageSquare, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ConnectionDetail } from "@/components/admin/connections/connection-detail";
import { ConnectionListItem } from "@/components/admin/connections/connection-list-item";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

type FilterMode = "all" | "unread" | "read";

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
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

	// Form blocks power the per-form filter pills (a page can have several connect blocks)
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const formBlocks = (blocksQuery.data ?? []).filter((b: { type: string }) => b.type === "connect");

	const listParams = {
		...(filter !== "all" ? { isRead: filter === "read" } : {}),
		...(formBlockFilter ? { blockId: formBlockFilter } : {}),
	};
	const hasParams = Object.keys(listParams).length > 0;
	const connectionsQuery = useQuery(
		trpc.forms.list.queryOptions(hasParams ? listParams : undefined),
	);
	const connections = connectionsQuery.data ?? [];

	const selectedConnection = connections.find((c) => c.id === selectedId) ?? null;

	const markRead = useMutation(trpc.forms.markRead.mutationOptions());
	const markUnread = useMutation(trpc.forms.markUnread.mutationOptions());
	const deleteConnection = useMutation(trpc.forms.delete.mutationOptions());
	const markAllRead = useMutation(trpc.forms.markAllRead.mutationOptions());
	const deleteMultiple = useMutation(trpc.forms.deleteMultiple.mutationOptions());

	const invalidate = () => {
		qc.invalidateQueries({
			queryKey: trpc.forms.list.queryOptions(hasParams ? listParams : undefined).queryKey,
		});
		qc.invalidateQueries({
			queryKey: trpc.forms.unreadCount.queryOptions().queryKey,
		});
	};

	// Auto-mark as read when selecting an unread connection
	useEffect(() => {
		if (selectedConnection && !selectedConnection.isRead) {
			markRead
				.mutateAsync({ id: selectedConnection.id })
				.then(invalidate)
				.catch(() => {});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		selectedConnection?.isRead,
		// biome-ignore lint/correctness/useExhaustiveDependencies: invalidate is a fresh closure each render; the effect only needs to re-run on selection/read-state change
		invalidate,
		selectedConnection?.id,
		markRead.mutateAsync,
		selectedConnection,
	]);

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
		setSelectedId(id);
		if (window.innerWidth < 768) {
			setMobileDetailOpen(true);
		}
	};

	const handleMarkRead = async (id: string) => {
		try {
			await markRead.mutateAsync({ id });
			invalidate();
		} catch {
			toast.error("Failed to mark as read");
		}
	};

	const handleMarkUnread = async (id: string) => {
		try {
			await markUnread.mutateAsync({ id });
			invalidate();
		} catch {
			toast.error("Failed to mark as unread");
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deleteConnection.mutateAsync({ id });
			if (selectedId === id) setSelectedId(null);
			invalidate();
			toast.success("Connection deleted");
		} catch {
			toast.error("Failed to delete connection");
		}
	};

	const handleMarkAllRead = async () => {
		try {
			await markAllRead.mutateAsync();
			invalidate();
			toast.success("All connections marked as read");
		} catch {
			toast.error("Failed to mark all as read");
		}
	};

	const handleBulkMarkRead = async () => {
		const ids = Array.from(checkedIds);
		if (ids.length === 0) return;
		try {
			await Promise.all(ids.map((id) => markRead.mutateAsync({ id })));
			invalidate();
			setCheckedIds(new Set());
			toast.success("Marked as read");
		} catch {
			toast.error("Failed to mark as read");
		}
	};

	const handleBulkDelete = async () => {
		const ids = Array.from(checkedIds);
		if (ids.length === 0) return;
		try {
			await deleteMultiple.mutateAsync({ ids });
			if (selectedId && checkedIds.has(selectedId)) setSelectedId(null);
			setCheckedIds(new Set());
			invalidate();
			toast.success(`${ids.length} connection${ids.length > 1 ? "s" : ""} deleted`);
		} catch {
			toast.error("Failed to delete connections");
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

	const toggleSelectAll = () => {
		if (checkedIds.size === connections.length) {
			setCheckedIds(new Set());
		} else {
			setCheckedIds(new Set(connections.map((c) => c.id)));
		}
	};

	const showBulkActions = checkedIds.size > 0;

	const readFilters: { value: FilterMode; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "unread", label: "Unread" },
		{ value: "read", label: "Read" },
	];

	const unreadCount = connections.filter((c) => !c.isRead).length;

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
							<Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
							{readFilters.map((f) => (
								<Button
									key={f.value}
									variant={filter === f.value ? "default" : "outline"}
									size="xs"
									onClick={() => setFilter(f.value)}
									aria-pressed={filter === f.value}
								>
									{f.label}
								</Button>
							))}
						</div>
						{unreadCount > 0 && (
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
						onClick={() => setFormBlockFilter(null)}
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
							onClick={() => setFormBlockFilter(fb.id)}
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
							checked={checkedIds.size === connections.length}
							onChange={toggleSelectAll}
							className="h-4 w-4 rounded border-border accent-primary"
							aria-label="Select all"
						/>
					</span>
					<span className="text-xs font-medium text-primary">{checkedIds.size} selected</span>
					<Button variant="ghost" size="xs" onClick={handleBulkMarkRead}>
						<MailCheck className="mr-1 h-3.5 w-3.5" />
						Mark Read
					</Button>
					<Button
						variant="ghost"
						size="xs"
						className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => setBulkDeleteConfirm(true)}
						disabled={deleteMultiple.isPending}
					>
						<Trash2 className="mr-1 h-3.5 w-3.5" />
						Delete
					</Button>
					<Button variant="ghost" size="xs" onClick={() => setCheckedIds(new Set())}>
						Clear
					</Button>
				</div>
			)}

			<div>
				{connectionsQuery.isLoading ? (
					<SkeletonRows count={4} />
				) : connections.length === 0 ? (
					<EmptyState
						icon={Handshake}
						title="No messages yet"
						description={
							filter !== "all" || formBlockFilter
								? "No matching messages found. Try a different filter."
								: settingsQuery.isSuccess && !accepting
									? "Messages are off. Turn on Accepting messages so visitors can write to you."
									: "When people write to you through your page, they'll appear here."
						}
					/>
				) : (
					<div className="flex gap-4">
						{/* List panel */}
						<Card className="flex-1 min-w-0 overflow-hidden">
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
						</Card>

						{/* Desktop detail panel */}
						<Card className="hidden w-[400px] shrink-0 overflow-hidden md:block">
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
				<Sheet
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
				</Sheet>
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
