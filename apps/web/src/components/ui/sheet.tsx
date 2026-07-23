"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const BREAKPOINT_QUERY = {
	md: "(min-width: 768px)",
	lg: "(min-width: 1024px)",
} as const;

interface SheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Visible sticky header title. Omit when the consumer renders its own header. */
	title?: string;
	/** Accessible name for the dialog when no visible title is rendered. */
	ariaLabel?: string;
	/** Hide the sheet at and above this breakpoint (for mobile-only sheets). */
	breakpoint?: "md" | "lg";
	/** Extra classes for the sheet panel (e.g. a fixed height). */
	className?: string;
	/** Wrap children in a scroll container (default). Disable when the child manages its own layout/scroll. */
	scrollBody?: boolean;
	children: React.ReactNode;
}

/**
 * Bottom sheet built on Base UI Dialog: focus trap, focus restore, Escape and
 * scroll lock come from the primitive. Replaces the hand-rolled per-page sheets.
 */
export function Sheet({
	open,
	onOpenChange,
	title,
	ariaLabel,
	breakpoint,
	className,
	scrollBody = true,
	children,
}: SheetProps) {
	const hidden = breakpoint === "md" ? "md:hidden" : breakpoint === "lg" ? "lg:hidden" : "";

	// The breakpoint classes only CSS-hide the panel, but the Base UI Dialog
	// stays open and modal (scroll lock, focus trap, aria-hidden on the page).
	// Actually close it when the viewport grows past the breakpoint.
	useEffect(() => {
		if (!breakpoint || !open) return;
		const mq = window.matchMedia(BREAKPOINT_QUERY[breakpoint]);
		if (mq.matches) {
			onOpenChange(false);
			return;
		}
		const onMatch = (e: MediaQueryListEvent) => {
			if (e.matches) onOpenChange(false);
		};
		mq.addEventListener("change", onMatch);
		return () => mq.removeEventListener("change", onMatch);
	}, [breakpoint, open, onOpenChange]);

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Backdrop
					className={cn(
						"fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
						"data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0 duration-200",
						"motion-reduce:animate-none",
						hidden,
					)}
				/>
				<DialogPrimitive.Popup
					aria-label={title ? undefined : ariaLabel}
					className={cn(
						"fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-xl",
						"data-[open]:animate-in data-[open]:slide-in-from-bottom data-[closed]:animate-out data-[closed]:slide-out-to-bottom duration-300",
						"motion-reduce:animate-none",
						hidden,
						className,
					)}
				>
					{title && (
						<div className="flex shrink-0 items-center justify-between border-b border-border py-1 pl-4 pr-2">
							<DialogPrimitive.Title className="text-xs font-semibold">
								{title}
							</DialogPrimitive.Title>
							<DialogPrimitive.Close
								className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								aria-label="Close"
							>
								<X className="h-4 w-4" />
							</DialogPrimitive.Close>
						</div>
					)}
					{scrollBody ? (
						<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
					) : (
						children
					)}
				</DialogPrimitive.Popup>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
