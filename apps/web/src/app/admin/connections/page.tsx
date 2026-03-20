"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Mail,
	MailOpen,
	MailCheck,
	Trash2,
	Filter,
	X,
	Handshake,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ConnectionListItem } from "@/components/admin/connections/connection-list-item";
import { ConnectionDetail } from "@/components/admin/connections/connection-detail";

type FilterMode = "all" | "unread" | "read";

export default function ConnectionsPage() {
	const qc = useQueryClient();
	const [filter, setFilter] = useState<FilterMode>("all");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

	const listParams = {
		...(filter !== "all" ? { isRead: filter === "read" } : {}),
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
			markRead.mutateAsync({ id: selectedConnection.id }).then(invalidate).catch(() => {});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedId]);

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
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-4">
			<PageHeader
				title="Connections"
				description="People who connected with you through your page"
				actions={
					<div className="flex items-center gap-2">
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
							>
								<MailCheck className="mr-1 h-3 w-3" />
								<span className="hidden sm:inline">Mark All Read</span>
							</Button>
						)}
					</div>
				}
			/>

			{/* Bulk action bar */}
			{showBulkActions && (
				<div className="flex items-center gap-3 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
					<input
						type="checkbox"
						checked={checkedIds.size === connections.length}
						onChange={toggleSelectAll}
						className="h-3.5 w-3.5 rounded border-border accent-primary"
						aria-label="Select all"
					/>
					<span className="text-xs font-medium text-blue-500">{checkedIds.size} selected</span>
					<Button
						variant="ghost"
						size="xs"
						onClick={handleBulkMarkRead}
					>
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
					<Button
						variant="ghost"
						size="xs"
						onClick={() => setCheckedIds(new Set())}
					>
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
						title="No connections yet"
						description={
							filter !== "all"
								? "No matching connections found. Try a different filter."
								: "When people connect with you through your page, they'll appear here."
						}
					/>
				) : (
					<div className="flex gap-4">
						{/* List panel */}
						<Card className="flex-1 min-w-0 overflow-hidden">
							<div className="divide-y" role="list" aria-label="Connections">
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
							</div>
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
									<p className="text-xs">Select a connection to view details</p>
								</div>
							)}
						</Card>
					</div>
				)}
			</div>

			{/* Mobile detail overlay */}
			{mobileDetailOpen && selectedConnection && (
				<div className="fixed inset-0 z-50 md:hidden">
					<div
						className="fixed inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => setMobileDetailOpen(false)}
					/>
					<div className="fixed inset-x-0 bottom-0 z-10 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t bg-background shadow-xl animate-in slide-in-from-bottom duration-200">
						<div className="sticky top-0 flex items-center justify-between border-b bg-background px-4 py-2">
							<h2 className="text-xs font-semibold">Connection Details</h2>
							<button
								type="button"
								onClick={() => setMobileDetailOpen(false)}
								className="rounded-lg p-1.5 hover:bg-muted"
								aria-label="Close details"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
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
					</div>
				</div>
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
		</div>
	);
}
