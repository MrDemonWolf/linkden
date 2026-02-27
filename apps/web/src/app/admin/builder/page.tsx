"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Plus,
	Sun,
	Moon,
	ChevronDown,
	Blocks,
	Upload,
	ExternalLink,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { socialBrandMap } from "@linkden/ui/social-brands";
import { PhoneFrame } from "@/components/admin/phone-frame";
import { PreviewContent } from "@/components/admin/preview-content";
import { getThemeColors } from "@/components/public/public-page";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { MobilePreviewSheet } from "@/components/admin/mobile-preview-sheet";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { BlockEditPanel } from "@/components/admin/builder/block-edit-panel";
import { BlockRow } from "@/components/admin/builder/block-row";
import { BLOCK_TYPES, type BlockType, type Block, generateId } from "@/components/admin/builder/builder-constants";

export default function BuilderPage() {
	const qc = useQueryClient();
	const [editingBlock, setEditingBlock] = useState<Block | null>(null);
	const [editingOverrides, setEditingOverrides] = useState<Partial<Block> | null>(null);
	const [showAddMenu, setShowAddMenu] = useState(false);
	const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
	const [showMobilePreview, setShowMobilePreview] = useState(false);
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const blocks: Block[] = (blocksQuery.data as Block[] | undefined) ?? [];
	const hasDraftQuery = useQuery(trpc.blocks.hasDraft.queryOptions());
	const hasDrafts = hasDraftQuery.data?.hasDraft ?? false;
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const socialsQuery = useQuery(trpc.social.list.queryOptions({ activeOnly: true }));

	useUnsavedChanges(hasDrafts);

	// Focus newly added block row after data re-renders
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

	const previewThemeColors = (() => {
		const settings = settingsQuery.data ?? {};
		const themePresetName = settings.theme_preset || "default";
		return getThemeColors(themePresetName, previewMode);
	})();

	const previewProfile = (() => {
		const settings = settingsQuery.data ?? {};
		return {
			name: settings.profile_name || "Your Name",
			email: "",
			image: settings.avatar_url || null,
			bio: settings.bio || null,
			isVerified: settings.verified_badge === "true",
		};
	})();

	const previewSettings = (() => {
		const settings = settingsQuery.data ?? {};
		return {
			brandingEnabled: settings.branding_enabled !== "false",
			brandingText: settings.branding_text || "Powered by LinkDen",
			bannerPreset: settings.banner_enabled === "true" ? (settings.banner_preset || null) : null,
			bannerEnabled: settings.banner_enabled === "true",
			};
	})();

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
		setShowAddMenu(false);
		const id = generateId();
		const position = blocks.length;
		const defaults: Record<string, string> = {
			link: "New Link",
			header: "Section Header",
			social_icons: "Social Icons",
			embed: "Embed",
			contact_form: "Contact Form",
		};
		try {
			await createBlock.mutateAsync({
				id,
				type,
				title: defaults[type] ?? "New Block",
				position,
				isEnabled: true,
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

	const handleDragStart = (e: React.DragEvent, id: string) => {
		setDraggedId(id);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", id);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleDrop = async (e: React.DragEvent, targetId: string) => {
		e.preventDefault();
		if (!draggedId || draggedId === targetId) {
			setDraggedId(null);
			return;
		}

		const draggedIndex = blocks.findIndex((b) => b.id === draggedId);
		const targetIndex = blocks.findIndex((b) => b.id === targetId);
		if (draggedIndex === -1 || targetIndex === -1) return;

		const reordered = [...blocks];
		const [removed] = reordered.splice(draggedIndex, 1);
		reordered.splice(targetIndex, 0, removed);

		const updates = reordered.map((b, i) => ({ id: b.id, position: i }));

		setDraggedId(null);
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

	const previewElement = (
		<PhoneFrame previewDark={previewMode === "dark"}>
			<PreviewContent
				profile={previewProfile}
				blocks={previewBlocksData}
				socialNetworks={previewSocialNetworks}
				settings={previewSettings}
				themeColors={previewThemeColors}
				colorMode={previewMode}
			/>
		</PhoneFrame>
	);

	return (
		<div className="space-y-4">
			<PageHeader
				title="Builder"
				description={hasDrafts ? "You have unpublished changes" : "All changes are live"}
				actions={
					<>
						<a
							href="/"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							<ExternalLink className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">View Live</span>
						</a>
						<Button
							size="sm"
							variant={hasDrafts ? "default" : "outline"}
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
						>
							<Upload className="mr-1.5 h-3.5 w-3.5" />
							{publishAll.isPending ? "Publishing..." : "Publish"}
						</Button>
						<div className="relative">
							<Button size="sm" onClick={() => setShowAddMenu(!showAddMenu)}>
								<Plus className="mr-1.5 h-3.5 w-3.5" />
								<span className="hidden sm:inline">Add Block</span>
								<span className="sm:hidden">Add</span>
								<ChevronDown className="ml-1 h-3 w-3" />
							</Button>
							{showAddMenu && (
								<>
									<div
										className="fixed inset-0 z-30"
										onClick={() => setShowAddMenu(false)}
										aria-hidden="true"
									/>
									<div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-border shadow-xl overflow-hidden">
										{BLOCK_TYPES.map((bt) => {
											const BIcon = bt.icon;
											return (
												<button
													key={bt.type}
													type="button"
													onClick={() => handleAddBlock(bt.type)}
													className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs hover:bg-muted transition-colors"
												>
													<BIcon className="h-3.5 w-3.5 text-muted-foreground" />
													<div className="text-left">
														<div className="font-medium">{bt.label}</div>
														<div className="text-[11px] text-muted-foreground">
															{bt.description}
														</div>
													</div>
												</button>
											);
										})}
									</div>
								</>
							)}
						</div>
					</>
				}
			/>

			{/* Two panel layout */}
			<div className="flex gap-6">
				{/* Left panel: block list */}
				<div className="flex-1 min-w-0 space-y-2">
					{blocksQuery.isLoading ? (
						<SkeletonRows count={3} />
					) : blocks.length === 0 ? (
						<EmptyState
							icon={Blocks}
							title="No blocks yet"
							description='Click "Add Block" to start building your page'
						/>
					) : (
						<div role="list" aria-label="Page blocks">
							{blocks.map((block) => (
								<div key={block.id} role="listitem" className="mb-2" data-block-id={block.id}>
									<BlockRow
										block={block}
										isDragged={draggedId === block.id}
										onDragStart={(e) => handleDragStart(e, block.id)}
										onDragOver={handleDragOver}
										onDrop={(e) => handleDrop(e, block.id)}
										onToggle={() => handleToggle(block.id, block.isEnabled)}
										onEdit={() => setEditingBlock(block)}
										onDelete={() => handleDelete(block.id)}
									/>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Right panel: phone preview (desktop) */}
				<div className="hidden w-[380px] shrink-0 lg:block">
					<div className="sticky top-6">
						<div className="mb-3 flex items-center justify-between">
							<span className="text-xs font-medium">Preview</span>
							<button
								type="button"
								onClick={() => setPreviewMode((m) => (m === "light" ? "dark" : "light"))}
								className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
								aria-label={`Switch to ${previewMode === "dark" ? "light" : "dark"} preview`}
							>
								{previewMode === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
								{previewMode === "dark" ? "Dark" : "Light"}
							</button>
						</div>
						{previewElement}
					</div>
				</div>
			</div>

			{/* Mobile preview sheet */}
			<MobilePreviewSheet
				open={showMobilePreview}
				onOpenChange={setShowMobilePreview}
			>
				{previewElement}
			</MobilePreviewSheet>

			{/* Edit panel */}
			{editingBlock && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/30"
						onClick={() => { setEditingBlock(null); setEditingOverrides(null); }}
						aria-hidden="true"
					/>
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
				</>
			)}
		</div>
	);
}
