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
	MessageSquare,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { ContactListItem } from "@/components/admin/forms/contact-list-item";
import { ContactDetail } from "@/components/admin/forms/contact-detail";

type FilterMode = "all" | "unread" | "read";

export default function FormsPage() {
	const qc = useQueryClient();
	const [filter, setFilter] = useState<FilterMode>("all");
	const [formBlockFilter, setFormBlockFilter] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

	// Fetch form blocks for the filter
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const formBlocks = (blocksQuery.data ?? []).filter(
		(b: { type: string }) => b.type === "form",
	);

	const listParams = {
		...(filter !== "all" ? { isRead: filter === "read" } : {}),
		...(formBlockFilter ? { blockId: formBlockFilter } : {}),
	};
	const hasParams = Object.keys(listParams).length > 0;
	const contactsQuery = useQuery(
		trpc.forms.list.queryOptions(hasParams ? listParams : undefined),
	);
	const contacts = contactsQuery.data ?? [];
	const { getAnimationProps } = useEntranceAnimation(!contactsQuery.isLoading);

	const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

	const markRead = useMutation(trpc.forms.markRead.mutationOptions());
	const markUnread = useMutation(trpc.forms.markUnread.mutationOptions());
	const deleteContact = useMutation(trpc.forms.delete.mutationOptions());
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

	// Auto-mark as read when selecting an unread contact
	useEffect(() => {
		if (selectedContact && !selectedContact.isRead) {
			markRead.mutateAsync({ id: selectedContact.id }).then(invalidate).catch(() => {});
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
			await deleteContact.mutateAsync({ id });
			if (selectedId === id) setSelectedId(null);
			invalidate();
			toast.success("Submission deleted");
		} catch {
			toast.error("Failed to delete submission");
		}
	};

	const handleMarkAllRead = async () => {
		try {
			await markAllRead.mutateAsync();
			invalidate();
			toast.success("All submissions marked as read");
		} catch {
			toast.error("Failed to mark all as read");
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
			toast.success(`${ids.length} submission${ids.length > 1 ? "s" : ""} deleted`);
		} catch {
			toast.error("Failed to delete submissions");
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

	const showBulkActions = checkedIds.size > 0;

	const readFilters: { value: FilterMode; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "unread", label: "Unread" },
		{ value: "read", label: "Read" },
	];

	const headerAnim = getAnimationProps(0);
	const listAnim = getAnimationProps(1);

	return (
		<div className="space-y-4">
			<PageHeader
				title="Forms"
				description="Form submissions from your page"
				className={cn(headerAnim.className)}
				style={headerAnim.style}
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
						<Button
							variant="outline"
							size="xs"
							onClick={handleMarkAllRead}
							disabled={markAllRead.isPending}
						>
							<MailCheck className="mr-1 h-3 w-3" />
							<span className="hidden sm:inline">Mark All Read</span>
						</Button>
					</div>
				}
			/>

			{/* Form block filter pills */}
			{formBlocks.length > 1 && (
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1">
					<span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Form:
					</span>
					<button
						type="button"
						onClick={() => setFormBlockFilter(null)}
						className={cn(
							"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
							formBlockFilter === null
								? "bg-primary text-primary-foreground"
								: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						All Forms
					</button>
					{formBlocks.map((fb) => (
						<button
							key={fb.id}
							type="button"
							onClick={() => setFormBlockFilter(fb.id)}
							className={cn(
								"inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
								formBlockFilter === fb.id
									? "bg-primary text-primary-foreground"
									: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							<MessageSquare className="h-3 w-3" />
							{fb.title || "Untitled Form"}
						</button>
					))}
				</div>
			)}

			{/* Bulk action bar */}
			{showBulkActions && (
				<div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
					<span className="font-medium">{checkedIds.size} selected</span>
					<Button
						variant="destructive"
						size="xs"
						onClick={() => setBulkDeleteConfirm(true)}
						disabled={deleteMultiple.isPending}
					>
						<Trash2 className="mr-1 h-3 w-3" />
						Delete Selected
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

			<div className={cn(listAnim.className)} style={listAnim.style}>
				{contactsQuery.isLoading ? (
					<SkeletonRows count={4} />
				) : contacts.length === 0 ? (
					<EmptyState
						icon={Mail}
						title="No submissions"
						description={
							filter !== "all" || formBlockFilter
								? "No matching submissions found. Try a different filter."
								: "When visitors submit your forms, they'll appear here."
						}
					/>
				) : (
					<div className="flex gap-4">
						{/* List panel */}
						<Card className="flex-1 min-w-0 overflow-hidden">
							<div className="divide-y" role="list" aria-label="Form submissions">
								{contacts.map((contact) => (
									<ContactListItem
										key={contact.id}
										contact={contact}
										isSelected={selectedId === contact.id}
										isChecked={checkedIds.has(contact.id)}
										onSelect={() => handleSelect(contact.id)}
										onCheck={(checked) => toggleCheck(contact.id, checked)}
										showCheckbox={showBulkActions}
									/>
								))}
							</div>
						</Card>

						{/* Desktop detail panel */}
						<Card className="hidden w-[400px] shrink-0 overflow-hidden md:block">
							{selectedContact ? (
								<ContactDetail
									contact={selectedContact}
									onMarkRead={() => handleMarkRead(selectedContact.id)}
									onMarkUnread={() => handleMarkUnread(selectedContact.id)}
									onDelete={() => setDeleteConfirmId(selectedContact.id)}
									isMarkingRead={markRead.isPending}
									isMarkingUnread={markUnread.isPending}
								/>
							) : (
								<div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
									Select a submission to view details
								</div>
							)}
						</Card>
					</div>
				)}
			</div>

			{/* Mobile detail overlay */}
			{mobileDetailOpen && selectedContact && (
				<div className="fixed inset-0 z-50 md:hidden">
					<div
						className="fixed inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => setMobileDetailOpen(false)}
					/>
					<div className="fixed inset-x-0 bottom-0 z-10 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t bg-background shadow-xl animate-in slide-in-from-bottom duration-200">
						<div className="sticky top-0 flex items-center justify-between border-b bg-background px-4 py-2">
							<h2 className="text-xs font-semibold">Submission Details</h2>
							<button
								type="button"
								onClick={() => setMobileDetailOpen(false)}
								className="rounded-lg p-1.5 hover:bg-muted"
								aria-label="Close details"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<ContactDetail
							contact={selectedContact}
							onMarkRead={() => handleMarkRead(selectedContact.id)}
							onMarkUnread={() => handleMarkUnread(selectedContact.id)}
							onDelete={() => {
								setMobileDetailOpen(false);
								setDeleteConfirmId(selectedContact.id);
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
				title="Delete submission"
				description="Are you sure you want to delete this form submission? This action cannot be undone."
				confirmLabel="Delete"
				onConfirm={() => {
					if (deleteConfirmId) {
						handleDelete(deleteConfirmId);
						setDeleteConfirmId(null);
					}
				}}
				isPending={deleteContact.isPending}
			/>

			{/* Bulk delete confirm */}
			<ConfirmDialog
				open={bulkDeleteConfirm}
				onOpenChange={setBulkDeleteConfirm}
				title={`Delete ${checkedIds.size} submissions`}
				description={`Are you sure you want to delete ${checkedIds.size} form submission${checkedIds.size > 1 ? "s" : ""}? This action cannot be undone.`}
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
