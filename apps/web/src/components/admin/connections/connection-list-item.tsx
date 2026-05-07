"use client";

import { cn } from "@/lib/utils";
import { initials, relativeTime } from "@/lib/format";
import { MapPin } from "lucide-react";

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
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
				isSelected ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/30",
				!connection.isRead && "bg-blue-500/5",
			)}
		>
			{/* Blue left accent bar for unread */}
			<div
				className={cn(
					"absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all",
					!connection.isRead ? "bg-blue-500" : "bg-transparent",
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
					aria-label={`Select ${connection.name}`}
				/>
			)}
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
					connection.isRead ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-500",
				)}
			>
				{initials(connection.name)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<p className={cn("truncate text-xs", !connection.isRead && "font-semibold")}>
						{connection.name || "Anonymous"}
					</p>
					<span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
						{relativeTime(connection.createdAt)}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<p className="truncate text-[11px] text-muted-foreground">{connection.email}</p>
				</div>
				<div className="flex items-center gap-1.5">
					{connection.whereMet && (
						<span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 dark:text-blue-400">
							<MapPin className="h-2.5 w-2.5" />
							{connection.whereMet}
						</span>
					)}
					{connection.whereMet && connection.message && (
						<span className="text-muted-foreground/30">·</span>
					)}
					<p className="truncate text-[11px] text-muted-foreground">
						{connection.message?.slice(0, 50) || "No message"}
					</p>
				</div>
			</div>
		</button>
	);
}
