"use client";

import { env } from "@linkden/env/web";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Moon, Sun } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { toast } from "sonner";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { PagePreviewViewport } from "@/components/admin/page-preview-viewport";
import { type ColorMode, PublicPage } from "@/components/public/public-page";
import { Button, buttonVariants } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

type PageData = ComponentProps<typeof PublicPage>["data"];
export type PreviewBlock = PageData["blocks"][number];

export interface PreviewOverrides {
	/** Unsaved profile edits layered over the live profile. */
	profile?: Partial<PageData["profile"]>;
	/** Unsaved setting edits, already in `public.getPage` shape (camelCase, typed). */
	settings?: Partial<PageData["settings"]>;
	/** Replace the block list entirely (builder: live block with in-progress edits applied). */
	blocks?: PreviewBlock[];
	/** Unsaved social-link edits (Links → Social) replacing the live icon row. */
	socialNetworks?: PageData["socialNetworks"];
}

interface PagePreviewProps {
	overrides?: PreviewOverrides;
	mode?: ColorMode;
	onModeChange?: (mode: ColorMode) => void;
	showHeader?: boolean;
	/** `null` drops the "Preview" label (the column above already said it) and keeps the toolbar. */
	headerLabel?: React.ReactNode;
	className?: string;
}

const FALLBACK_PROFILE: PageData["profile"] = {
	name: "Your Name",
	image: null,
	bio: null,
	isVerified: false,
};

// Only backs a page with zero blocks so theming is still previewable.
const SAMPLE_BLOCKS: PreviewBlock[] = [
	{
		id: "sample-header",
		type: "header",
		title: "My Links",
		url: null,
		icon: null,
		embedType: null,
		embedUrl: null,
		socialIcons: null,
		config: JSON.stringify({ headingLevel: "h2", textAlign: "center", showDivider: true }),
		position: 0,
	},
	{
		id: "sample-link-1",
		type: "link",
		title: "My Website",
		url: null,
		icon: null,
		embedType: null,
		embedUrl: null,
		socialIcons: null,
		config: JSON.stringify({ emoji: "🌐", emojiPosition: "left", isHighlighted: true }),
		position: 1,
	},
	{
		id: "sample-link-2",
		type: "link",
		title: "Get in Touch",
		url: null,
		icon: null,
		embedType: null,
		embedUrl: null,
		socialIcons: null,
		config: JSON.stringify({ emoji: "✉️", emojiPosition: "left", isOutlined: true }),
		position: 2,
	},
];

/**
 * An in-progress Advanced edit can be any JSON (`null`, `[]`, `1`), but every
 * block renderer reads properties off its config: hand the preview an object
 * or nothing. (Unparseable text is fine — the renderer already treats it as {}.)
 */
function previewSafe(block: PreviewBlock): PreviewBlock {
	if (!block.config) return block;
	try {
		const parsed: unknown = JSON.parse(block.config);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? block
			: { ...block, config: null };
	} catch {
		return block;
	}
}

function defaultMode(pref: string | undefined): ColorMode {
	if (pref === "dark") return "dark";
	if (pref === "system" && typeof window !== "undefined") {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}
	return "light";
}

/**
 * The admin previewer: the real `PublicPage` inside a plain document viewport, fed by the
 * same `public.getPage` payload the live page renders from (so footer text,
 * theme resolution and block rendering can't drift). Blocks come from
 * `blocks.list` instead so enabled drafts show before they're published.
 */
