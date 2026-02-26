"use client";

import { useEffect, useRef, useCallback } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobilePreviewSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}

export function MobilePreviewSheet({
	open,
	onOpenChange,
	children,
}: MobilePreviewSheetProps) {
	const sheetRef = useRef<HTMLDivElement>(null);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") onOpenChange(false);
		},
		[onOpenChange],
	);

	useEffect(() => {
		if (open) {
			document.addEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "hidden";
			return () => {
				document.removeEventListener("keydown", handleKeyDown);
				document.body.style.overflow = "";
			};
		}
	}, [open, handleKeyDown]);

	return (
		<>
			{/* FAB trigger */}
			<button
				type="button"
				onClick={() => onOpenChange(true)}
				className={cn(
					"fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden",
					"hover:bg-primary/90 transition-all",
					open && "hidden",
				)}
				aria-label="Open preview"
			>
				<Smartphone className="h-5 w-5" />
			</button>

			{/* Sheet overlay */}
			{open && (
				<div className="fixed inset-0 z-50 lg:hidden">
					<div
						className="fixed inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => onOpenChange(false)}
						aria-hidden="true"
					/>
					<div
						ref={sheetRef}
						role="dialog"
						aria-modal="true"
						aria-label="Page preview"
						className="fixed inset-x-0 bottom-0 z-10 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/15 dark:border-white/10 bg-white dark:bg-neutral-900 backdrop-blur-2xl p-4 pb-8 shadow-xl animate-in slide-in-from-bottom duration-300"
					>
						<div className="mb-3 flex items-center justify-between">
							<span className="text-xs font-medium text-muted-foreground">
								Preview
							</span>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={() => onOpenChange(false)}
								aria-label="Close preview"
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
						<div className="flex justify-center">{children}</div>
					</div>
				</div>
			)}
		</>
	);
}
