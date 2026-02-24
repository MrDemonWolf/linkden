"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	GripVertical,
	Plus,
	Pencil,
	Trash2,
	Link as LinkIcon,
	Type,
	Share2,
	Code,
	MessageSquare,
	Eye,
	EyeOff,
	X,
	Sun,
	Moon,
	Smartphone,
	ChevronDown,
	Blocks,
	Upload,
	ExternalLink,
} from "lucide-react";
import { trpc, queryClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { themePresets } from "@linkden/ui/themes";
import { PhoneFrame } from "@/components/admin/phone-frame";
import { PreviewContent } from "@/components/admin/preview-content";
import { getThemeColors } from "@/components/public/public-page";

const BLOCK_TYPES = [
	{ type: "link" as const, label: "Link", icon: LinkIcon, description: "A clickable link button" },
	{ type: "header" as const, label: "Header", icon: Type, description: "A text header/divider" },
	{ type: "social_icons" as const, label: "Social Icons", icon: Share2, description: "Row of social media icons" },
	{ type: "embed" as const, label: "Embed", icon: Code, description: "YouTube, Spotify, or other embed" },
	{ type: "contact_form" as const, label: "Contact Form", icon: MessageSquare, description: "Inline contact form" },
] as const;

type BlockType = (typeof BLOCK_TYPES)[number]["type"];

interface Block {
	id: string;
	type: string;
	title: string | null;
	url: string | null;
	icon: string | null;
	embedType: string | null;
	embedUrl: string | null;
	socialIcons: string | null;
	isEnabled: boolean;
	position: number;
	status: "published" | "draft";
	scheduledStart: Date | null;
	scheduledEnd: Date | null;
	config: string | null;
	createdAt: Date;
	updatedAt: Date;
}

function generateId() {
	return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Edit Panel Component ----
function BlockEditPanel({
	block,
	onClose,
	onSave,
	isSaving,
	contactDelivery,
	onDeliveryChange,
}: {
	block: Block;
	onClose: () => void;
	onSave: (data: Partial<Block>) => void;
	isSaving: boolean;
	contactDelivery: string;
	onDeliveryChange: (value: string) => void;
}) {
	const [title, setTitle] = useState(block.title ?? "");
	const [url, setUrl] = useState(block.url ?? "");
	const [icon, setIcon] = useState(block.icon ?? "");
	const [embedType, setEmbedType] = useState(block.embedType ?? "");
	const [embedUrl, setEmbedUrl] = useState(block.embedUrl ?? "");
	const [socialIcons, setSocialIcons] = useState(block.socialIcons ?? "");
	const [config, setConfig] = useState(block.config ?? "{}");
	const [activeTab, setActiveTab] = useState<"content" | "style" | "options" | "schedule">("content");
	const [scheduledStart, setScheduledStart] = useState(
		block.scheduledStart ? new Date(block.scheduledStart).toISOString().slice(0, 16) : "",
	);
	const [scheduledEnd, setScheduledEnd] = useState(
		block.scheduledEnd ? new Date(block.scheduledEnd).toISOString().slice(0, 16) : "",
	);

	const handleSave = () => {
		onSave({
			id: block.id,
			title: title || null,
			url: url || null,
			icon: icon || null,
			embedType: embedType || null,
			embedUrl: embedUrl || null,
			socialIcons: socialIcons || null,
			config: config || null,
			scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
			scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
		});
	};

	const tabs = ["content", "style", "options", "schedule"] as const;

	return (
		<div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/15 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-lg sm:w-96">
			<div className="flex h-full flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b px-4 py-3">
					<h3 className="text-sm font-medium">
						Edit {block.type.replace("_", " ")}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b">
					{tabs.map((tab) => (
						<button
							key={tab}
							type="button"
							onClick={() => setActiveTab(tab)}
							className={cn(
								"flex-1 py-2 text-xs font-medium capitalize transition-colors",
								activeTab === tab
									? "border-b-2 border-primary text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{tab}
						</button>
					))}
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4 space-y-3">
					{activeTab === "content" && (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="edit-title">Title</Label>
								<Input
									id="edit-title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Block title"
								/>
							</div>
							{(block.type === "link") && (
								<div className="space-y-1.5">
									<Label htmlFor="edit-url">URL</Label>
									<Input
										id="edit-url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="https://example.com"
									/>
								</div>
							)}
							{block.type === "embed" && (
								<>
									<div className="space-y-1.5">
										<Label htmlFor="edit-embed-type">Embed Type</Label>
										<select
											id="edit-embed-type"
											value={embedType}
											onChange={(e) => setEmbedType(e.target.value)}
											className="dark:bg-input/30 border-input h-8 w-full border bg-transparent px-2.5 text-xs outline-none"
										>
											<option value="">Select type</option>
											<option value="youtube">YouTube</option>
											<option value="spotify">Spotify</option>
											<option value="soundcloud">SoundCloud</option>
											<option value="custom">Custom</option>
										</select>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="edit-embed-url">Embed URL</Label>
										<Input
											id="edit-embed-url"
											value={embedUrl}
											onChange={(e) => setEmbedUrl(e.target.value)}
											placeholder="https://youtube.com/watch?v=..."
										/>
									</div>
								</>
							)}
							{block.type === "social_icons" && (
								<div className="space-y-1.5">
									<Label htmlFor="edit-social">Social Icons (JSON)</Label>
									<textarea
										id="edit-social"
										value={socialIcons}
										onChange={(e) => setSocialIcons(e.target.value)}
										placeholder='[{"platform":"twitter","url":"https://twitter.com/you"}]'
										rows={4}
										className="dark:bg-input/30 border-input w-full border bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none"
									/>
								</div>
							)}
						</>
					)}

					{activeTab === "style" && (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="edit-icon">Icon name</Label>
								<Input
									id="edit-icon"
									value={icon}
									onChange={(e) => setIcon(e.target.value)}
									placeholder="e.g. globe, github, twitter"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-config">
									Config (JSON)
								</Label>
								<textarea
									id="edit-config"
									value={config}
									onChange={(e) => setConfig(e.target.value)}
									rows={6}
									placeholder='{"style":"outline","animation":"none"}'
									className="dark:bg-input/30 border-input w-full border bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none"
								/>
							</div>
						</>
					)}

					{activeTab === "options" && (
						<>
							{block.type === "contact_form" ? (
								<div className="space-y-3">
									<div className="space-y-1.5">
										<Label htmlFor="edit-delivery">Delivery mode</Label>
										<p className="text-[11px] text-muted-foreground">
											How contact form submissions are handled
										</p>
										<select
											id="edit-delivery"
											value={contactDelivery}
											onChange={(e) => onDeliveryChange(e.target.value)}
											className="dark:bg-input/30 border-input h-8 w-full rounded-md border bg-transparent px-2.5 text-xs outline-none"
										>
											<option value="database">Database only</option>
											<option value="email">Email notification</option>
											<option value="both">Database + Email</option>
										</select>
									</div>
								</div>
							) : (
								<div className="space-y-3">
									<p className="text-xs text-muted-foreground">
										Additional options for this block can be configured in the
										config JSON on the Style tab. Common options:
									</p>
									<ul className="space-y-1 text-xs text-muted-foreground">
										<li>- <code>noFollow</code>: Adds rel="nofollow" to links</li>
										<li>- <code>newTab</code>: Opens link in new tab</li>
										<li>- <code>animation</code>: "none" | "pulse" | "shake"</li>
										<li>- <code>thumbnail</code>: URL for link thumbnail</li>
									</ul>
								</div>
							)}
						</>
					)}

					{activeTab === "schedule" && (
						<>
							<p className="text-xs text-muted-foreground">
								Optionally schedule this block to only be visible during a
								specific time window.
							</p>
							<div className="space-y-1.5">
								<Label htmlFor="edit-start">Start date/time</Label>
								<Input
									id="edit-start"
									type="datetime-local"
									value={scheduledStart}
									onChange={(e) => setScheduledStart(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-end">End date/time</Label>
								<Input
									id="edit-end"
									type="datetime-local"
									value={scheduledEnd}
									onChange={(e) => setScheduledEnd(e.target.value)}
								/>
							</div>
							{(scheduledStart || scheduledEnd) && (
								<Button
									variant="ghost"
									size="xs"
									onClick={() => {
										setScheduledStart("");
										setScheduledEnd("");
									}}
								>
									Clear schedule
								</Button>
							)}
						</>
					)}
				</div>

				{/* Footer */}
				<div className="border-t px-4 py-3">
					<Button className="w-full" onClick={handleSave} disabled={isSaving}>
						{isSaving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</div>
		</div>
	);
}

// ---- Main Builder Page ----
export default function BuilderPage() {
	const qc = useQueryClient();
	const [editingBlock, setEditingBlock] = useState<Block | null>(null);
	const [showAddMenu, setShowAddMenu] = useState(false);
	const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
	const [showMobilePreview, setShowMobilePreview] = useState(false);
	const [draggedId, setDraggedId] = useState<string | null>(null);

	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const blocks: Block[] = (blocksQuery.data as Block[] | undefined) ?? [];
	const hasDraftQuery = useQuery(trpc.blocks.hasDraft.queryOptions());
	const hasDrafts = hasDraftQuery.data?.hasDraft ?? false;
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());

	// Resolve theme colors for phone preview
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
			toast.success("Block updated");
		} catch {
			toast.error("Failed to update block");
		}
	};

	// HTML drag & drop handlers
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

	const blockTypeIcon = (type: string) => {
		const found = BLOCK_TYPES.find((t) => t.type === type);
		return found ? found.icon : LinkIcon;
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Builder</h1>
					<p className="text-xs text-muted-foreground">
						{hasDrafts
							? "You have unpublished changes"
							: "All changes are live"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<a
						href="/"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						<ExternalLink className="h-3.5 w-3.5" />
						View Live
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
						Add Block
						<ChevronDown className="ml-1 h-3 w-3" />
					</Button>
					{showAddMenu && (
						<>
							<div
								className="fixed inset-0 z-30"
								onClick={() => setShowAddMenu(false)}
								onKeyDown={() => {}}
							/>
							<div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl bg-card backdrop-blur-2xl border border-white/15 dark:border-white/10 shadow-lg overflow-hidden">
								{BLOCK_TYPES.map((bt) => {
									const Icon = bt.icon;
									return (
										<button
											key={bt.type}
											type="button"
											onClick={() => handleAddBlock(bt.type)}
											className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs hover:bg-muted transition-colors"
										>
											<Icon className="h-3.5 w-3.5 text-muted-foreground" />
											<div className="text-left">
												<div className="font-medium">{bt.label}</div>
												<div className="text-[10px] text-muted-foreground">
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
				</div>
			</div>

			{/* Two panel layout */}
			<div className="flex gap-6">
				{/* Left panel: block list */}
				<div className="flex-1 min-w-0 space-y-2">
					{blocksQuery.isLoading ? (
						<div className="space-y-2">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={`skel-${i}`} className="h-14" />
							))}
						</div>
					) : blocks.length === 0 ? (
						<Card>
							<CardContent className="py-12 text-center">
								<Blocks className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
								<p className="text-sm font-medium">No blocks yet</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Click "Add Block" to start building your page
								</p>
							</CardContent>
						</Card>
					) : (
						blocks.map((block) => {
							const Icon = blockTypeIcon(block.type);
							return (
								<div
									key={block.id}
									draggable
									onDragStart={(e) => handleDragStart(e, block.id)}
									onDragOver={handleDragOver}
									onDrop={(e) => handleDrop(e, block.id)}
									className={cn(
										"group flex items-center gap-2 rounded-xl bg-card backdrop-blur-xl border border-white/15 dark:border-white/10 shadow-sm px-3 py-2.5 transition-all",
										draggedId === block.id && "opacity-50",
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
										<Icon className="h-3.5 w-3.5 text-muted-foreground" />
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
												/>
											)}
										</div>
										{block.url && (
											<p className="truncate text-[10px] text-muted-foreground">
												{block.url}
											</p>
										)}
									</div>

									<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
										<button
											type="button"
											onClick={() => handleToggle(block.id, block.isEnabled)}
											className={cn(
												"flex h-6 w-6 items-center justify-center transition-colors",
												block.isEnabled
													? "text-green-500 hover:text-green-600"
													: "text-muted-foreground hover:text-foreground",
											)}
											title={block.isEnabled ? "Disable" : "Enable"}
										>
											{block.isEnabled ? (
												<Eye className="h-3.5 w-3.5" />
											) : (
												<EyeOff className="h-3.5 w-3.5" />
											)}
										</button>
										<button
											type="button"
											onClick={() => setEditingBlock(block)}
											className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
											title="Edit"
										>
											<Pencil className="h-3.5 w-3.5" />
										</button>
										<button
											type="button"
											onClick={() => handleDelete(block.id)}
											className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-destructive"
											title="Delete"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Right panel: phone preview (desktop) */}
				<div className="hidden w-[320px] shrink-0 lg:block">
					<div className="sticky top-6">
						<div className="mb-3 flex items-center justify-between">
							<span className="text-xs font-medium">Preview</span>
							<button
								type="button"
								onClick={() => setPreviewMode((m) => (m === "light" ? "dark" : "light"))}
								className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
							>
								{previewMode === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
								{previewMode === "dark" ? "Dark" : "Light"}
							</button>
						</div>
						<PhoneFrame previewDark={previewMode === "dark"}>
							<PreviewContent
								profile={previewProfile}
								blocks={blocks.filter((b) => b.isEnabled).map((b) => ({
									id: b.id,
									type: b.type,
									title: b.title,
								}))}
								settings={previewSettings}
								themeColors={previewThemeColors}
								colorMode={previewMode}
							/>
						</PhoneFrame>
					</div>
				</div>
			</div>

			{/* Mobile preview FAB */}
			<button
				type="button"
				onClick={() => setShowMobilePreview(true)}
				className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
			>
				<Smartphone className="h-5 w-5" />
			</button>

			{/* Mobile preview overlay */}
			{showMobilePreview && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 lg:hidden">
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowMobilePreview(false)}
							className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-card backdrop-blur-xl text-foreground shadow"
						>
							<X className="h-4 w-4" />
						</button>
						<PhoneFrame previewDark={previewMode === "dark"}>
							<PreviewContent
								profile={previewProfile}
								blocks={blocks.filter((b) => b.isEnabled).map((b) => ({
									id: b.id,
									type: b.type,
									title: b.title,
								}))}
								settings={previewSettings}
								themeColors={previewThemeColors}
								colorMode={previewMode}
							/>
						</PhoneFrame>
					</div>
				</div>
			)}

			{/* Edit panel */}
			{editingBlock && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/30"
						onClick={() => setEditingBlock(null)}
						onKeyDown={() => {}}
					/>
					<BlockEditPanel
						block={editingBlock}
						onClose={() => setEditingBlock(null)}
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
				</>
			)}
		</div>
	);
}
