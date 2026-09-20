"use client";

import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ThemeColors } from "./public-page";

interface FooterActionsProps {
	vcardEnabled: boolean;
	/** Resolved page theme — tints the glass pills so they stay visible on light presets. */
	themeColors?: ThemeColors;
}

const pillClass = cn(
	buttonVariants({ variant: "outline", size: "lg" }),
	// The outline variant's admin-token colors (background, border, and hover
	// text) are all overridden here (twMerge keeps last) so the
	// pills stay glass and hover text stays the page's themed color, which the
	// anchors inherit from the ld-page wrapper's inline `color: themeColors.fg`.
	"rounded-full gap-2 px-4 text-sm backdrop-blur-2xl bg-white/5 dark:bg-white/5 border-white/20 dark:border-white/20 hover:bg-white/10 dark:hover:bg-white/10 hover:text-inherit hover:-translate-y-0.5 hover:opacity-90 transition-all duration-300 no-underline",
);

// vCard is served by the Hono API, not the Next app.
const apiBase = process.env.NEXT_PUBLIC_SERVER_URL ?? "";

export function FooterActions({ vcardEnabled, themeColors }: FooterActionsProps) {
	if (!vcardEnabled) return null;

	// Theme-aware glass: tint from the page foreground so the pills read on both
	// light and dark presets (the hardcoded white/5 glass vanished on light themes).
	// Hex-alpha concat requires #RRGGBB; otherwise keep the class-based glass.
	const fgIsHex6 = themeColors ? /^#[0-9a-fA-F]{6}$/.test(themeColors.fg) : false;
	const pillStyle: React.CSSProperties | undefined =
		themeColors && fgIsHex6
			? { backgroundColor: `${themeColors.fg}0F`, borderColor: `${themeColors.fg}33` }
			: undefined;

	return (
		<div className="mt-6 flex justify-center gap-3 pb-4">
			<a
				href={`${apiBase}/api/vcard`}
				download="contact.vcf"
				className={pillClass}
				style={pillStyle}
				aria-label="Download vCard"
			>
				<Download className="h-4 w-4" aria-hidden="true" />
				<span>Save vCard</span>
			</a>
		</div>
	);
}
