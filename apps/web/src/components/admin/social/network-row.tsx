"use client";

import { useTheme } from "next-themes";
import type { socialBrands } from "@linkden/ui/social-brands";
import { getAccessibleIconFill, isLowLuminance } from "@linkden/ui/color-contrast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn, getAdminThemeColors } from "@/lib/utils";
import {
	isFullUrlTemplate,
	getPrefix,
	getSuffix,
	extractUsername,
	buildUrl,
} from "@/lib/social-url-utils";
import type { NetworkDraft } from "./social-constants";

type SocialBrand = (typeof socialBrands)[number];

export function NetworkRow({
	social,
	draft,
	onUrlChange,
	onToggle,
	animationDelay,
}: {
	social: SocialBrand;
	draft: NetworkDraft;
	onUrlChange: (slug: string, url: string) => void;
	onToggle: (slug: string) => void;
	animationDelay?: number;
}) {
	const { resolvedTheme } = useTheme();
	const template = social.urlTemplate;
	const fullUrlMode = isFullUrlTemplate(template);
	const prefix = fullUrlMode ? "" : getPrefix(template);
	const suffix = fullUrlMode ? "" : getSuffix(template);
	const displayValue = fullUrlMode
		? draft.url
		: extractUsername(draft.url, template);

	const { bg: adminBg, fg: adminFg } = getAdminThemeColors(resolvedTheme);
	const fillColor = draft.isActive
		? getAccessibleIconFill(social.hex, adminBg, adminFg)
		: "#9ca3af";
	const needsRing = isLowLuminance(social.hex);

	const toggleDescriptionId = `toggle-desc-${social.slug}`;

	return (
		<div
			role="listitem"
			className={cn(
				"flex rounded-xl px-2 sm:px-4 py-2.5 sm:py-3.5 transition-all",
				draft.isActive
					? "border border-primary/20 bg-white/[0.03] backdrop-blur-sm shadow-sm"
					: "group border border-transparent hover:bg-accent/60",
			)}
		>
			<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
				{/* Icon + Name row */}
				<div className="flex items-center gap-2 sm:gap-3">
					<div
						className={cn(
							"flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl transition-transform",
							draft.isActive
								? ""
								: "bg-muted/50 group-hover:scale-105",
							needsRing && draft.isActive && "ring-1 ring-border dark:ring-white/20",
						)}
						style={
							draft.isActive
								? { backgroundColor: `${social.hex}15` }
								: undefined
						}
					>
						<svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true">
							<path
								d={social.svgPath}
								fill={fillColor}
							/>
						</svg>
					</div>

					<label htmlFor={`input-${social.slug}`} className="sm:w-28 shrink-0 truncate text-xs font-medium text-foreground cursor-pointer">
						{social.name}
					</label>
				</div>

				{/* URL input + toggle */}
				<div className="flex items-center gap-2 sm:gap-3 sm:flex-1">
				<div className="min-w-0 flex-1">
					{fullUrlMode ? (
						<Input
							id={`input-${social.slug}`}
							value={draft.url}
							onChange={(e) =>
								onUrlChange(social.slug, e.target.value)
							}
							placeholder="https://..."
							className="h-8 text-xs"
							aria-label={`URL for ${social.name}`}
						/>
					) : (
						<div className="flex items-center rounded-lg border border-input bg-transparent h-8 overflow-hidden focus-within:ring-1 focus-within:ring-ring">
							{prefix && (
								<span className="shrink-0 select-none pl-2.5 text-xs text-muted-foreground">
									{prefix}
								</span>
							)}
							<input
								id={`input-${social.slug}`}
								value={displayValue}
								onChange={(e) =>
									onUrlChange(
										social.slug,
										buildUrl(e.target.value, template),
									)
								}
								placeholder="username"
								className="min-w-0 flex-1 bg-transparent px-1.5 text-xs outline-none placeholder:text-muted-foreground/50"
								aria-label={`URL for ${social.name}`}
							/>
							{suffix && (
								<span className="shrink-0 select-none pr-2.5 text-xs text-muted-foreground">
									{suffix}
								</span>
							)}
						</div>
					)}
				</div>

				<Switch
					checked={draft.isActive}
					onCheckedChange={() => onToggle(social.slug)}
					disabled={!draft.url}
					aria-label={`Toggle ${social.name}`}
					aria-describedby={!draft.url ? toggleDescriptionId : undefined}
					className={cn(!draft.url && "opacity-40 cursor-not-allowed")}
				/>
				{!draft.url && (
					<span id={toggleDescriptionId} className="sr-only">Enter a URL to enable</span>
				)}
				</div>
			</div>

		</div>
	);
}
