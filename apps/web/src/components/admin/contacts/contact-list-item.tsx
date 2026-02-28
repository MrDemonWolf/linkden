"use client";

import { cn } from "@/lib/utils";

interface Contact {
	id: string;
	name: string;
	email: string;
	message: string;
	isRead: boolean;
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

function getInitials(name: string): string {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return name.slice(0, 2).toUpperCase();
}

function relativeDate(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const now = Date.now();
	const diff = now - d.getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return d.toLocaleDateString();
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
				"flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
				isSelected
					? "bg-primary/5 dark:bg-primary/10"
					: "hover:bg-muted/50",
				!contact.isRead && "border-l-2 border-l-primary",
			)}
		>
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
						: "bg-primary/10 text-primary",
				)}
			>
				{getInitials(contact.name)}
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
						{relativeDate(contact.createdAt)}
					</span>
				</div>
				<p className="truncate text-[11px] text-muted-foreground">
					{contact.email}
				</p>
				<p className="truncate text-[11px] text-muted-foreground/70">
					{contact.message?.slice(0, 60) || "No message"}
				</p>
			</div>
		</button>
	);
}
