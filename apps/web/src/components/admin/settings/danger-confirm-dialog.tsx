"use client";

import { useEffect, useId, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

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
 * Destructive-action dialog with a type-to-confirm ceremony, on the shared
 * `AlertDialog`. Both danger-zone actions on Settings → Data use this so the
 * confirmation experience is identical: the keyword input lives inside the
 * dialog and is reset whenever the dialog opens or closes (so a half-typed word
 * never carries over), and the confirm button stays disabled until the typed
 * text matches `confirmWord` exactly.
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
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent initialFocus={inputRef}>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-1.5">
					<Label htmlFor={inputId} className="text-muted-foreground">
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
						className="font-mono"
					/>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={onConfirm}
						disabled={isPending || !armed}
					>
						{isPending && <Spinner />}
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