export function PagePreview({
	overrides,
	mode: controlledMode,
	onModeChange,
	showHeader = true,
	headerLabel = "Preview",
	className,
}: PagePreviewProps) {
	const qc = useQueryClient();
	const pageQuery = useQuery(trpc.public.getPage.queryOptions());
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());

	// Admin pages invalidate `settings.*` / `social.*` after saving but never
	// `public.getPage` — mirror those invalidations here instead of touching
	// every save site.
	useEffect(() => {
		return qc.getQueryCache().subscribe((event) => {
			if (event.type !== "updated" || event.action.type !== "invalidate") return;
			const path = event.query.queryKey[0];
			if (!Array.isArray(path) || !["settings", "social", "vcard"].includes(path[0])) return;
			qc.invalidateQueries({ queryKey: trpc.public.getPage.queryKey() });
		});
	}, [qc]);

	const [internalMode, setInternalMode] = useState<ColorMode | null>(null);
	const previewMode =
		controlledMode ?? internalMode ?? defaultMode(pageQuery.data?.settings.defaultColorMode);
	const handleModeChange = (m: ColorMode) => {
		setInternalMode(m);
		onModeChange?.(m);
	};

	const page = pageQuery.data;
	const settings = page ? { ...page.settings, ...overrides?.settings } : null;
	// Same feature gating as `public.getPage`, minus the published-only filter.
	// Applied to `overrides.blocks` too, so a caller's list can't bypass it.
	const featureVisible = (b: { type: string }) =>
		!(b.type === "connect" && !settings?.contactFormEnabled) &&
		!(b.type === "vcard" && !settings?.vcardEnabled);
	const inventory = blocksQuery.data ?? [];
	const liveBlocks = inventory.filter((b) => b.isEnabled);
	const blocks = overrides?.blocks
		? overrides.blocks.filter(featureVisible).map(previewSafe)
		: liveBlocks.filter(featureVisible);
	const isSample = blocksQuery.data?.length === 0 && blocks.length === 0;
	const includesDrafts = blocks.some((b) =>
		inventory.some((saved) => saved.id === b.id && saved.status === "draft"),
	);

	const data: PageData | null =
		page && settings
			? {
					...page,
					profile: { ...(page.profile ?? FALLBACK_PROFILE), ...overrides?.profile },
					socialNetworks: overrides?.socialNetworks ?? page.socialNetworks,
					settings,
					blocks: isSample ? SAMPLE_BLOCKS : blocks,
				}
			: null;

	const isError = pageQuery.isError || blocksQuery.isError;
	const refetch = () => {
		pageQuery.refetch();
		blocksQuery.refetch();
	};

	function handleCopyLink() {
		navigator.clipboard
			.writeText(env.NEXT_PUBLIC_SITE_URL)
			.then(() => toast.success("Link copied"))
			.catch(() => toast.error("Failed to copy"));
	}

	return (
		<div className={className}>
			{showHeader && (
				<div className="mb-4 flex min-h-8 items-center justify-between gap-2">
					<span className="flex min-w-0 items-center gap-1.5 text-small font-medium text-foreground">
						{headerLabel}
						{isSample && data && (
							<span className="rounded-full border border-border bg-surface-2 px-1.5 py-px text-micro font-medium text-muted-foreground">
								Sample
							</span>
						)}
					</span>
					<div className="flex shrink-0 items-center gap-1">
						<div className="flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
							<TooltipHint content="Light preview">
								<Button
									variant="ghost"
									size="icon"
									aria-pressed={previewMode === "light"}
									aria-label="Light preview"
									onClick={() => handleModeChange("light")}
									className={cn(
										"rounded-md text-muted-foreground",
										"aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm",
									)}
								>
									<Sun className="h-3.5 w-3.5" />
								</Button>
							</TooltipHint>
							<TooltipHint content="Dark preview">
								<Button
									variant="ghost"
									size="icon"
									aria-pressed={previewMode === "dark"}
									aria-label="Dark preview"
									onClick={() => handleModeChange("dark")}
									className={cn(
										"rounded-md text-muted-foreground",
										"aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm",
									)}
								>
									<Moon className="h-3.5 w-3.5" />
								</Button>
							</TooltipHint>
						</div>
						<TooltipHint content="Copy link">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Copy live page link"
								onClick={handleCopyLink}
								className="text-muted-foreground"
							>
								<Copy className="h-3.5 w-3.5" />
							</Button>
						</TooltipHint>
						<TooltipHint content="Open live page">
							<a
								href={env.NEXT_PUBLIC_SITE_URL}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Open live page"
								className={cn(
									buttonVariants({ variant: "ghost", size: "icon" }),
									"text-muted-foreground",
								)}
							>
								<ExternalLink className="h-3.5 w-3.5" />
							</a>
						</TooltipHint>
					</div>
				</div>
			)}
			{data && blocksQuery.data && !isError && (
				<p className="mb-3 text-xs text-muted-foreground" role="status">
					{isSample
						? "Sample content · no blocks yet"
						: includesDrafts
							? "Includes block drafts"
							: blocks.length === 0
								? "No visible blocks"
								: "Preview of enabled blocks"}
				</p>
			)}
			{isError ? (
				<QueryError message="Couldn't load the preview" onRetry={refetch} />
			) : (
				<PagePreviewViewport isLoading={!data || !blocksQuery.data}>
					{data && <PublicPage data={data} previewMode={previewMode} />}
				</PagePreviewViewport>
			)}
		</div>
	);
}
