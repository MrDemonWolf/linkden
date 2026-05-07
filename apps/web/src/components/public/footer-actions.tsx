"use client";

import { Wallet, Download } from "lucide-react";
import { buttonVariants, cn } from "@linkden/ui";

interface FooterActionsProps {
	walletEnabled: boolean;
	vcardEnabled: boolean;
}

const pillClass = cn(
	buttonVariants({ variant: "outline", size: "md" }),
	"rounded-full backdrop-blur-2xl bg-white/5 dark:bg-white/5 border-white/20 hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 no-underline",
);

export function FooterActions({ walletEnabled, vcardEnabled }: FooterActionsProps) {
	if (!walletEnabled && !vcardEnabled) return null;

	const both = walletEnabled && vcardEnabled;

	return (
		<div
			className={cn(
				"mt-6 flex pb-4 gap-3",
				both ? "grid grid-cols-2" : "justify-center",
			)}
		>
			{walletEnabled && (
				<a
					href="/api/wallet-pass"
					className={cn(pillClass, both && "w-full")}
					aria-label="Add to Apple Wallet"
				>
					<Wallet className="h-4 w-4" aria-hidden="true" />
					<span>Add to Wallet</span>
				</a>
			)}
			{vcardEnabled && (
				<a
					href="/api/vcard"
					download="contact.vcf"
					className={cn(pillClass, both && "w-full")}
					aria-label="Download vCard"
				>
					<Download className="h-4 w-4" aria-hidden="true" />
					<span>Save vCard</span>
				</a>
			)}
		</div>
	);
}
