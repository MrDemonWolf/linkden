"use client";

import { socialBrandMap } from "@linkden/ui/social-brands";
import { DynamicIcon, dynamicIconImports, type IconName } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";

/**
 * Client-side resolution of a block's `icon` column, for callers that have no
 * server-resolved glyph (the admin preview and icon picker). It pulls the
 * whole lucide dynamic-import map and the social-brand catalog, so `BlockIcon`
 * only loads this module lazily — the public page resolves icons on the server
 * (lib/block-icons.ts) and never downloads it.
 *
 * DynamicIcon resolves its glyph in an effect (client-only), so the 20×20 box
 * is reserved up front to keep SSR and hydrated layouts identical.
 */
export default function DynamicBlockIcon({
	icon,
	className,
}: {
	icon: string;
	className?: string;
}) {
	if (icon.startsWith("brand:")) {
		const brand = socialBrandMap.get(icon.slice("brand:".length));
		if (!brand) return null;
		return (
			<svg
				viewBox="0 0 24 24"
				fill="currentColor"
				className={cn("h-5 w-5 shrink-0", className)}
				aria-hidden="true"
			>
				<path d={brand.svgPath} />
			</svg>
		);
	}

	const name = icon.startsWith("lucide:") ? icon.slice("lucide:".length) : icon;
	// DynamicIcon throws (and console.errors) on unknown names — guard first.
	if (!Object.hasOwn(dynamicIconImports, name)) return null;
	return (
		<span className={cn("inline-flex h-5 w-5 shrink-0", className)} aria-hidden="true">
			<DynamicIcon name={name as IconName} className="h-full w-full" strokeWidth={2} />
		</span>
	);
}
