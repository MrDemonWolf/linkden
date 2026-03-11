"use client";

import {
	GripVertical,
	Eye,
	EyeOff,
	Pencil,
	Trash2,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { type Block, blockTypeIcon, TYPE_ACCENT, TYPE_BADGE_BG } from "./builder-constants";

export function BlockRow({
	block,
	onToggle,
	onEdit,
	onDelete,
}: {
	block: Block;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const Icon = blockTypeIcon(block.type);
	const typeLabel = block.type.replace(/_/g, " ");

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: block.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const accentClass = TYPE_ACCENT[block.type] ?? "bg-muted";
	const badgeClass = TYPE_BADGE_BG[block.type] ?? "bg-muted/10 text-muted-foreground";

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"group flex items-center gap-0 rounded-xl bg-card backdrop-blur-xl border border-white/15 dark:border-white/10 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-white/20 dark:hover:border-white/12 min-h-[56px]",
				isDragging && "opacity-50 shadow-lg scale-[1.01]",
				!block.isEnabled && "opacity-60",
			)}
		>
			{/* Drag handle */}
			<button
				type="button"
				className="flex w-9 shrink-0 items-center justify-center border-r border-border/50 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors self-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label="Drag to reorder"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>

			{/* Left accent bar */}
			<div className={cn("w-[3px] self-stretch shrink-0", accentClass)} />

			{/* Icon circle */}
			<div className={cn(
				"ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
				badgeClass,
			)}>
				<Icon className="h-4 w-4" aria-hidden="true" />
			</div>

			{/* Content — tapping the body opens edit */}
			<button
				type="button"
				onClick={onEdit}
				className="flex flex-1 items-center gap-3 px-3 py-3 min-w-0 text-left"
				aria-label={`Edit ${block.title || "Untitled"}`}
			>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<p className="truncate text-sm font-medium">
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
					<span className={cn(
						"inline-block mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none capitalize",
						badgeClass,
					)}>
						{typeLabel}
					</span>
				</div>
			</button>

			{/* Actions */}
			<div className="flex items-center gap-1 pr-2">
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onToggle(); }}
					className={cn(
						"flex h-9 w-9 items-center justify-center rounded-md transition-colors",
						block.isEnabled
							? "text-green-500 hover:text-green-600 hover:bg-green-500/10"
							: "text-muted-foreground hover:text-foreground hover:bg-muted",
					)}
					aria-label={block.isEnabled ? "Disable block" : "Enable block"}
				>
					{block.isEnabled ? (
						<Eye className="h-4 w-4" />
					) : (
						<EyeOff className="h-4 w-4" />
					)}
				</button>
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onEdit(); }}
					className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors sm:hidden"
					aria-label="Edit block"
				>
					<Pencil className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onDelete(); }}
					className="hidden sm:flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
					aria-label="Delete block"
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
