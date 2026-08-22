"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

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

/**
 * Yes/no confirmation on the shared `AlertDialog` (which carries the
 * `role="alertdialog"` semantics the hand-rolled version had to spell out).
 * Cancel is first in the DOM, so Base UI's default initial focus — the first
 * tabbable element — lands on the safe choice, not on the destructive one.
 */
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
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
					<AlertDialogAction variant={variant} onClick={onConfirm} disabled={isPending}>
						{isPending && <Spinner />}
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
