"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	Plus,
	Upload,
	Blocks,
	Rocket,
	User,
	Globe,
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
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/admin/empty-state";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { MobilePreviewSheet } from "@/components/admin/mobile-preview-sheet";
import { SharedPreview } from "@/components/admin/shared-preview";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { BlockEditPanel } from "@/components/admin/builder/block-edit-panel";
import { BlockRow } from "@/components/admin/builder/block-row";
import { BLOCK_TYPES, TYPE_BADGE_BG, type BlockType, type Block, generateId } from "@/components/admin/builder/builder-constants";
import { ProfileTab } from "@/components/admin/builder/profile-tab";
import { SocialTab } from "@/components/admin/builder/social-tab";

const TABS = [
	{ id: "blocks", label: "Blocks", icon: Blocks },
	{ id: "profile", label: "Profile", icon: User },
	{ id: "social", label: "Social Links", icon: Globe },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BuilderPage() {
	const qc = useQueryClient();
	const searchParams = useSearchParams();
	const router = useRouter();

	const tabParam = searchParams.get("tab");
	const activeTab: TabId = (TABS.some((t) => t.id === tabParam) ? tabParam : "blocks") as TabId;

	const setActiveTab = (tab: TabId) => {
		const params = new URLSearchParams(searchParams.toString());
		if (tab === "blocks") {
			params.delete("tab");
		} else {
			params.set("tab", tab);
		}
		const query = params.toString();
		router.replace(`/admin/builder${query ? `?${query}` : ""}` as "/admin/builder", { scroll: false });
	};

	const [editingBlock, setEditingBlock] = useState<Block | null>(null);
	const [editingOverrides, setEditingOverrides] = useState<Partial<Block> | null>(null);
	const [showMobilePreview, setShowMobilePreview] = useState(false);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
	const [showPicker, setShowPicker] = useState(false);
	const [profileDirty, setProfileDirty] = useState(false);
	const [socialDirty, setSocialDirty] = useState(false);

	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const blocks: Block[] = (blocksQuery.data as Block[] | undefined) ?? [];
	const hasDraftQuery = useQuery(trpc.blocks.hasDraft.queryOptions());
	const hasDrafts = hasDraftQuery.data?.hasDraft ?? false;
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());

	const handleProfileDirtyChange = useCallback((dirty: boolean) => setProfileDirty(dirty), []);
	const handleSocialDirtyChange = useCallback((dirty: boolean) => setSocialDirty(dirty), []);

	const hasAnyChanges = hasDrafts || profileDirty || socialDirty;
	useUnsavedChanges(hasAnyChanges);

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
			embed: "Embed",
			connect: "Connect With Me",
			vcard: "Download Contact",
			location: "Location",
		};
		const defaultConfigs: Partial<Record<string, string>> = {
			vcard: JSON.stringify({ buttonText: "Download Contact", buttonEmoji: "" }),
			connect: JSON.stringify({ preset: "contact", buttonText: "Contact Me", buttonEmoji: "", successMessage: "Thanks for reaching out!" }),
			location: JSON.stringify({ address: "", linkType: "none" }),
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

	// dnd-kit sensors
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

	const previewBlocksData = useMemo(() => {
		return blocks.filter((b) => b.isEnabled).map((b) => {
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
	}, [blocks, editingOverrides]);

	const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;
	const blockIds = blocks.map((b) => b.id);

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			{/* Header bar */}
			<div className="mb-6 flex items-center justify-between gap-4">
				<div className="min-w-0">
					<h1 className="text-lg font-semibold tracking-tight">Page Builder</h1>
					<p className={cn(
						"text-xs mt-0.5",
						hasDrafts ? "text-amber-400" : "text-muted-foreground",
					)}>
						{hasDrafts
							? `Unpublished changes \u00b7 ${blocks.filter((b) => b.status === "draft").length} draft${blocks.filter((b) => b.status === "draft").length !== 1 ? "s" : ""}`
							: "All changes are live"
						}
					</p>
				</div>
				{activeTab === "blocks" && (
					<Button
						size="sm"
						disabled={!hasDrafts || publishAll.isPending}
						onClick={async () => {
							try {
								await publishAll.mutateAsync();
								invalidate();
								toast.success("All changes published");
							} catch {
								toast.error("Failed to publish");
							}
						}}
						className={cn(
							"gap-2 transition-all",
							hasDrafts
								? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25"
								: "opacity-50",
						)}
					>
						{publishAll.isPending ? (
							<>
								<Upload className="h-3.5 w-3.5 animate-pulse" />
								Publishing...
							</>
						) : (
							<>
								<Rocket className="h-3.5 w-3.5" />
								Publish
							</>
						)}
					</Button>
				)}
			</div>

			{/* Tab bar */}
			<div className="mb-6 flex gap-1 rounded-lg border border-border/50 bg-muted/30 p-1" role="tablist">
				{TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.id}
						onClick={() => {
							setActiveTab(tab.id);
							// Close edit panel when switching tabs
							if (tab.id !== "blocks") {
								setEditingBlock(null);
								setEditingOverrides(null);
							}
						}}
						className={cn(
							"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
							activeTab === tab.id
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<tab.icon className="h-3.5 w-3.5" />
						{tab.label}
					</button>
				))}
			</div>

			{/* Main layout */}
			<div className="flex gap-6 items-start">
				{/* Left: Tab content */}
				<div className="flex-1 min-w-0 space-y-4">
					{activeTab === "blocks" && (
						<>
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
										description="Add your first block below to start building your page"
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

							{/* Flat block type picker */}
							<div className="space-y-2">
								<button
									type="button"
									onClick={() => setShowPicker(!showPicker)}
									className={cn(
										"w-full rounded-xl border-2 border-dashed p-4 text-sm transition-all flex items-center justify-center gap-2",
										showPicker
											? "border-blue-500/40 text-blue-400 bg-blue-500/5"
											: "border-border/60 text-muted-foreground hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5",
									)}
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
												className="group/picker flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-card/60 backdrop-blur-sm p-3 text-left hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
											>
												<div className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", TYPE_BADGE_BG[item.type])}>
													<item.icon className="h-4 w-4" />
												</div>
												<div>
													<div className="text-xs font-semibold group-hover/picker:text-blue-400 transition-colors">{item.label}</div>
													<div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.description}</div>
												</div>
											</button>
										))}
									</div>
								)}
							</div>
						</>
					)}

					{activeTab === "profile" && (
						<ProfileTab onDirtyChange={handleProfileDirtyChange} />
					)}

					{activeTab === "social" && (
						<SocialTab onDirtyChange={handleSocialDirtyChange} />
					)}
				</div>

				{/* Right side: Edit panel and/or Preview */}
				<div className="hidden lg:flex lg:gap-4 shrink-0">
					{/* Edit panel — slides in when editing blocks */}
					{activeTab === "blocks" && editingBlock && (
						<div className="w-[340px] shrink-0 animate-in slide-in-from-right-4 fade-in-0 duration-200">
							<BlockEditPanel
								block={editingBlock}
								onClose={() => { setEditingBlock(null); setEditingOverrides(null); }}
								onChange={setEditingOverrides}
								onSave={handleSaveEdit}
								isSaving={updateBlock.isPending}
								contactDelivery={contactDelivery}
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

					{/* Permanent live preview sidebar */}
					<div className={cn(
						"w-[360px] shrink-0 sticky top-6",
						activeTab === "blocks" && editingBlock ? "hidden xl:block" : "block",
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
