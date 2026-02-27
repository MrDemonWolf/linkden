"use client";

import {
	GripVertical,
	Eye,
	EyeOff,
	Pencil,
	Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Block, blockTypeIcon } from "./builder-constants";

export function BlockRow({
	block,
	isDragged,
	onDragStart,
	onDragOver,
	onDrop,
	onToggle,
	onEdit,
	onDelete,
}: {
	block: Block;
	isDragged: boolean;
	onDragStart: (e: React.DragEvent) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const Icon = blockTypeIcon(block.type);

	return (
		<div
			draggable
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDrop={onDrop}
			className={cn(
				"group flex items-center gap-2 rounded-xl bg-card backdrop-blur-xl border border-white/15 dark:border-white/10 shadow-sm px-3 py-2.5 transition-all",
				isDragged && "opacity-50",
				!block.isEnabled && "opacity-60",
			)}
		>
			<button
				type="button"
				className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
				aria-label="Drag to reorder"
			>
				<GripVertical className="h-4 w-4" />
			</button>

			<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
				<Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="truncate text-xs font-medium">
						{block.title || "Untitled"}
					</p>
					{block.status === "draft" && (
						<span
							className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500"
							title="Unpublished changes"
							aria-label="Unpublished changes"
						/>
					)}
				</div>
				{block.url && (
					<p className="truncate text-[11px] text-muted-foreground">
						{block.url}
					</p>
				)}
			</div>

			<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
				<button
					type="button"
					onClick={onToggle}
					className={cn(
						"flex h-7 w-7 items-center justify-center transition-colors",
						block.isEnabled
							? "text-green-500 hover:text-green-600"
							: "text-muted-foreground hover:text-foreground",
					)}
					aria-label={block.isEnabled ? "Disable block" : "Enable block"}
				>
					{block.isEnabled ? (
						<Eye className="h-3.5 w-3.5" />
					) : (
						<EyeOff className="h-3.5 w-3.5" />
					)}
				</button>
				<button
					type="button"
					onClick={onEdit}
					className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
					aria-label="Edit block"
				>
					<Pencil className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={onDelete}
					className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-destructive"
					aria-label="Delete block"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
}
