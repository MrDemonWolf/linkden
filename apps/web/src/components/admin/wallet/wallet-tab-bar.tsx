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
 * Section tabs for the pass editor. Same look as the shell's SubTabs (in-flow,
 * hairline strip, static 2px underline on the active tab) so the Wallet page
 * has one navigation idiom and nothing floats over the mobile tab bar or the
 * save bar. Keyboard navigation (roving tabindex + arrow keys) comes from the
 * Base UI Tabs primitive.
 */
export function WalletTabBar({ className }: { className?: string }) {
	return (
		<TabsList
			className={cn(
				"flex h-auto gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 [scrollbar-width:none]",
				className,
			)}
		>
			{WALLET_TABS.map((tab) => {
				const Icon = tab.icon;
				return (
					<TabsTrigger
						key={tab.value}
						value={tab.value}
						className="-mb-px min-h-11 shrink-0 gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-3 text-xs font-medium text-muted-foreground shadow-none ring-0 hover:bg-transparent hover:text-foreground data-[active]:border-foreground data-[active]:bg-transparent data-[active]:text-foreground data-[active]:shadow-none data-[active]:ring-0 md:min-h-10"
					>
						<Icon className="h-4 w-4" aria-hidden="true" />
						{tab.label}
					</TabsTrigger>
				);
			})}
		</TabsList>
	);
}
