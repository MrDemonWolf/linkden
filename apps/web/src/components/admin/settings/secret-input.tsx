"use client";

import { SECRET_MASK } from "@linkden/validators/settings-registry";
import type * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * Next value of a secret field that may still hold the server's mask. The mask
 * stands for "saved, unchanged"; once the admin edits it, the mask itself must
 * never become part of the value. Pasting at the end of the hidden dots used
 * to save `••••••re_live…`, a key no provider accepts.
 */
export function editMaskedSecret(prev: string, next: string): string {
	if (prev !== SECRET_MASK) return next;
	// Typed or pasted around the mask: keep only what was entered.
	if (next.includes(SECRET_MASK)) return next.replace(SECRET_MASK, "");
	// Typed into, or deleted part of, the mask: drop what is left of it.
	return next.replaceAll(SECRET_MASK[0] ?? "", "");
}

type SecretInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
	value: string;
	onValueChange: (value: string) => void;
	/** id for the "saved" hint, wired into aria-describedby while the mask shows. */
	hintId?: string;
};

/**
 * Input for a write-only secret (API key, CAPTCHA secret, MapKit token). The
 * server returns a saved secret as SECRET_MASK and ignores the mask on save;
 * this keeps any edit from saving the mask glued to a new value.
 */
export function SecretInput({
	value,
	onValueChange,
	hintId,
	onFocus,
	type,
	...props
}: SecretInputProps) {
	const masked = value === SECRET_MASK;
	const describedBy = [props["aria-describedby"], masked ? hintId : undefined]
		.filter(Boolean)
		.join(" ");
	return (
		<>
			<Input
				{...props}
				type={type}
				value={value}
				autoComplete={type === "password" ? "new-password" : "off"}
				spellCheck={false}
				aria-describedby={describedBy || undefined}
				onFocus={(e) => {
					// Selecting the mask makes the next keystroke or paste replace it.
					if (e.currentTarget.value === SECRET_MASK) e.currentTarget.select();
					onFocus?.(e);
				}}
				onChange={(e) => onValueChange(editMaskedSecret(value, e.target.value))}
			/>
			{masked && hintId && (
				<p id={hintId} className="text-micro text-muted-foreground">
					Saved — type or paste a new value to replace it
				</p>
			)}
		</>
	);
}
