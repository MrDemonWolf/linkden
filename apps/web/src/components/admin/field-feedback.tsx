"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline validation message. Pair with `aria-invalid` + `aria-describedby={id}`
 * on the input.
 *
 * The message only appears once the error has been stable for a moment, so a
 * half-typed URL does not flash red on every keystroke; it clears immediately
 * when the value becomes valid. `role="status"` keeps screen-reader
 * announcements polite.
 */
export function FieldError({
	id,
	error,
	delay = 700,
}: {
	id: string;
	error: string | null | undefined;
	delay?: number;
}) {
	const [shown, setShown] = useState<string | null>(null);
	useEffect(() => {
		if (!error) {
			setShown(null);
			return;
		}
		const t = setTimeout(() => setShown(error), delay);
		return () => clearTimeout(t);
	}, [error, delay]);
	if (!shown) return null;
	return (
		<p id={id} role="status" className="text-micro text-destructive">
			{shown}
		</p>
	);
}

/** Live `n/max` counter that turns red past the limit. */
export function CharCount({ value, max }: { value: string; max: number }) {
	return (
		<p
			className={cn(
				"text-micro text-right tabular-nums",
				value.length > max ? "text-destructive" : "text-muted-foreground",
			)}
		>
			{value.length}/{max}
		</p>
	);
}
