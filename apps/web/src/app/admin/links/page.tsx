"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	type DropAnimation,
	defaultDropAnimationSideEffects,
	KeyboardSensor,
	MeasuringStrategy,
	MouseSensor,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { EmbedType } from "@linkden/validators/blocks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Blocks, Plus, Rocket, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BlockEditPanel } from "@/components/admin/builder/block-edit-panel";
import { BlockRow } from "@/components/admin/builder/block-row";
import {
	BLOCK_TYPES,
	type Block,
	type BlockType,
	DEFAULT_BLOCK_CONFIG,
	generateId,
	TYPE_CHIP,
} from "@/components/admin/builder/builder-constants";
import { EmptyState } from "@/components/admin/empty-state";
import type { PreviewBlock } from "@/components/admin/page-preview";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

const FILTERS = [
	{ id: "all", label: "All" },
	{ id: "drafts", label: "Drafts" },
	{ id: "hidden", label: "Hidden" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const dropAnimation: DropAnimation = {
	duration: 220,
	easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
	sideEffects: defaultDropAnimationSideEffects({
		styles: { active: { opacity: "0.4" } },
	}),
};

const BLOCK_DEFAULT_TITLE: Record<string, string> = {
	link: "New Link",
	header: "Section Header",
	embed: "Embed",
	connect: "Connect With Me",
	vcard: "Download Contact",
	location: "Location",
	image: "Image",
	text: "Text",
	divider: "Divider",
};

/** Links → Blocks: the block list, inline editor (shell preview column ≥lg, bottom Sheet below) and Publish. */
export default function LinksBlocksPage() {
	const qc = useQueryClient();

	const [editingBlock, setEditingBlock] = useState<Block | null>(null);
	const [editingOverrides, setEditingOverrides] = useState<Partial<Block> | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
	const [showPicker, setShowPicker] = useState(false);
	const [filter, setFilter] = useState<Filter>("all");
	// Mounts the edit panel in exactly one place: the shell's preview column at
	// lg+, the bottom sheet below — never both (duplicate input IDs).
	const isLg = useMediaQuery("(min-width: 1024px)", true);

	// ponytail: `?filter=drafts` (StatePill) read once after mount — no useSearchParams/Suspense.
	useEffect(() => {
		if (new URLSearchParams(window.location.search).get("filter") === "drafts") setFilter("drafts");
	}, []);

	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const blocks: Block[] = (blocksQuery.data as Block[] | undefined) ?? [];
	const hasDraftQuery = useQuery(trpc.blocks.hasDraft.queryOptions());
	const hasDrafts = hasDraftQuery.data?.hasDraft ?? false;
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());

	useEffect(() => {
		if (newlyAddedId && blocks.some((b) => b.id === newlyAddedId)) {
			const el = document.querySelector(`[data-block-id="${newlyAddedId}"]`);
			if (el instanceof HTMLElement) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
				el.querySelector<HTMLElement>("button")?.focus();
			}
			setNewlyAddedId(null);
		}
	}, [newlyAddedId, blocks]);

	// Feature toggles gate public rendering server-side: connect blocks only
	// render when messages are accepted (Inbox), vcard blocks when vCard is on
	// (Design → Branding). Only warn once settings have actually loaded.
	const isFeatureHidden = useCallback(
		(type: string) => {
			const settings = settingsQuery.data;
			if (!settings) return false;
			return (
				(type === "connect" && settings.contact_form_enabled !== "true") ||
				(type === "vcard" && settings.vcard_enabled !== "true")
			);
		},
		[settingsQuery.data],
	);

	const createBlock = useMutation(trpc.blocks.create.mutationOptions());
	const updateBlock = useMutation(trpc.blocks.update.mutationOptions());
	const deleteBlock = useMutation(trpc.blocks.delete.mutationOptions());
	const toggleEnabled = useMutation(trpc.blocks.toggleEnabled.mutationOptions());
	const reorderBlocks = useMutation(trpc.blocks.reorder.mutationOptions());
	const publishAll = useMutation(trpc.blocks.publishAll.mutationOptions());

	const invalidate = useCallback(() => {
		qc.invalidateQueries({ queryKey: trpc.blocks.list.queryOptions().queryKey });
		qc.invalidateQueries({ queryKey: trpc.blocks.hasDraft.queryOptions().queryKey });
	}, [qc]);

	const handleAddBlock = async (type: BlockType) => {
		const id = generateId();
		try {
			await createBlock.mutateAsync({
				id,
				type,
				title: BLOCK_DEFAULT_TITLE[type] ?? "New Block",
				position: blocks.length,
				isEnabled: true,
				config: JSON.stringify(DEFAULT_BLOCK_CONFIG[type]),
			});
			invalidate();
			setNewlyAddedId(id);
			setFilter("all");
			toast.success("Block added");
		} catch {
			toast.error("Failed to add block");
		}
	};

	const handleToggle = async (id: string, isEnabled: boolean) => {
		try {
			await toggleEnabled.mutateAsync({ id, isEnabled: !isEnabled });
			invalidate();
		} catch {
			toast.error("Failed to toggle block");
		}
	};

	const handleDelete = async (block: Block) => {
		try {
			await deleteBlock.mutateAsync({ id: block.id });
			invalidate();
			toast.success("Block deleted", {
				action: {
					label: "Undo",
					onClick: async () => {
						try {
							await createBlock.mutateAsync({
								id: block.id,
								type: block.type as BlockType,
								title: block.title ?? undefined,
								url: block.url ?? undefined,
								icon: block.icon ?? undefined,
								embedType: (block.embedType as EmbedType | null) ?? undefined,
								embedUrl: block.embedUrl ?? undefined,
								isEnabled: block.isEnabled,
								position: block.position,
								scheduledStart: block.scheduledStart ?? undefined,
								scheduledEnd: block.scheduledEnd ?? undefined,
								config: block.config ?? undefined,
							});
							invalidate();
							toast.success("Block restored");
						} catch {
							toast.error("Failed to restore block");
						}
					},
				},
			});
		} catch {
			toast.error("Failed to delete block");
		}
	};

	const closeEdit = useCallback(() => {
		setEditingBlock(null);
		setEditingOverrides(null);
	}, []);

	const handleSaveEdit = async (data: Partial<Block>) => {
		try {
			// "" means "cleared" to updateBlockSchema (it becomes null in the row);
			// only a missing key is "not provided", so null maps to "" here too.
			await updateBlock.mutateAsync({
				id: data.id!,
				title: data.title ?? "",
				url: data.url ?? "",
				icon: data.icon ?? "",
				embedType: (data.embedType as EmbedType | null) ?? "",
				embedUrl: data.embedUrl ?? "",
				config: data.config ?? "{}",
				scheduledStart: data.scheduledStart,
				scheduledEnd: data.scheduledEnd,
			});
			invalidate();
			closeEdit();
			toast.success("Block updated");
		} catch {
			toast.error("Failed to update block");
		}
	};

	const handlePublishAll = useCallback(async () => {
		try {
			await publishAll.mutateAsync();
			invalidate();
			toast.success("All changes published");
		} catch {
			toast.error("Failed to publish");
		}
	}, [publishAll, invalidate]);

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);
		if (!over || active.id === over.id) return;
		const oldIndex = blocks.findIndex((b) => b.id === active.id);
		const newIndex = blocks.findIndex((b) => b.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;
		const updates = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
			id: b.id,
			position: i,
		}));
		try {
			await reorderBlocks.mutateAsync(updates);
			invalidate();
		} catch {
			toast.error("Failed to reorder");
		}
	};

	// While a block is being edited, the preview shows the enabled blocks with
	// the in-progress edits applied; otherwise PagePreview reads blocks itself.
	const previewBlocks = useMemo<PreviewBlock[] | undefined>(() => {
		if (!editingOverrides) return undefined;
		return blocks
			.filter((b) => b.isEnabled)
			.map((b) =>
				b.id === editingOverrides.id
					? { ...b, ...editingOverrides, position: b.position, type: b.type }
					: b,
			);
	}, [blocks, editingOverrides]);

	const editPanel = editingBlock ? (
		<BlockEditPanel
			key={editingBlock.id}
			block={editingBlock}
			onClose={closeEdit}
			onChange={setEditingOverrides}
			onSave={handleSaveEdit}
			onDelete={() => {
				const b = editingBlock;
				closeEdit();
				handleDelete(b);
			}}
			isSaving={updateBlock.isPending}
		/>
	) : null;

	// Shell-owned preview column (≥lg) + FAB/sheet (<lg). The panel is only
	// handed over at lg+; below that the page-owned Sheet renders it.
	usePreviewSlot({
		overrides: { blocks: previewBlocks },
		panel: isLg && editPanel ? editPanel : undefined,
	});

	const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;
	const draftCount = blocks.filter((b) => b.status === "draft").length;
	const hiddenCount = blocks.filter((b) => !b.isEnabled).length;
	const visibleBlocks =
		filter === "drafts"
			? blocks.filter((b) => b.status === "draft")
			: filter === "hidden"
				? blocks.filter((b) => !b.isEnabled)
				: blocks;
	const countFor = (f: Filter) =>
		f === "drafts" ? draftCount : f === "hidden" ? hiddenCount : blocks.length;

	return (
		<div className="space-y-4">
			{/* Filter chips + the single Publish control */}
			<div className="flex flex-wrap items-center gap-2">
				<fieldset className="flex gap-1" aria-label="Filter blocks">
					{FILTERS.map((f) => (
						<button
							key={f.id}
							type="button"
							aria-pressed={filter === f.id}
							onClick={() => setFilter(f.id)}
							className={cn(
								"inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors md:min-h-8",
								filter === f.id
									? "border-foreground/20 bg-muted text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{f.label}
							<span className="font-mono text-micro tabular-nums text-muted-foreground">
								{countFor(f.id)}
							</span>
						</button>
					))}
				</fieldset>
				<Button
					size="sm"
					disabled={!hasDrafts || publishAll.isPending}
					onClick={handlePublishAll}
					className={cn("ml-auto gap-2", hasDrafts && "shadow-glow")}
				>
					{publishAll.isPending ? (
						<>
							<Upload className="h-3.5 w-3.5 animate-pulse" />
							Publishing…
						</>
					) : (
						<>
							<Rocket className="h-3.5 w-3.5" />
							Publish{draftCount > 0 ? ` ${draftCount}` : ""}
						</>
					)}
				</Button>
			</div>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				modifiers={[restrictToVerticalAxis, restrictToParentElement]}
				measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				{blocksQuery.isLoading ? (
					<div className="flex flex-col gap-2">
						<SkeletonRows count={4} />
					</div>
				) : blocksQuery.isError ? (
					<div className="rounded-xl border border-border py-8 text-center">
						<p className="text-sm text-destructive">
							Failed to load blocks — your page may be out of date
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-2"
							onClick={() => blocksQuery.refetch()}
						>
							Retry
						</Button>
					</div>
				) : blocks.length === 0 ? (
					<EmptyState
						icon={Blocks}
						title="No blocks yet"
						description="Add your first block below to start building your page"
					/>
				) : visibleBlocks.length === 0 ? (
					<p className="py-8 text-center text-xs text-muted-foreground">
						{filter === "drafts" ? "No unpublished blocks" : "No hidden blocks"}
					</p>
				) : (
					<SortableContext
						items={visibleBlocks.map((b) => b.id)}
						strategy={verticalListSortingStrategy}
					>
						<ul className="flex flex-col gap-2" aria-label="Page blocks">
							{visibleBlocks.map((block) => (
								<li key={block.id} data-block-id={block.id}>
									<BlockRow
										block={block}
										onToggle={() => handleToggle(block.id, block.isEnabled)}
										onEdit={() => setEditingBlock(block)}
										onDelete={() => handleDelete(block)}
										accent={editingBlock?.id === block.id}
										featureHidden={isFeatureHidden(block.type)}
									/>
								</li>
							))}
						</ul>
					</SortableContext>
				)}

				<DragOverlay dropAnimation={dropAnimation}>
					{activeBlock && (
						<div className="pointer-events-none rotate-[0.5deg] rounded-xl bg-card shadow-card ring-2 ring-primary/30">
							<BlockRow
								block={activeBlock}
								onToggle={() => {}}
								onEdit={() => {}}
								onDelete={() => {}}
								featureHidden={isFeatureHidden(activeBlock.type)}
							/>
						</div>
					)}
				</DragOverlay>
			</DndContext>

			{/* Single + Add block CTA with the flat type picker under it */}
			<div className="space-y-2">
				<button
					type="button"
					onClick={() => setShowPicker(!showPicker)}
					aria-expanded={showPicker}
					className={cn(
						"flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm transition-all",
						showPicker
							? "border-primary/40 bg-primary/5 text-primary"
							: "border-border text-muted-foreground hover:border-primary/30 hover:text-primary hover:shadow-glow",
					)}
				>
					<Plus
						className={cn("h-4 w-4 transition-transform duration-200", showPicker && "rotate-45")}
					/>
					{showPicker ? "Cancel" : "Add block"}
				</button>

				{showPicker && (
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
						{BLOCK_TYPES.map((item) => (
							<button
								key={item.type}
								type="button"
								onClick={() => {
									handleAddBlock(item.type);
									setShowPicker(false);
								}}
								className="group/picker flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
							>
								<div
									className={cn(
										"flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
										TYPE_CHIP,
									)}
								>
									<item.icon className="h-4 w-4" />
								</div>
								<div>
									<div className="text-xs font-semibold transition-colors group-hover/picker:text-primary">
										{item.label}
									</div>
									<div className="mt-0.5 text-micro leading-tight text-muted-foreground">
										{item.description}
									</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Below lg the edit panel is a full-screen bottom sheet (hidden at ≥lg
			    by `breakpoint`, which is the correct usage of that prop). */}
			{editPanel && (
				<Sheet
					open={!isLg}
					onOpenChange={(open) => {
						if (!open) closeEdit();
					}}
					ariaLabel="Edit block"
					breakpoint="lg"
					className="h-[90vh] max-h-none bg-card"
					scrollBody={false}
				>
					{editPanel}
				</Sheet>
			)}
		</div>
	);
}
