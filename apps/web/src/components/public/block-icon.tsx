"use client";

import { socialBrandMap } from "@linkden/ui/social-brands";
import { DynamicIcon, dynamicIconImports, type IconName } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";

/**
 * Renders a block's `icon` column: `brand:<slug>` (social brand glyph),
 * `lucide:<name>` or a legacy bare lucide name. Unknown values render nothing.
 *
 * DynamicIcon resolves its glyph in an effect (client-only), so the 20×20 box
 * is reserved up front to keep SSR and hydrated layouts identical.
 */
export function BlockIcon({ icon, className }: { icon: string | null; className?: string }) {
	if (!icon) return null;

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
	if (!(name in dynamicIconImports)) return null;
	return (
		<span className={cn("inline-flex h-5 w-5 shrink-0", className)} aria-hidden="true">
			<DynamicIcon name={name as IconName} className="h-full w-full" strokeWidth={2} />
		</span>
	);
}
