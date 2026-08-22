"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "destructive" | "default";
	onConfirm: () => void;
	isPending?: boolean;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	variant = "destructive",
	onConfirm,
	isPending,
}: ConfirmDialogProps) {
	const cancelRef = useRef<HTMLButtonElement>(null);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent role="alertdialog" initialFocus={cancelRef} className="max-w-sm">
				<DialogHeader>
					<DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
					<DialogDescription className="text-xs">{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2">
					<Button
						ref={cancelRef}
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						{cancelLabel}
					</Button>
					<Button variant={variant} size="sm" onClick={onConfirm} disabled={isPending}>
						{isPending ? "..." : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
