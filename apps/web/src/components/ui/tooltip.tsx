"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Hover/focus tooltip built on Base UI. `children` must be a single focusable
 * element (button, link) — it is rendered as the trigger itself, so no extra
 * wrapper lands in the DOM. Keep an `aria-label` on the trigger: the tooltip is
 * a visual hint, not the accessible name.
 */
export function Tooltip({
	content,
	children,
	side = "top",
	className,
}: {
	content: ReactNode;
	children: ReactElement;
	side?: "top" | "bottom" | "left" | "right";
	className?: string;
}) {
	return (
		<TooltipPrimitive.Root>
			<TooltipPrimitive.Trigger render={children} />
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Positioner side={side} sideOffset={6} className="z-50">
					<TooltipPrimitive.Popup
						className={cn(
							"rounded-md border border-border bg-popover px-2 py-1 text-micro text-popover-foreground shadow-md",
							"data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 duration-150",
							className,
						)}
					>
						{content}
					</TooltipPrimitive.Popup>
				</TooltipPrimitive.Positioner>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
}
