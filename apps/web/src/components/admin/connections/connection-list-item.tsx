"use client";

import { MapPin } from "lucide-react";
import { initials, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Connection {
	id: string;
	name: string;
	email: string;
	message: string;
	whereMet: string | null;
	isRead: boolean;
	blockTitle: string | null;
	createdAt: string | Date;
}

interface ConnectionListItemProps {
	connection: Connection;
	isSelected: boolean;
	isChecked: boolean;
	onSelect: () => void;
	onCheck: (checked: boolean) => void;
	showCheckbox: boolean;
}

export function ConnectionListItem({
	connection,
	isSelected,
	isChecked,
	onSelect,
	onCheck,
	showCheckbox,
}: ConnectionListItemProps) {
	return (
		<li
			className={cn(
				"relative flex w-full items-center gap-3 px-3 py-2.5 transition-colors",
				isSelected ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/30",
				!connection.isRead && "bg-primary/5",
			)}
		>
			{/* Left accent bar for unread */}
			<div
				className={cn(
					"absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all",
					!connection.isRead ? "bg-primary" : "bg-transparent",
				)}
			/>
			{showCheckbox && (
				<span className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center md:my-0 md:h-6 md:w-6">
					<input
						type="checkbox"
						checked={isChecked}
						onChange={(e) => onCheck(e.target.checked)}
						className="h-4 w-4 rounded border-border accent-primary"
						aria-label={`Select ${connection.name}`}
					/>
				</span>
			)}
			<button
				type="button"
				onClick={onSelect}
				className="flex min-w-0 flex-1 items-center gap-3 text-left"
			>
				<div
					className={cn(
						"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
						connection.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
					)}
				>
					{initials(connection.name)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-baseline gap-2">
						<p className={cn("truncate text-sm", !connection.isRead && "font-semibold")}>
							{connection.name || "Anonymous"}
						</p>
						<span className="ml-auto shrink-0 text-xs text-muted-foreground">
							{relativeTime(connection.createdAt)}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<p className="truncate text-xs text-muted-foreground">{connection.email}</p>
					</div>
					<div className="flex items-center gap-1.5">
						{connection.whereMet && (
							<span className="inline-flex items-center gap-0.5 text-[11px] text-primary">
								<MapPin className="h-2.5 w-2.5" />
								{connection.whereMet}
							</span>
						)}
						{connection.whereMet && connection.message && (
							<span className="text-muted-foreground/30">·</span>
						)}
						<p className="truncate text-xs text-muted-foreground">
							{connection.message?.slice(0, 50) || "No message"}
						</p>
					</div>
				</div>
			</button>
		</li>
	);
}
