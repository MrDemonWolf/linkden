"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sun, Moon, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { PhoneFrame } from "@/components/admin/phone-frame";
import { PreviewContent } from "@/components/admin/preview-content";
import { getThemeColors, type ThemeColors } from "@/components/public/public-page";
import { socialBrandMap } from "@linkden/ui/social-brands";
import { cn } from "@/lib/utils";
import type { Block } from "@/components/admin/builder/builder-constants";

interface PreviewOverrides {
	profile?: {
		name?: string;
		bio?: string | null;
		image?: string | null;
		isVerified?: boolean;
	};
	blocks?: Array<{
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
	}>;
	settings?: {
		brandingEnabled?: boolean;
		brandingText?: string;
		bannerEnabled?: boolean;
		bannerPreset?: string | null;
		bannerMode?: "preset" | "custom";
		bannerCustomUrl?: string | null;
		customCss?: string | null;
	};
	socialNetworks?: Array<{ slug: string; name: string; url: string; hex: string; svgPath: string }>;
	themeColors?: ThemeColors;
}

interface SharedPreviewProps {
	overrides?: PreviewOverrides;
	className?: string;
	mode?: "light" | "dark";
	onModeChange?: (mode: "light" | "dark") => void;
	showHeader?: boolean;
}

export function SharedPreview({ overrides, className, mode: controlledMode, onModeChange, showHeader = true }: SharedPreviewProps) {
	const [internalMode, setInternalMode] = useState<"light" | "dark">("light");
	const previewMode = controlledMode ?? internalMode;

	const handleModeChange = (m: "light" | "dark") => {
		if (controlledMode === undefined) setInternalMode(m);
		onModeChange?.(m);
	};

	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const socialsQuery = useQuery(trpc.social.list.queryOptions({ activeOnly: true }));

	const settings = settingsQuery.data ?? {};

	const liveProfile = {
		name: settings.profile_name || "Your Name",
		email: "",
		image: settings.avatar_url || null,
		bio: settings.bio || null,
		isVerified: settings.verified_badge === "true",
	};

	const liveBlocks = ((blocksQuery.data ?? []) as unknown as Block[])
		.filter((b) => b.isEnabled)
		.map((b) => ({
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
		}));

	const liveSocialNetworks = (
		(socialsQuery.data ?? []) as Array<{ isActive: boolean; url: string; slug: string }>
	)
		.filter((s) => s.isActive && s.url)
		.map((s) => {
			const brand = socialBrandMap.get(s.slug);
			if (!brand) return null;
			return { slug: s.slug, name: brand.name, url: s.url, hex: brand.hex, svgPath: brand.svgPath };
		})
		.filter(Boolean) as Array<{ slug: string; name: string; url: string; hex: string; svgPath: string }>;

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

	const profile = { ...liveProfile, ...overrides?.profile };
	const blocks = overrides?.blocks ?? liveBlocks;
	const socialNetworks = overrides?.socialNetworks ?? liveSocialNetworks;
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
					<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Preview</span>
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
					socialNetworks={socialNetworks}
					settings={mergedSettings}
					themeColors={themeColors}
					colorMode={previewMode}
				/>
			</PhoneFrame>
		</div>
	);
}
