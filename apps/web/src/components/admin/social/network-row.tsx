"use client";

import { getAccessibleIconFill, isLowLuminance } from "@linkden/ui/color-contrast";
import type { socialBrands } from "@linkden/ui/social-brands";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { getPrefix, getSuffix, isFullUrlTemplate } from "@/lib/social-url-utils";
import { cn, getAdminThemeColors } from "@/lib/utils";
import type { NetworkDraft } from "./social-constants";
import { buildSocialUrl, extractSocialHandle, handleFromUrl } from "./social-url";

type SocialBrand = (typeof socialBrands)[number];

export function NetworkRow({
	social,
	draft,
	onUrlChange,
	onToggle,
}: {
	social: SocialBrand;
	draft: NetworkDraft;
	onUrlChange: (slug: string, url: string) => void;
	onToggle: (slug: string) => void;
}) {
	const { resolvedTheme } = useTheme();
	const template = social.urlTemplate;
	const fullUrlMode = isFullUrlTemplate(template);
	// A stored URL that isn't this network's profile URL shows whole, without the
	// prefix/suffix around it (they would read as part of the link).
	const showAffixes = !fullUrlMode && (!draft.url || handleFromUrl(draft.url, template) !== null);
	const prefix = showAffixes ? getPrefix(template) : "";
	const suffix = showAffixes ? getSuffix(template) : "";
	const displayValue = fullUrlMode ? draft.url : extractSocialHandle(draft.url, template);

	const { bg: adminBg, fg: adminFg } = getAdminThemeColors(resolvedTheme);
	const fillColor = draft.isActive
		? getAccessibleIconFill(social.hex, adminBg, adminFg)
		: "#9ca3af";
	const needsRing = isLowLuminance(social.hex);

	const toggleDescriptionId = `toggle-desc-${social.slug}`;

	return (
		// Neutral container — callers own the list semantics (<li>/role="listitem").
		<div
			className={cn(
				"group @container/social-row flex rounded-lg border px-3 py-4 transition-colors sm:px-4",
				draft.isActive ? "border-border bg-card" : "border-transparent hover:bg-muted/50",
			)}
		>
			<div className="flex w-full flex-col gap-2 @min-[500px]/social-row:flex-row @min-[500px]/social-row:items-center @min-[500px]/social-row:gap-3">
				{/* Icon + Name row */}
				<div className="flex items-center gap-2 sm:gap-3">
					<div
						className={cn(
							"flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg",
							draft.isActive ? "" : "bg-muted/50",
							needsRing && draft.isActive && "ring-1 ring-border dark:ring-white/20",
						)}
						style={draft.isActive ? { backgroundColor: `${social.hex}15` } : undefined}
					>
						<svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true">
							<path d={social.svgPath} fill={fillColor} />
						</svg>
					</div>

					<label
						htmlFor={`input-${social.slug}`}
						className="@min-[500px]/social-row:w-28 shrink-0 truncate text-sm font-medium text-foreground cursor-pointer"
					>
						{social.name}
					</label>
				</div>

				{/* URL input + toggle */}
				<div className="flex items-center gap-2 @min-[500px]/social-row:flex-1 @min-[500px]/social-row:gap-3">
					<div className="min-w-0 flex-1">
						{fullUrlMode ? (
							<Input
								id={`input-${social.slug}`}
								value={draft.url}
								onChange={(e) => onUrlChange(social.slug, e.target.value)}
								placeholder="https://..."
								aria-label={`URL for ${social.name}`}
							/>
						) : (
							<InputGroup>
								{prefix && (
									<InputGroupAddon>
										<InputGroupText>{prefix}</InputGroupText>
									</InputGroupAddon>
								)}
								<InputGroupInput
									id={`input-${social.slug}`}
									value={displayValue}
									onChange={(e) =>
										onUrlChange(social.slug, buildSocialUrl(e.target.value, template))
									}
									placeholder="username"
									aria-label={`URL for ${social.name}`}
								/>
								{suffix && (
									<InputGroupAddon align="inline-end">
										<InputGroupText>{suffix}</InputGroupText>
									</InputGroupAddon>
								)}
							</InputGroup>
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
						<span id={toggleDescriptionId} className="sr-only">
							Enter a URL to enable
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
