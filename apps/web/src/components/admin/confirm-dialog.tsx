"use client";

import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

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
	const dialogRef = useRef<HTMLDivElement>(null);
	const cancelRef = useRef<HTMLButtonElement>(null);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onOpenChange(false);
			}
			// Focus trap
			if (e.key === "Tab" && dialogRef.current) {
				const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				);
				const first = focusable[0];
				const last = focusable[focusable.length - 1];

				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		},
		[onOpenChange],
	);

	useEffect(() => {
		if (open) {
			document.addEventListener("keydown", handleKeyDown);
			// Focus the cancel button on open
			requestAnimationFrame(() => cancelRef.current?.focus());
			return () => document.removeEventListener("keydown", handleKeyDown);
		}
	}, [open, handleKeyDown]);

	if (!open) return null;

	const titleId = "confirm-dialog-title";
	const descId = "confirm-dialog-desc";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/40 backdrop-blur-sm"
				onClick={() => onOpenChange(false)}
				aria-hidden="true"
			/>
			{/* Dialog */}
			<div
				ref={dialogRef}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-white/15 dark:border-white/10 bg-white dark:bg-neutral-900 backdrop-blur-2xl p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200"
			>
				<h2 id={titleId} className="text-sm font-semibold">
					{title}
				</h2>
				<p id={descId} className="mt-2 text-xs text-muted-foreground">
					{description}
				</p>
				<div className="mt-4 flex justify-end gap-2">
					<Button
						ref={cancelRef}
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						{cancelLabel}
					</Button>
					<Button
						variant={variant}
						size="sm"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending ? "..." : confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
