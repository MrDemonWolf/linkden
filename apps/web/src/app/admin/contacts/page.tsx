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
import { ContactListItem } from "@/components/admin/contacts/contact-list-item";
import { ContactDetail } from "@/components/admin/contacts/contact-detail";

type FilterMode = "all" | "unread" | "read";

export default function ContactsPage() {
	const qc = useQueryClient();
	const [filter, setFilter] = useState<FilterMode>("all");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

	const filterParam =
		filter === "all" ? undefined : { isRead: filter === "read" };
	const contactsQuery = useQuery(
		trpc.contacts.list.queryOptions(filterParam),
	);
	const contacts = contactsQuery.data ?? [];
	const { getAnimationProps } = useEntranceAnimation(!contactsQuery.isLoading);

	const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

	const markRead = useMutation(trpc.contacts.markRead.mutationOptions());
	const markUnread = useMutation(trpc.contacts.markUnread.mutationOptions());
	const deleteContact = useMutation(trpc.contacts.delete.mutationOptions());
	const markAllRead = useMutation(trpc.contacts.markAllRead.mutationOptions());
	const deleteMultiple = useMutation(trpc.contacts.deleteMultiple.mutationOptions());

	const invalidate = () => {
		qc.invalidateQueries({
			queryKey: trpc.contacts.list.queryOptions(filterParam).queryKey,
		});
		qc.invalidateQueries({
			queryKey: trpc.contacts.unreadCount.queryOptions().queryKey,
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
		// On mobile, open detail overlay
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
			toast.success("Contact deleted");
		} catch {
			toast.error("Failed to delete contact");
		}
	};

	const handleMarkAllRead = async () => {
		try {
			await markAllRead.mutateAsync();
			invalidate();
			toast.success("All contacts marked as read");
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
			toast.success(`${ids.length} contact${ids.length > 1 ? "s" : ""} deleted`);
		} catch {
			toast.error("Failed to delete contacts");
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

	const filters: { value: FilterMode; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "unread", label: "Unread" },
		{ value: "read", label: "Read" },
	];

	const headerAnim = getAnimationProps(0);
	const listAnim = getAnimationProps(1);

	return (
		<div className="space-y-4">
			<PageHeader
				title="Contacts"
				description="Manage contact form submissions"
				className={cn(headerAnim.className)}
				style={headerAnim.style}
				actions={
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							<Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
							{filters.map((f) => (
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
						title="No contacts"
						description={
							filter !== "all"
								? `No ${filter} contacts found. Try a different filter.`
								: "When visitors submit your contact form, they'll appear here."
						}
					/>
				) : (
					<div className="flex gap-4">
						{/* List panel */}
						<Card className="flex-1 min-w-0 overflow-hidden">
							<div className="divide-y" role="list" aria-label="Contact submissions">
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
									Select a contact to view details
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
							<h2 className="text-xs font-semibold">Contact Details</h2>
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
				title="Delete contact"
				description="Are you sure you want to delete this contact submission? This action cannot be undone."
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
				title={`Delete ${checkedIds.size} contacts`}
				description={`Are you sure you want to delete ${checkedIds.size} contact submission${checkedIds.size > 1 ? "s" : ""}? This action cannot be undone.`}
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
