"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
	Plus,
	Upload,
	ArrowUpRight,
	Blocks,
} from "lucide-react";
import {
	DndContext,
	DragOverlay,
	closestCenter,
	PointerSensor,
	KeyboardSensor,
	TouchSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	arrayMove,
} from "@dnd-kit/sortable";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { socialBrandMap } from "@linkden/ui/social-brands";
import { EmptyState } from "@/components/admin/empty-state";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { MobilePreviewSheet } from "@/components/admin/mobile-preview-sheet";
import { SharedPreview } from "@/components/admin/shared-preview";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { BlockEditPanel } from "@/components/admin/builder/block-edit-panel";
import { BlockRow } from "@/components/admin/builder/block-row";
import { BLOCK_TYPES, TYPE_BADGE_BG, type BlockType, type Block, generateId } from "@/components/admin/builder/builder-constants";
import { toast as sonnerToast } from "sonner";

function SocialNetworksSection({
	socialNetworks,
}: {
	socialNetworks: Array<{ slug: string; name: string; url: string; hex: string; svgPath: string }>;
}) {
	if (socialNetworks.length === 0) return null;
	return (
		<Card>
			<CardContent className="flex items-center justify-between py-3">
				<div>
					<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Social Networks
					</p>
					<div className="mt-1.5 flex flex-wrap gap-1.5">
						{socialNetworks.slice(0, 5).map((n) => (
							<div
								key={n.slug}
								className="flex h-6 w-6 items-center justify-center rounded-full"
								style={{ background: n.hex }}
								title={n.name}
							>
								<svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
									<path d={n.svgPath} />
								</svg>
							</div>
						))}
						{socialNetworks.length > 5 && (
							<span className="text-[10px] text-muted-foreground self-center">
								+{socialNetworks.length - 5} more
							</span>
						)}
					</div>
				</div>
				<Link href="/admin/social">
					<Button variant="ghost" size="xs">
						Manage <ArrowUpRight className="h-3 w-3" />
					</Button>
				</Link>
			</CardContent>
		</Card>
	);
}

