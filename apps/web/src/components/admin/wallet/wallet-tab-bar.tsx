"use client";

import { Briefcase, Image as ImageIcon, Layers, MapPin, Palette } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const WALLET_TABS = [
	{ value: "business", label: "Business", icon: Briefcase },
	{ value: "images", label: "Images", icon: ImageIcon },
	{ value: "context", label: "Context", icon: MapPin },
	{ value: "colors", label: "Colors", icon: Palette },
	{ value: "background", label: "Background", icon: Layers },
] as const;

/**
 * iOS-Wallet-style bottom tab bar for the pass editor. Keyboard navigation
 * (roving tabindex + arrow keys) comes from the Base UI Tabs primitive.
 */
export function WalletTabBar({ className }: { className?: string }) {
	return (
		<TabsList
			variant="bar"
			className={cn(
				"rounded-2xl border border-border/70 bg-background/90 px-1 py-0.5 shadow-lg backdrop-blur-xl",
				className,
			)}
		>
			{WALLET_TABS.map((tab) => {
				const Icon = tab.icon;
				return (
					<TabsTrigger key={tab.value} value={tab.value}>
						<Icon className="h-5 w-5" aria-hidden="true" />
						{tab.label}
					</TabsTrigger>
				);
			})}
		</TabsList>
	);
}
