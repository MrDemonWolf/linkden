"use client";

import { Sheet } from "@/components/ui/sheet";

interface MobilePreviewSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}

// Pure controlled overlay — the trigger FAB lives at the page level so it is
// not duplicated with the builder's own preview FAB.
export function MobilePreviewSheet({ open, onOpenChange, children }: MobilePreviewSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange} title="Preview" breakpoint="lg">
			<div className="flex justify-center overflow-x-hidden p-4 pb-8">{children}</div>
		</Sheet>
	);
}
