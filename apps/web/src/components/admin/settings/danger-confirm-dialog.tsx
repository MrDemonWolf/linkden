"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
 * actions on Settings → Data use this so the confirmation experience is
 * identical: the keyword input lives inside the dialog and is reset whenever the
 * dialog opens or closes (so a half-typed word never carries over).
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
	const inputRef = useRef<HTMLInputElement>(null);
	const [typed, setTyped] = useState("");
	const inputId = useId();
	const armed = typed === confirmWord;

	// Reset the confirmation text on every open/close transition.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `open` is the trigger, not a read dependency
	useEffect(() => setTyped(""), [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent role="alertdialog" initialFocus={inputRef} className="max-w-sm">
				<DialogHeader>
					<DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
					<DialogDescription className="text-xs">{description}</DialogDescription>
				</DialogHeader>

				<div className="space-y-1.5">
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

				<DialogFooter className="gap-2">
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
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
