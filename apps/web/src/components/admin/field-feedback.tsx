import { cn } from "@/lib/utils";

/** Inline validation message. Pair with `aria-invalid` + `aria-describedby={id}` on the input. */
export function FieldError({ id, error }: { id: string; error: string | null | undefined }) {
	if (!error) return null;
	return (
		<p id={id} role="alert" className="text-micro text-destructive">
			{error}
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
