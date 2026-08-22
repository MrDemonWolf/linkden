"use client";

import { X } from "lucide-react";
import { SharePopover } from "@/components/admin/share-popover";
import { Sheet } from "@/components/ui/sheet";

interface MobilePreviewSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}

/**
 * Below-lg preview overlay, opened by the shell's FAB. Own header so Share sits
 * next to Close: edit → preview → share is one flow on a phone.
 */
export function MobilePreviewSheet({ open, onOpenChange, children }: MobilePreviewSheetProps) {
	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			ariaLabel="Preview"
			breakpoint="lg"
			scrollBody={false}
		>
			<div className="flex shrink-0 items-center justify-between border-b border-border py-1 pl-4 pr-2">
				<span className="text-xs font-semibold">Preview</span>
				<div className="flex items-center">
					<SharePopover />
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
			<div className="flex min-h-0 flex-1 justify-center overflow-y-auto overflow-x-hidden p-4 pb-8">
				{children}
			</div>
		</Sheet>
	);
}
