"use client";

import { Wallet, Download } from "lucide-react";
import { buttonVariants, cn } from "@linkden/ui";
import type { ThemeColors } from "./public-page";

interface FooterActionsProps {
	walletEnabled: boolean;
	vcardEnabled: boolean;
	/** Resolved page theme — tints the glass pills so they stay visible on light presets. */
	themeColors?: ThemeColors;
}

const pillClass = cn(
	buttonVariants({ variant: "outline", size: "md" }),
	// hover:text-inherit beats the variant's admin-token hover:text-foreground
	// (twMerge keeps last) so hover text stays the page's themed color, which the
	// anchors inherit from the ld-page wrapper's inline `color: themeColors.fg`.
	"rounded-full backdrop-blur-2xl bg-white/5 dark:bg-white/5 border-white/20 hover:bg-white/10 hover:text-inherit hover:-translate-y-0.5 hover:opacity-90 transition-all duration-300 no-underline",
);

// Wallet pass + vCard are served by the Hono API, not the Next app.
const apiBase = process.env.NEXT_PUBLIC_SERVER_URL ?? "";

export function FooterActions({ walletEnabled, vcardEnabled, themeColors }: FooterActionsProps) {
	if (!walletEnabled && !vcardEnabled) return null;

	const both = walletEnabled && vcardEnabled;

	// Theme-aware glass: tint from the page foreground so the pills read on both
	// light and dark presets (the hardcoded white/5 glass vanished on light themes).
	const pillStyle: React.CSSProperties | undefined = themeColors
		? { backgroundColor: `${themeColors.fg}0F`, borderColor: `${themeColors.fg}33` }
		: undefined;

	return (
		<div className={cn("mt-6 flex pb-4 gap-3", both ? "grid grid-cols-2" : "justify-center")}>
			{walletEnabled && (
				<a
					href={`${apiBase}/api/wallet-pass`}
					className={cn(pillClass, both && "w-full")}
					style={pillStyle}
					aria-label="Add to Apple Wallet"
				>
					<Wallet className="h-4 w-4" aria-hidden="true" />
					<span>Add to Wallet</span>
				</a>
			)}
			{vcardEnabled && (
				<a
					href={`${apiBase}/api/vcard`}
					download="contact.vcf"
					className={cn(pillClass, both && "w-full")}
					style={pillStyle}
					aria-label="Download vCard"
				>
					<Download className="h-4 w-4" aria-hidden="true" />
					<span>Save vCard</span>
				</a>
			)}
		</div>
	);
}
