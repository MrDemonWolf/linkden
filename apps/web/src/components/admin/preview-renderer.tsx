"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sun, Moon, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { PhoneFrame } from "@/components/admin/phone-frame";
import { PreviewContent } from "@/components/admin/preview-content";
import { getThemeColors, type ThemeColors } from "@/components/public/public-page";
import { cn } from "@/lib/utils";

// ── Dummy blocks for preview ────────────────────────────────────────────────
// These provide a realistic preview without needing real block data.

const DUMMY_BLOCKS: Array<{
	id: string;
	type: string;
	title: string | null;
	url: string | null;
	icon: string | null;
	embedType: string | null;
	embedUrl: string | null;
	socialIcons: string | null;
	config: string | null;
	position: number;
}> = [
	{
		id: "preview-header-1",
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
		id: "preview-link-1",
		type: "link",
		title: "My Website",
		url: "https://example.com",
		icon: null,
		embedType: null,
		embedUrl: null,
		socialIcons: null,
		config: JSON.stringify({ emoji: "🌐", emojiPosition: "left" }),
		position: 1,
	},
	{
		id: "preview-link-2",
		type: "link",
		title: "Latest Project",
		url: "https://example.com/project",
		icon: null,
		embedType: null,
		embedUrl: null,
		socialIcons: null,
		config: JSON.stringify({ emoji: "🚀", emojiPosition: "left", isHighlighted: true }),
		position: 2,
	},
	{
		id: "preview-link-3",
		type: "link",
		title: "Get in Touch",
		url: "https://example.com/contact",
		icon: null,
		embedType: null,
		embedUrl: null,
		socialIcons: null,
		config: JSON.stringify({ emoji: "✉️", emojiPosition: "left", isOutlined: true }),
		position: 3,
	},
];

// ── Overrides interface ─────────────────────────────────────────────────────

interface PreviewRendererOverrides {
	profile?: {
		name?: string;
		bio?: string | null;
		image?: string | null;
		isVerified?: boolean;
	};
	themeColors?: ThemeColors;
	settings?: {
		brandingEnabled?: boolean;
		brandingText?: string;
		bannerEnabled?: boolean;
		bannerPreset?: string | null;
		bannerMode?: "preset" | "custom";
		bannerCustomUrl?: string | null;
		customCss?: string | null;
	};
}

interface PreviewRendererProps {
	overrides?: PreviewRendererOverrides;
	className?: string;
	mode?: "light" | "dark";
	onModeChange?: (mode: "light" | "dark") => void;
	showHeader?: boolean;
}

/**
 * PreviewRenderer renders the public page inside an iPhone-style phone frame
 * using real profile data (name, bio, avatar) but dummy/sample block content.
 *
 * This replaces SharedPreview for contexts where we want a representative
 * preview without requiring real blocks to exist (e.g. appearance page).
 */
export function PreviewRenderer({
	overrides,
	className,
	mode: controlledMode,
	onModeChange,
	showHeader = true,
}: PreviewRendererProps) {
	const [internalMode, setInternalMode] = useState<"light" | "dark">("light");
	const previewMode = controlledMode ?? internalMode;

	const handleModeChange = (m: "light" | "dark") => {
		if (controlledMode === undefined) setInternalMode(m);
		onModeChange?.(m);
	};

	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const settings = settingsQuery.data ?? {};

	const [systemPrefersDark, setSystemPrefersDark] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		setSystemPrefersDark(mq.matches);
		const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	useEffect(() => {
		if (controlledMode !== undefined) return;
		const pref = settings.default_color_mode;
		if (pref === "dark") setInternalMode("dark");
		else if (pref === "system") setInternalMode(systemPrefersDark ? "dark" : "light");
		else setInternalMode("light");
	}, [controlledMode, settings.default_color_mode, systemPrefersDark]);

	// Real profile data from settings
	const liveProfile = {
		name: settings.profile_name || "Your Name",
		email: "",
		image: settings.avatar_url || null,
		bio: settings.bio || null,
		isVerified: settings.verified_badge === "true",
	};

	const themePresetName = settings.theme_preset || "default";
	const liveThemeColors = getThemeColors(themePresetName, previewMode);

	const liveSettings = {
		brandingEnabled: settings.branding_enabled !== "false",
		brandingText: settings.branding_text || "Powered by LinkDen",
		bannerEnabled: settings.banner_enabled === "true",
		bannerPreset: settings.banner_enabled === "true" ? (settings.banner_preset || null) : null,
		bannerMode: (settings.banner_mode as "preset" | "custom") || "preset",
		bannerCustomUrl: settings.banner_custom_url || undefined,
		customCss: settings.custom_css || null,
	};

	// Merge overrides with live data — always use dummy blocks
	const profile = { ...liveProfile, ...overrides?.profile };
	const blocks = DUMMY_BLOCKS;
	const themeColors = overrides?.themeColors ?? liveThemeColors;
	const mergedSettings = { ...liveSettings, ...overrides?.settings };

	function handleCopyLink() {
		const url = typeof window !== "undefined" ? window.location.origin : "";
		navigator.clipboard.writeText(url).then(() => {
			toast.success("Link copied");
		}).catch(() => {
			toast.error("Failed to copy");
		});
	}

	return (
		<div className={className}>
			{showHeader && (
				<div className="mb-3 flex items-center justify-between px-1">
					<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Preview</span>
					<div className="flex items-center gap-1">
						<div className="flex rounded-lg border border-border/50 p-0.5 bg-muted/30">
							<button
								type="button"
								onClick={() => handleModeChange("light")}
								className={cn(
									"flex items-center justify-center rounded-md p-1.5 transition-all",
									previewMode === "light"
										? "bg-white/20 text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
								aria-label="Light preview"
							>
								<Sun className="h-3 w-3" />
							</button>
							<button
								type="button"
								onClick={() => handleModeChange("dark")}
								className={cn(
									"flex items-center justify-center rounded-md p-1.5 transition-all",
									previewMode === "dark"
										? "bg-white/20 text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
								aria-label="Dark preview"
							>
								<Moon className="h-3 w-3" />
							</button>
						</div>
						<button
							type="button"
							onClick={handleCopyLink}
							className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
							aria-label="Copy live page link"
							title="Copy link"
						>
							<Copy className="h-3 w-3" />
						</button>
						<a
							href="/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
							aria-label="Open live page"
							title="Open live page"
						>
							<ExternalLink className="h-3 w-3" />
						</a>
					</div>
				</div>
			)}
			<PhoneFrame previewDark={previewMode === "dark"} isLoading={settingsQuery.isLoading}>
				<PreviewContent
					profile={profile}
					blocks={blocks}
					socialNetworks={[]}
					settings={mergedSettings}
					themeColors={themeColors}
					colorMode={previewMode}
				/>
			</PhoneFrame>
		</div>
	);
}
