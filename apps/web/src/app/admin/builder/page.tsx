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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Blocks, Globe, Plus, Rocket, Smartphone, Upload, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BlockEditPanel } from "@/components/admin/builder/block-edit-panel";
import { BlockRow } from "@/components/admin/builder/block-row";
import {
	BLOCK_TYPES,
	type Block,
	type BlockType,
	generateId,
	TYPE_BADGE_BG,
} from "@/components/admin/builder/builder-constants";
import { ProfileTab } from "@/components/admin/builder/profile-tab";
import { SocialTab } from "@/components/admin/builder/social-tab";
import { EmptyState } from "@/components/admin/empty-state";
import { MobilePreviewSheet } from "@/components/admin/mobile-preview-sheet";
import { PageHeader } from "@/components/admin/page-header";
import { SharedPreview } from "@/components/admin/shared-preview";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

const TABS = [
	{ id: "blocks", label: "Blocks", icon: Blocks },
	{ id: "profile", label: "Profile", icon: User },
	{ id: "social", label: "Social Links", icon: Globe },
] as const;

type TabId = (typeof TABS)[number]["id"];

const dropAnimation: DropAnimation = {
	duration: 220,
	easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
	sideEffects: defaultDropAnimationSideEffects({
		styles: { active: { opacity: "0.4" } },
	}),
};

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
		router.replace(`/admin/builder${query ? `?${query}` : ""}` as "/admin/builder", {
			scroll: false,
		});
	};

	const [editingBlock, setEditingBlock] = useState<Block | null>(null);
	const [editingOverrides, setEditingOverrides] = useState<Partial<Block> | null>(null);
	const [showMobilePreview, setShowMobilePreview] = useState(false);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
	const [showPicker, setShowPicker] = useState(false);
	const [profileDirty, setProfileDirty] = useState(false);
	const [socialDirty, setSocialDirty] = useState(false);
	// Track the lg breakpoint so the block edit panel mounts in exactly one place
	// (inline sidebar at lg+, bottom sheet below) — never both, which would
	// duplicate the panel's input IDs.
	const [isLg, setIsLg] = useState(true);

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

	// Feature toggles gate public rendering server-side: connect blocks only
	// render when the contact form is enabled, vcard blocks when vCard is.
	// Surface that on the row so a block never silently no-renders. Only warn
	// once settings have actually loaded.
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
			connect: JSON.stringify({
				preset: "contact",
				buttonText: "Contact Me",
				buttonEmoji: "",
				successMessage: "Thanks for reaching out!",
			}),
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
								embedType: block.embedType ?? undefined,
								embedUrl: block.embedUrl ?? undefined,
								socialIcons: block.socialIcons ?? undefined,
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

	// Keep isLg in sync with the lg breakpoint (1024px).
	useEffect(() => {
		if (typeof window === "undefined") return;
		const mq = window.matchMedia("(min-width: 1024px)");
		const update = () => setIsLg(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	// Below lg the edit panel is presented as a full-screen bottom sheet. Lock
	// body scroll + wire Escape only while that sheet is actually mounted.
	const mobileEditOpen = activeTab === "blocks" && !!editingBlock;
	const mobileSheetOpen = mobileEditOpen && !isLg;
	useEffect(() => {
		if (!mobileSheetOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeEdit();
		};
		document.addEventListener("keydown", onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [mobileSheetOpen, closeEdit]);

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

	const handlePublishAll = useCallback(async () => {
		try {
			await publishAll.mutateAsync();
			invalidate();
			toast.success("All changes published");
		} catch {
			toast.error("Failed to publish");
		}
	}, [publishAll, invalidate]);

	// dnd-kit sensors — Mouse + Pointer + Touch + Keyboard for full coverage and smooth mobile feel
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
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
		return blocks
			.filter((b) => b.isEnabled)
			.map((b) => {
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
	const draftCount = blocks.filter((b) => b.status === "draft").length;

	// Header status must reflect the *current* tab, not just block drafts —
	// otherwise Profile/Social read "All changes are live" while dirty.
	const currentTabDirty =
		activeTab === "blocks" ? hasDrafts : activeTab === "profile" ? profileDirty : socialDirty;
	const headerDescription = currentTabDirty
		? activeTab === "blocks"
			? `Unpublished changes · ${draftCount} draft${draftCount !== 1 ? "s" : ""}`
			: "You have unsaved changes"
		: "All changes are live";

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			{/* Header bar */}
			<PageHeader
				title="Page Builder"
				description={headerDescription}
				badge={
					currentTabDirty ? (
						<Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
							{activeTab === "blocks"
								? `${draftCount} draft${draftCount !== 1 ? "s" : ""}`
								: "Unsaved"}
						</Badge>
					) : null
				}
				actions={
					activeTab === "blocks" ? (
						<Button
							size="sm"
							disabled={!hasDrafts || publishAll.isPending}
							onClick={handlePublishAll}
							className={cn(
								"gap-2 transition-all",
								hasDrafts
									? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
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
					) : null
				}
			/>

			{/* Tab bar — shadcn Tabs, themed */}
			<Tabs
				value={activeTab}
				onValueChange={(v) => {
					const tab = v as TabId;
					setActiveTab(tab);
					if (tab !== "blocks") {
						setEditingBlock(null);
						setEditingOverrides(null);
					}
				}}
			>
				<TabsList className="bg-muted/30 border border-border/50">
					{TABS.map((tab) => (
						<TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs">
							<tab.icon className="h-3.5 w-3.5" />
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			{/* Main layout */}
			<div className="flex gap-6 items-start">
				{/* Left: Tab content */}
				<div className="flex-1 min-w-0 space-y-4">
					{activeTab === "blocks" && (
						<>
							{/* Inline draft banner — informational only; the single Publish
							    control lives in the page header to avoid duplicate CTAs. */}
							{hasDrafts && (
								<div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
									<Rocket className="h-4 w-4 shrink-0 text-primary" />
									<p className="text-sm text-foreground truncate">
										You have {draftCount} unpublished change{draftCount !== 1 ? "s" : ""} — use
										Publish above to make them live.
									</p>
								</div>
							)}

							{/* List label */}
							<div className="flex items-center justify-between">
								<p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
									Blocks · drag to reorder
								</p>
								{blocks.length > 0 && (
									<p className="text-[10px] text-muted-foreground">
										{blocks.length} block{blocks.length !== 1 ? "s" : ""}
									</p>
								)}
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
								) : (
									<SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
										<ul className="flex flex-col gap-2" aria-label="Page blocks">
											{blocks.map((block) => (
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
										<div className="rounded-xl bg-card border border-primary/40 shadow-2xl shadow-primary/20 ring-2 ring-primary/30 pointer-events-none rotate-[0.5deg]">
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

							{/* Flat block type picker */}
							<div className="space-y-2">
								<button
									type="button"
									onClick={() => setShowPicker(!showPicker)}
									className={cn(
										"w-full rounded-xl border-2 border-dashed p-4 text-sm transition-all flex items-center justify-center gap-2",
										showPicker
											? "border-primary/40 text-primary bg-primary/5"
											: "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5",
									)}
								>
									<Plus
										className={cn(
											"h-4 w-4 transition-transform duration-200",
											showPicker && "rotate-45",
										)}
									/>
									{showPicker ? "Cancel" : "Add Block"}
								</button>

								{showPicker && (
									<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
										{BLOCK_TYPES.map((item) => (
											<button
												key={item.type}
												type="button"
												onClick={() => {
													handleAddBlock(item.type);
													setShowPicker(false);
												}}
												className="group/picker flex flex-col items-start gap-2 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-3 text-left hover:border-primary/30 hover:bg-primary/5 transition-all"
											>
												<div
													className={cn(
														"flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
														TYPE_BADGE_BG[item.type],
													)}
												>
													<item.icon className="h-4 w-4" />
												</div>
												<div>
													<div className="text-xs font-semibold group-hover/picker:text-primary transition-colors">
														{item.label}
													</div>
													<div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
														{item.description}
													</div>
												</div>
											</button>
										))}
									</div>
								)}
							</div>
						</>
					)}

					{activeTab === "profile" && <ProfileTab onDirtyChange={handleProfileDirtyChange} />}

					{activeTab === "social" && <SocialTab onDirtyChange={handleSocialDirtyChange} />}
				</div>

				{/* Right side: Edit panel and/or Preview */}
				<div className="hidden lg:flex lg:gap-4 shrink-0">
					{/* Edit panel — inline at lg+ only; below lg it renders inside the
						    bottom sheet instead (never both, to avoid duplicate input IDs) */}
					{activeTab === "blocks" && editingBlock && isLg && (
						<div className="w-[340px] shrink-0 animate-in slide-in-from-right-4 fade-in-0 duration-200">
							<BlockEditPanel
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
						</div>
					)}

					{/* Permanent live preview sidebar */}
					<div
						className={cn(
							"w-[360px] shrink-0 sticky top-6",
							activeTab === "blocks" && editingBlock ? "hidden xl:block" : "block",
						)}
					>
						<SharedPreview
							overrides={{
								blocks: editingOverrides ? previewBlocksData : undefined,
							}}
						/>
					</div>
				</div>
			</div>

			{/* Mobile preview FAB */}
			<Button
				type="button"
				size="icon"
				onClick={() => setShowMobilePreview(true)}
				className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90 text-primary-foreground lg:hidden"
				aria-label="Open live preview"
			>
				<Smartphone className="h-5 w-5" />
			</Button>

			{/* Mobile preview sheet */}
			<MobilePreviewSheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
				<SharedPreview overrides={{ blocks: previewBlocksData }} showHeader={false} />
			</MobilePreviewSheet>

			{/* Mobile block edit sheet — below lg the edit panel is impossible to
			    reach inline, so present it as a full-screen bottom sheet. */}
			{editingBlock && (
				<Sheet
					open={mobileSheetOpen}
					onOpenChange={(open) => {
						if (!open) closeEdit();
					}}
					ariaLabel="Edit block"
					breakpoint="lg"
					className="h-[90vh] max-h-none bg-card"
					scrollBody={false}
				>
					<BlockEditPanel
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
				</Sheet>
			)}
		</div>
	);
}
