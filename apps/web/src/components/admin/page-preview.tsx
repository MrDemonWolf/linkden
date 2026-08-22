"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Moon, Sun } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { toast } from "sonner";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { PhoneFrame } from "@/components/admin/phone-frame";
import { type ColorMode, PublicPage } from "@/components/public/public-page";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
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
	/** Column-level controls (collapse, peek) appended after the phone toolbar. */
	headerEnd?: React.ReactNode;
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

function defaultMode(pref: string | undefined): ColorMode {
	if (pref === "dark") return "dark";
	if (pref === "system" && typeof window !== "undefined") {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}
	return "light";
}

/**
 * The admin previewer: the real `PublicPage` inside a phone frame, fed by the
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
	headerEnd,
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
			if (!Array.isArray(path) || (path[0] !== "settings" && path[0] !== "social")) return;
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
	const liveBlocks = (blocksQuery.data ?? []).filter(
		(b) =>
			b.isEnabled &&
			!(b.type === "connect" && !settings?.contactFormEnabled) &&
			!(b.type === "vcard" && !settings?.vcardEnabled),
	);
	const blocks = overrides?.blocks ?? liveBlocks;
	const isSample = blocks.length === 0;

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
			.writeText(window.location.origin)
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
							<Tooltip content="Light preview">
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
							</Tooltip>
							<Tooltip content="Dark preview">
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
							</Tooltip>
						</div>
						<Tooltip content="Copy link">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Copy live page link"
								onClick={handleCopyLink}
								className="text-muted-foreground"
							>
								<Copy className="h-3.5 w-3.5" />
							</Button>
						</Tooltip>
						<Tooltip content="Open live page">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Open live page"
								className="text-muted-foreground"
								nativeButton={false}
								render={<a href="/" target="_blank" rel="noopener noreferrer" />}
							>
								<ExternalLink className="h-3.5 w-3.5" />
							</Button>
						</Tooltip>
						{headerEnd}
					</div>
				</div>
			)}
			{isError ? (
				<QueryError message="Couldn't load the preview" onRetry={refetch} />
			) : (
				<PhoneFrame previewDark={previewMode === "dark"} isLoading={!data || !blocksQuery.data}>
					{data && <PublicPage data={data} previewMode={previewMode} />}
				</PhoneFrame>
			)}
		</div>
	);
}