export default function BuilderPage() {
	const qc = useQueryClient();
	const [editingBlock, setEditingBlock] = useState<Block | null>(null);
	const [editingOverrides, setEditingOverrides] = useState<Partial<Block> | null>(null);
	const [showMobilePreview, setShowMobilePreview] = useState(false);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
	const [showPicker, setShowPicker] = useState(false);

	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const blocks: Block[] = (blocksQuery.data as Block[] | undefined) ?? [];
	const hasDraftQuery = useQuery(trpc.blocks.hasDraft.queryOptions());
	const hasDrafts = hasDraftQuery.data?.hasDraft ?? false;
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const socialsQuery = useQuery(trpc.social.list.queryOptions({ activeOnly: true }));

	useUnsavedChanges(hasDrafts);

	useEffect(() => {
		if (newlyAddedId && blocks.some((b) => b.id === newlyAddedId)) {
			const el = document.querySelector(`[data-block-id="${newlyAddedId}"]`);
			if (el instanceof HTMLElement) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
				const focusable = el.querySelector<HTMLElement>("button");
				focusable?.focus();
			}
			setNewlyAddedId(null);
		}
	}, [newlyAddedId, blocks]);

	const previewSocialNetworks = useMemo(() => {
		return (socialsQuery.data ?? [])
			.filter((s: { isActive: boolean; url: string }) => s.isActive && s.url)
			.map((s: { slug: string; url: string }) => {
				const brand = socialBrandMap.get(s.slug);
				if (!brand) return null;
				return { slug: s.slug, name: brand.name, url: s.url, hex: brand.hex, svgPath: brand.svgPath };
			})
			.filter(Boolean) as Array<{ slug: string; name: string; url: string; hex: string; svgPath: string }>;
	}, [socialsQuery.data]);

	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());
	const contactDelivery = settingsQuery.data?.contact_delivery ?? "database";

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
		const position = blocks.length;
		const defaults: Record<string, string> = {
			link: "New Link",
			header: "Section Header",
			social_icons: "Social Icons",
			embed: "Embed",
			form: "Form",
			vcard: "Download Contact",
		};
		const defaultConfigs: Partial<Record<string, string>> = {
			vcard: JSON.stringify({ buttonText: "Download Contact", buttonEmoji: "📇" }),
		};
		try {
			await createBlock.mutateAsync({
				id,
				type,
				title: defaults[type] ?? "New Block",
				position,
				isEnabled: true,
				config: defaultConfigs[type],
			});
			invalidate();
			setNewlyAddedId(id);
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

	const handleDelete = async (id: string) => {
		try {
			await deleteBlock.mutateAsync({ id });
			invalidate();
			toast.success("Block deleted");
		} catch {
			toast.error("Failed to delete block");
		}
	};

	const handleSaveEdit = async (data: Partial<Block>) => {
		try {
			await updateBlock.mutateAsync({
				id: data.id!,
				title: data.title ?? undefined,
				url: data.url ?? undefined,
				icon: data.icon ?? undefined,
				embedType: data.embedType ?? undefined,
				embedUrl: data.embedUrl ?? undefined,
				socialIcons: data.socialIcons ?? undefined,
				config: data.config ?? undefined,
				scheduledStart: data.scheduledStart,
				scheduledEnd: data.scheduledEnd,
			});
			invalidate();
			setEditingBlock(null);
			setEditingOverrides(null);
			toast.success("Block updated");
		} catch {
			toast.error("Failed to update block");
		}
	};

	// dnd-kit sensors: pointer (mouse+pen), touch, keyboard
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);
		if (!over || active.id === over.id) return;

		const oldIndex = blocks.findIndex((b) => b.id === active.id);
		const newIndex = blocks.findIndex((b) => b.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(blocks, oldIndex, newIndex);
		const updates = reordered.map((b, i) => ({ id: b.id, position: i }));

		try {
			await reorderBlocks.mutateAsync(updates);
			invalidate();
		} catch {
			toast.error("Failed to reorder");
		}
	};

	const previewBlocksData = blocks.filter((b) => b.isEnabled).map((b) => {
		const base = {
			id: b.id,
			type: b.type,
			title: b.title,
			url: b.url,
			icon: b.icon,
			embedType: b.embedType,
			embedUrl: b.embedUrl,
			socialIcons: b.socialIcons,
			config: b.config,
			position: b.position,
		};
		if (editingOverrides && editingOverrides.id === b.id) {
			return { ...base, ...editingOverrides, position: base.position, type: base.type };
		}
		return base;
	});

	const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;
	const blockIds = blocks.map((b) => b.id);

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-4">
			{/* Inline header row */}
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-base font-semibold tracking-tight">Builder</h1>
					<p className={cn(
						"text-xs",
						hasDrafts ? "text-amber-500" : "text-muted-foreground",
					)}>
						{hasDrafts ? "Unpublished changes" : "All changes are live"}
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Button
						size="sm"
						variant={hasDrafts ? "default" : "outline"}
						disabled={!hasDrafts || publishAll.isPending}
						onClick={async () => {
							try {
								await publishAll.mutateAsync();
								invalidate();
								sonnerToast.success("All changes published");
							} catch {
								sonnerToast.error("Failed to publish");
							}
						}}
					>
						<Upload className="mr-1.5 h-3.5 w-3.5" />
						{publishAll.isPending ? "Publishing…" : "Publish"}
					</Button>
				</div>
			</div>

			{/* Main layout */}
			<div className="flex gap-6">
				{/* Block list */}
				<div className="flex-1 min-w-0 space-y-4">
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
					>
						{blocksQuery.isLoading ? (
							<div className="flex flex-col gap-2">
								<SkeletonRows count={4} />
							</div>
						) : blocks.length === 0 ? (
							<EmptyState
								icon={Blocks}
								title="No blocks yet"
								description='Click "Add Block" below to start building your page'
							/>
						) : (
							<SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
								<div className="flex flex-col gap-2" role="list" aria-label="Page blocks">
									{blocks.map((block) => (
										<div key={block.id} role="listitem" data-block-id={block.id}>
											<BlockRow
												block={block}
												onToggle={() => handleToggle(block.id, block.isEnabled)}
												onEdit={() => setEditingBlock(block)}
												onDelete={() => handleDelete(block.id)}
											/>
										</div>
									))}
								</div>
							</SortableContext>
						)}

						<DragOverlay>
							{activeBlock && (
								<div className="rounded-xl bg-card border border-primary/30 shadow-2xl opacity-90 pointer-events-none">
									<BlockRow
										block={activeBlock}
										onToggle={() => {}}
										onEdit={() => {}}
										onDelete={() => {}}
									/>
								</div>
							)}
						</DragOverlay>
					</DndContext>

					{/* Block picker */}
					<div className="space-y-2">
						<button
							type="button"
							onClick={() => setShowPicker(!showPicker)}
							className="w-full rounded-xl border-2 border-dashed border-border/60 p-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
						>
							<Plus className={cn("h-4 w-4 transition-transform duration-200", showPicker && "rotate-45")} />
							{showPicker ? "Cancel" : "Add Block"}
						</button>

						{showPicker && (
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
								{BLOCK_TYPES.map((item) => (
									<button
										key={item.type}
										type="button"
										onClick={() => { handleAddBlock(item.type); setShowPicker(false); }}
										className="flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/50 p-3 text-left hover:border-primary/40 hover:bg-card transition-all"
									>
										<div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TYPE_BADGE_BG[item.type])}>
											<item.icon className="h-4 w-4" />
										</div>
										<div>
											<div className="text-xs font-semibold">{item.label}</div>
											<div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.description}</div>
										</div>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Social Networks section */}
					<SocialNetworksSection socialNetworks={previewSocialNetworks} />
				</div>

				{/* Right: edit panel or preview */}
				<div className="hidden lg:flex lg:gap-4 shrink-0">
					{/* Edit panel — slides in when editing */}
					{editingBlock && (
						<div className="w-[340px] shrink-0 animate-in slide-in-from-right-4 fade-in-0 duration-200">
							<BlockEditPanel
								block={editingBlock}
								onClose={() => { setEditingBlock(null); setEditingOverrides(null); }}
								onChange={setEditingOverrides}
								onSave={handleSaveEdit}
								isSaving={updateBlock.isPending}
								contactDelivery={contactDelivery}
								socialNetworks={previewSocialNetworks}
								onDeliveryChange={async (value) => {
									try {
										await updateSettings.mutateAsync([
											{ key: "contact_delivery", value },
										]);
										qc.invalidateQueries({ queryKey: trpc.settings.getAll.queryOptions().queryKey });
										toast.success("Delivery mode updated");
									} catch {
										toast.error("Failed to update delivery mode");
									}
								}}
							/>
						</div>
					)}
					{/* Preview — always on xl, hidden on lg when editing */}
					<div className={cn(
						"w-[300px] shrink-0 sticky top-6",
						editingBlock ? "hidden xl:block" : "block",
					)}>
						<SharedPreview
							overrides={{
								blocks: editingOverrides ? previewBlocksData : undefined,
							}}
						/>
					</div>
				</div>
			</div>

			{/* Mobile preview sheet */}
			<MobilePreviewSheet
				open={showMobilePreview}
				onOpenChange={setShowMobilePreview}
			>
				<SharedPreview overrides={{ blocks: previewBlocksData }} showHeader={false} />
			</MobilePreviewSheet>
		</div>
	);
}
