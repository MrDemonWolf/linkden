"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type Block, blockTypeIcon } from "./builder-constants";

export function BlockRow({
	block,
	onToggle,
	onEdit,
	onDelete,
	accent = false,
	featureHidden = false,
}: {
	block: Block;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
	accent?: boolean;
	/** The block's site-wide feature toggle is off, so it never renders publicly. */
	featureHidden?: boolean;
}) {
	const Icon = blockTypeIcon(block.type);
	const typeLabel = block.type === "connect" ? "Connect" : block.type.replace(/_/g, " ");
	// Where the feature toggle lives: messages in Inbox, vCard under Design → Branding.
	const featureHref = block.type === "connect" ? "/admin/inbox" : "/admin/design/branding";
	const featureLabel = block.type === "connect" ? "Inbox" : "Branding";

	const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } =
		useSortable({ id: block.id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(
			transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null,
		),
		transition,
		willChange: isSorting ? "transform" : undefined,
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: non-semantic container required for dnd-kit sortable ref (setNodeRef)
		<div
			ref={setNodeRef}
			style={style}
			role="group"
			aria-roledescription="sortable"
			// One flat 56px row of the list panel (the panel owns the border, radius
			// and dividers): hover lifts to --surface-2, the selected row tints
			// primary. No edge bar — the tint alone marks selection.
			//
			// GRID, not flex: the four tracks (handle · 32px type mark · body ·
			// action cluster) are fixed widths so every row's columns line up down
			// the list and the right cluster never drifts as titles change length.
			className={cn(
				"group relative grid h-14 grid-cols-[2.75rem_2rem_minmax(0,1fr)_5.25rem] items-center gap-x-1 bg-card px-2 transition-colors hover:bg-surface-2 sm:grid-cols-[1.75rem_2rem_minmax(0,1fr)_7rem] sm:gap-x-2 sm:px-3 lg:grid-cols-[1.75rem_2rem_minmax(0,1fr)_6.25rem]",
				accent && "bg-primary/5 hover:bg-primary/5",
				isDragging && "opacity-30 ring-2 ring-inset ring-primary/40",
				!block.isEnabled && !isDragging && "opacity-60",
			)}
		>
			{/* Drag handle — fills its track (44px on touch, 28px from sm) */}
			<button
				type="button"
				className="flex w-full cursor-grab touch-none select-none items-center justify-center self-stretch rounded-md text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
				aria-label="Drag to reorder"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>

			{/* Type mark: 32px inset square; section headers show a display "T" glyph */}
			<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-foreground/70">
				{block.type === "header" ? (
					<span aria-hidden="true" className="font-display text-sm font-semibold leading-none">
						T
					</span>
				) : (
					<Icon className="h-4 w-4" aria-hidden="true" />
				)}
			</div>

			{/* Body track — title over url; tapping it opens the editor. The
			    feature-gate chip shares this track so the action cluster stays put. */}
			<div className="flex min-w-0 items-center gap-2 self-stretch">
				<button
					type="button"
					onClick={onEdit}
					className="flex h-full min-w-0 flex-1 flex-col justify-center px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
					aria-label={`Edit ${block.title || "Untitled"}`}
				>
					<span className="flex min-w-0 items-center gap-1.5">
						<span className="truncate text-sm font-medium leading-snug">
							{block.title || "Untitled"}
						</span>
						{block.status === "draft" && (
							<span
								className="inline-block h-2 w-2 shrink-0 rounded-full bg-warning"
								role="img"
								aria-label="Unpublished changes"
							/>
						)}
					</span>
					<span className="truncate text-micro capitalize text-muted-foreground">
						{block.url ? (
							<span className="normal-case">{block.url.replace(/^https?:\/\//, "")}</span>
						) : (
							typeLabel
						)}
					</span>
				</button>

				{/* Feature-gate warning — the site-wide toggle is off, so the public
				    page silently skips this block. Link straight to where it lives. */}
				{featureHidden && (
					<TooltipHint content="This block's feature is turned off, so it won't appear on your public page">
						<Link
							href={featureHref}
							className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 text-micro font-medium leading-none text-warning transition-colors hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-7"
						>
							<TriangleAlert className="h-3 w-3" aria-hidden="true" />
							<span className="max-sm:hidden">Hidden — turn on in {featureLabel}</span>
							<span className="sm:hidden">Hidden</span>
						</Link>
					</TooltipHint>
				)}
			</div>

			{/* Actions track: visibility Switch · delete · chevron. Fixed width, so
			    the cluster sits on the same vertical line in every row. */}
			<div className="flex items-center justify-end gap-1">
				<Switch
					checked={block.isEnabled}
					onCheckedChange={onToggle}
					aria-label={block.isEnabled ? "Hide block" : "Show block"}
				/>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
					className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-colors hover:bg-destructive/10 hover:text-destructive hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 lg:h-8 lg:w-8"
					aria-label="Delete block"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
				<span
					aria-hidden
					className="hidden h-8 w-6 items-center justify-center text-muted-foreground/60 sm:flex"
				>
					<ChevronRight className="h-4 w-4" />
				</span>
			</div>
		</div>
	);
}
