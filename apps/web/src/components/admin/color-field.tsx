"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

/**
 * Hex text input paired with a native color-picker swatch.
 * Canonical replacement for the inline `flex gap-2` + `<input type="color">`
 * pattern previously copy-pasted across admin sections.
 */
export function ColorField({ id, label, value, onChange, placeholder }: ColorFieldProps) {
	const fallback = placeholder || "#000000";
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			<div className="flex gap-2">
				<Input
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="flex-1"
				/>
				<input
					type="color"
					value={value || fallback}
					onChange={(e) => onChange(e.target.value.toUpperCase())}
					aria-label={`${label} color`}
					className="h-8 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
				/>
			</div>
		</div>
	);
}
