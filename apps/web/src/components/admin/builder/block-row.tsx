"use client";

import { GripVertical, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { type Block, blockTypeIcon, TYPE_ACCENT, TYPE_BADGE_BG } from "./builder-constants";

export function BlockRow({
	block,
	onToggle,
	onEdit,
	onDelete,
	accent = false,
}: {
	block: Block;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
	accent?: boolean;
}) {
	const Icon = blockTypeIcon(block.type);
	const typeLabel = block.type === "connect" ? "Connect" : block.type.replace(/_/g, " ");

	const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } =
		useSortable({ id: block.id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(
			transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null,
		),
		transition,
		willChange: isSorting ? "transform" : undefined,
	};

	const accentClass = TYPE_ACCENT[block.type] ?? "bg-muted";
	const badgeClass = TYPE_BADGE_BG[block.type] ?? "bg-muted/10 text-muted-foreground";

	return (
		// biome-ignore lint/a11y/useSemanticElements: non-semantic container required for dnd-kit sortable ref (setNodeRef)
		<div
			ref={setNodeRef}
			style={style}
			role="group"
			aria-roledescription="sortable"
			className={cn(
				"group flex items-center gap-0 rounded-xl bg-card/80 backdrop-blur-xl border shadow-sm overflow-hidden transition-all hover:shadow-md min-h-[56px]",
				accent
					? "border-primary/40 bg-primary/[0.04] hover:border-primary/60"
					: "border-border hover:border-foreground/20",
				isDragging && "opacity-30 ring-2 ring-primary/40",
				!block.isEnabled && !isDragging && "opacity-50",
			)}
		>
			{/* Drag handle — wider on mobile (44px), prevents page scroll on grab */}
			<button
				type="button"
				className="flex w-11 sm:w-9 shrink-0 items-center justify-center border-r border-border text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors self-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-none"
				aria-label="Drag to reorder"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>

			{/* Left accent bar */}
			<div className={cn("w-[3px] self-stretch shrink-0", accent ? "bg-primary" : accentClass)} />

			{/* Icon circle */}
			<div
				className={cn(
					"ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
					badgeClass,
				)}
			>
				<Icon className="h-4 w-4" aria-hidden="true" />
			</div>

			{/* Content -- tapping the body opens edit */}
			<button
				type="button"
				onClick={onEdit}
				className="flex flex-1 items-center gap-3 px-3 py-3 min-w-0 text-left"
				aria-label={`Edit ${block.title || "Untitled"}`}
			>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<p className="truncate text-sm font-medium">{block.title || "Untitled"}</p>
						{block.status === "draft" && (
							<span
								className="inline-block h-2 w-2 shrink-0 rounded-full bg-warning animate-pulse"
								title="Unpublished changes"
								role="img"
								aria-label="Unpublished changes"
							/>
						)}
					</div>
					<span
						className={cn(
							"inline-block mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none capitalize",
							badgeClass,
						)}
					>
						{typeLabel}
					</span>
				</div>
			</button>

			{/* Actions */}
			<div className="flex items-center gap-0.5 pr-2">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onToggle();
					}}
					className={cn(
						"flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						block.isEnabled
							? "text-success hover:bg-success/10"
							: "text-muted-foreground hover:text-foreground hover:bg-muted",
					)}
					aria-label={block.isEnabled ? "Disable block" : "Enable block"}
				>
					{block.isEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
					className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors sm:hidden"
					aria-label="Edit block"
				>
					<Pencil className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
					className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all opacity-60 hover:text-destructive hover:bg-destructive/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-70 group-hover:opacity-100"
					aria-label="Delete block"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
}
