"use client";

import { cn } from "@/lib/utils";
import { initials, relativeTime } from "@/lib/format";

interface Contact {
	id: string;
	name: string;
	email: string;
	message: string;
	isRead: boolean;
	blockTitle: string | null;
	createdAt: string | Date;
}

interface ContactListItemProps {
	contact: Contact;
	isSelected: boolean;
	isChecked: boolean;
	onSelect: () => void;
	onCheck: (checked: boolean) => void;
	showCheckbox: boolean;
}

export function ContactListItem({
	contact,
	isSelected,
	isChecked,
	onSelect,
	onCheck,
	showCheckbox,
}: ContactListItemProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
				isSelected
					? "bg-primary/5 dark:bg-primary/10"
					: "hover:bg-muted/30",
				!contact.isRead && "bg-amber-500/5",
			)}
		>
			{/* Amber left accent bar for unread */}
			<div
				className={cn(
					"absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all",
					!contact.isRead ? "bg-amber-500" : "bg-transparent",
				)}
			/>
			{showCheckbox && (
				<input
					type="checkbox"
					checked={isChecked}
					onChange={(e) => {
						e.stopPropagation();
						onCheck(e.target.checked);
					}}
					onClick={(e) => e.stopPropagation()}
					className="h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
					aria-label={`Select ${contact.name}`}
				/>
			)}
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
					contact.isRead
						? "bg-muted text-muted-foreground"
						: "bg-amber-500/10 text-amber-500",
				)}
			>
				{initials(contact.name)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<p
						className={cn(
							"truncate text-xs",
							!contact.isRead && "font-semibold",
						)}
					>
						{contact.name || "Anonymous"}
					</p>
					<span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
						{relativeTime(contact.createdAt)}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<p className="truncate text-[11px] text-muted-foreground">
						{contact.email}
					</p>
					{contact.blockTitle && (
						<span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
							{contact.blockTitle}
						</span>
					)}
				</div>
				<p className="truncate text-[11px] text-muted-foreground">
					{contact.message?.slice(0, 60) || "No message"}
				</p>
			</div>
		</button>
	);
}
