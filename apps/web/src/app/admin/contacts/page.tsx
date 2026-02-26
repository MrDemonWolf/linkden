"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Mail,
	MailOpen,
	Trash2,
	ChevronDown,
	ChevronUp,
	Filter,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type FilterMode = "all" | "unread" | "read";

export default function ContactsPage() {
	const qc = useQueryClient();
	const [filter, setFilter] = useState<FilterMode>("all");
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const filterParam =
		filter === "all" ? undefined : { isRead: filter === "read" };
	const contactsQuery = useQuery(
		trpc.contacts.list.queryOptions(filterParam),
	);
	const contacts = contactsQuery.data ?? [];

	const markRead = useMutation(trpc.contacts.markRead.mutationOptions());
	const markUnread = useMutation(trpc.contacts.markUnread.mutationOptions());
	const deleteContact = useMutation(trpc.contacts.delete.mutationOptions());

	const invalidate = () => {
		qc.invalidateQueries({
			queryKey: trpc.contacts.list.queryOptions(filterParam).queryKey,
		});
		qc.invalidateQueries({
			queryKey: trpc.contacts.unreadCount.queryOptions().queryKey,
		});
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
			invalidate();
			toast.success("Contact deleted");
			if (expandedId === id) setExpandedId(null);
		} catch {
			toast.error("Failed to delete contact");
		}
	};

	const filters: { value: FilterMode; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "unread", label: "Unread" },
		{ value: "read", label: "Read" },
	];

	return (
		<div className="space-y-6">
			<PageHeader
				title="Contacts"
				description="Manage contact form submissions"
				actions={
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
				}
			/>

			{/* Contact list */}
			{contactsQuery.isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={`sk-${i}`} className="h-14" />
					))}
				</div>
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
				<>
				<div className="space-y-1.5" role="list" aria-label="Contact submissions">
					{contacts.map((contact) => {
						const isExpanded = expandedId === contact.id;
						const detailsId = `contact-details-${contact.id}`;

						return (
							<div
								key={contact.id}
								role="listitem"
								className={cn(
									"border bg-card transition-colors",
									!contact.isRead && "border-l-2 border-l-primary",
								)}
							>
								{/* Row */}
								<button
									type="button"
									onClick={() =>
										setExpandedId(isExpanded ? null : contact.id)
									}
									aria-expanded={isExpanded}
									aria-controls={detailsId}
									className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
								>
									<span className="sr-only">{contact.isRead ? "Read" : "Unread"}</span>
									<div
										className={cn(
											"flex h-7 w-7 shrink-0 items-center justify-center",
											contact.isRead ? "bg-muted" : "bg-primary/10",
										)}
									>
										{contact.isRead ? (
											<MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
										) : (
											<Mail className="h-3.5 w-3.5 text-primary" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
											<p
												className={cn(
													"truncate text-xs",
													!contact.isRead && "font-semibold",
												)}
											>
												{contact.name || "Anonymous"}
											</p>
											<span className="shrink-0 text-[11px] text-muted-foreground">
												{contact.email}
											</span>
										</div>
										<p className="truncate text-[11px] text-muted-foreground">
											{contact.message?.slice(0, 80) ?? "No message"}
										</p>
									</div>
									<span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
										{new Date(contact.createdAt).toLocaleDateString()}
									</span>
									{isExpanded ? (
										<ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									) : (
										<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									)}
								</button>

								{/* Expanded details */}
								{isExpanded && (
									<div id={detailsId} className="border-t px-4 py-3 space-y-3">
										<div className="grid gap-2 sm:grid-cols-2">
											<div>
												<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
													Name
												</p>
												<p className="text-xs">
													{contact.name || "Not provided"}
												</p>
											</div>
											<div>
												<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
													Email
												</p>
												<p className="text-xs">{contact.email}</p>
											</div>
										</div>
										<div>
											<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
												Message
											</p>
											<p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">
												{contact.message || "No message provided"}
											</p>
										</div>
										<div>
											<p className="text-[11px] uppercase tracking-wider text-muted-foreground">
												Submitted
											</p>
											<p className="text-xs">
												{new Date(contact.createdAt).toLocaleString()}
											</p>
										</div>
										<div className="flex gap-2 pt-1">
											{contact.isRead ? (
												<Button
													variant="outline"
													size="xs"
													onClick={() => handleMarkUnread(contact.id)}
													disabled={markUnread.isPending}
												>
													<Mail className="mr-1 h-3 w-3" />
													Mark Unread
												</Button>
											) : (
												<Button
													variant="outline"
													size="xs"
													onClick={() => handleMarkRead(contact.id)}
													disabled={markRead.isPending}
												>
													<MailOpen className="mr-1 h-3 w-3" />
													Mark Read
												</Button>
											)}
											<Button
												variant="destructive"
												size="xs"
												onClick={() => setDeleteConfirmId(contact.id)}
												disabled={deleteContact.isPending}
											>
												<Trash2 className="mr-1 h-3 w-3" />
												Delete
											</Button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>

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
				</>
			)}
		</div>
	);
}
