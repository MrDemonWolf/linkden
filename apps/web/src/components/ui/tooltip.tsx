"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
	<TooltipPrimitive.Provider>{children}</TooltipPrimitive.Provider>
);

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & {
		side?: "top" | "bottom" | "left" | "right";
		sideOffset?: number;
	}
>(({ className, side = "top", sideOffset = 4, children, ...props }, ref) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
			<TooltipPrimitive.Popup
				ref={ref}
				data-slot="tooltip-content"
				className={cn(
					"z-50 overflow-hidden rounded-md border border-border bg-card px-3 py-1.5 text-sm text-card-foreground shadow-md",
					"animate-in fade-in-0 zoom-in-95",
					"data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
					className,
				)}
				{...props}
			>
				{children}
			</TooltipPrimitive.Popup>
		</TooltipPrimitive.Positioner>
	</TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
