"use client";

import { useEffect, useRef, useCallback, useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DangerConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	/** The exact word the user must type to arm the confirm button, e.g. "DELETE". */
	confirmWord: string;
	confirmLabel: string;
	onConfirm: () => void;
	isPending?: boolean;
}

/**
 * Destructive-action dialog with a type-to-confirm ceremony. Both danger-zone
 * actions on the Account page use this so the confirmation experience is
 * identical: the keyword input lives inside the dialog and is reset whenever the
 * dialog closes (so a half-typed word never carries over).
 */
export function DangerConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmWord,
	confirmLabel,
	onConfirm,
	isPending,
}: DangerConfirmDialogProps) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [typed, setTyped] = useState("");
	const inputId = useId();

	const titleId = `${inputId}-title`;
	const descId = `${inputId}-desc`;
	const armed = typed === confirmWord;

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onOpenChange(false);
				return;
			}
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
			// Reset the confirmation text every time the dialog opens.
			setTyped("");
			document.addEventListener("keydown", handleKeyDown);
			requestAnimationFrame(() => inputRef.current?.focus());
			return () => document.removeEventListener("keydown", handleKeyDown);
		}
		// Also clear when closing so stale text never lingers.
		setTyped("");
	}, [open, handleKeyDown]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="fixed inset-0 bg-black/40 backdrop-blur-sm"
				onClick={() => onOpenChange(false)}
				aria-hidden="true"
			/>
			<div
				ref={dialogRef}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-neutral-900"
			>
				<h2 id={titleId} className="text-sm font-semibold">
					{title}
				</h2>
				<p id={descId} className="mt-2 text-xs text-muted-foreground">
					{description}
				</p>

				<div className="mt-4 space-y-1.5">
					<Label htmlFor={inputId} className="text-xs text-muted-foreground">
						Type <span className="font-mono font-semibold text-foreground">{confirmWord}</span> to
						confirm
					</Label>
					<Input
						id={inputId}
						ref={inputRef}
						value={typed}
						onChange={(e) => setTyped(e.target.value)}
						placeholder={confirmWord}
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						className="font-mono text-xs"
					/>
				</div>

				<div className="mt-4 flex justify-end gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={onConfirm}
						disabled={isPending || !armed}
					>
						{isPending ? "…" : confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
