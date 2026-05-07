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

const DUMMY_SOCIAL_NETWORKS = [
	{
		slug: "twitter",
		name: "Twitter",
		url: "https://twitter.com",
		hex: "#1DA1F2",
		svgPath:
			"M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z",
	},
	{
		slug: "github",
		name: "GitHub",
		url: "https://github.com",
		hex: "#181717",
		svgPath:
			"M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
	},
	{
		slug: "linkedin",
		name: "LinkedIn",
		url: "https://linkedin.com",
		hex: "#0A66C2",
		svgPath:
			"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
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
		socialIconShape?: "circle" | "rounded-square";
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
		bannerPreset: settings.banner_enabled === "true" ? settings.banner_preset || null : null,
		bannerMode: (settings.banner_mode as "preset" | "custom") || "preset",
		bannerCustomUrl: settings.banner_custom_url || undefined,
		customCss: settings.custom_css || null,
		socialIconShape: (settings.social_icon_shape as "circle" | "rounded-square") || "circle",
	};

	// Merge overrides with live data — always use dummy blocks
	const profile = { ...liveProfile, ...overrides?.profile };
	const blocks = DUMMY_BLOCKS;
	const themeColors = overrides?.themeColors ?? liveThemeColors;
	const mergedSettings = { ...liveSettings, ...overrides?.settings };

	function handleCopyLink() {
		const url = typeof window !== "undefined" ? window.location.origin : "";
		navigator.clipboard
			.writeText(url)
			.then(() => {
				toast.success("Link copied");
			})
			.catch(() => {
				toast.error("Failed to copy");
			});
	}

	return (
		<div className={className}>
			{showHeader && (
				<div className="mb-3 flex items-center justify-between px-1">
					<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
						Preview
					</span>
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
					socialNetworks={DUMMY_SOCIAL_NETWORKS}
					settings={mergedSettings}
					themeColors={themeColors}
					colorMode={previewMode}
				/>
			</PhoneFrame>
		</div>
	);
}
