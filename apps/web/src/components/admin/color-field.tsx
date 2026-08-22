"use client";

import { getContrastRatio, getReadableTextColor } from "@linkden/ui/color-contrast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	/**
	 * Paired color to check WCAG contrast against (e.g. the background this text
	 * sits on). Shows a live ratio badge and, on AA failure, a one-tap fix chip.
	 */
	contrastAgainst?: { hex: string; label: string };
}

/**
 * Normalize a loosely-typed hex string into canonical `#RRGGBB` (uppercase).
 * Accepts `#RGB`, `RGB`, `#RRGGBB`, `RRGGBB` (with/without leading `#`).
 * Returns null when the input can't be a valid 3/6-digit hex colour.
 */
function normalizeHex(raw: string): string | null {
	let v = raw.trim();
	if (!v) return null;
	if (!v.startsWith("#")) v = `#${v}`;
	if (/^#[0-9a-fA-F]{3}$/.test(v)) {
		v = `#${v
			.slice(1)
			.split("")
			.map((c) => c + c)
			.join("")}`;
	}
	if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
	return null;
}

/**
 * Hex text input paired with a native color-picker swatch.
 * Canonical replacement for the inline `flex gap-2` + `<input type="color">`
 * pattern previously copy-pasted across admin sections.
 *
 * Validation: an empty value is allowed (inherits the theme default). Any other
 * value is normalized on blur (`#RGB`→`#RRGGBB`, adds `#`, uppercases) and shows
 * an inline error when it can't be parsed. The native swatch is only ever fed a
 * valid 7-char value — it falls back to the placeholder default (never `#000000`).
 */
export function ColorField({
	id,
	label,
	value,
	onChange,
	placeholder,
	contrastAgainst,
}: ColorFieldProps) {
	const [error, setError] = useState<string | null>(null);
	const errorId = `${id}-error`;

	const swatchValue = normalizeHex(value) ?? normalizeHex(placeholder ?? "") ?? "#FFFFFF";

	const contrastHex = contrastAgainst ? normalizeHex(contrastAgainst.hex) : null;
	const ownHex = normalizeHex(value);
	const ratio = contrastHex && ownHex ? getContrastRatio(ownHex, contrastHex) : null;
	const passesAA = ratio !== null && ratio >= 4.5;

	const handleBlur = () => {
		if (!value.trim()) {
			setError(null);
			return;
		}
		const normalized = normalizeHex(value);
		if (normalized) {
			setError(null);
			if (normalized !== value) onChange(normalized);
		} else {
			setError("Enter a valid hex colour, e.g. #0FACED");
		}
	};

	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			<div className="flex gap-2">
				<Input
					id={id}
					value={value}
					onChange={(e) => {
						if (error) setError(null);
						onChange(e.target.value);
					}}
					onBlur={handleBlur}
					placeholder={placeholder}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
					className="flex-1"
				/>
				<input
					type="color"
					value={swatchValue}
					onChange={(e) => {
						setError(null);
						onChange(e.target.value.toUpperCase());
					}}
					aria-label={`${label} color`}
					className="h-8 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
				/>
			</div>
			{error && (
				<p id={errorId} role="alert" className="text-micro text-destructive">
					{error}
				</p>
			)}
			{ratio !== null && contrastAgainst && (
				<p className="flex items-center gap-2 text-micro">
					<span className={passesAA ? "font-medium text-success" : "font-medium text-warning"}>
						{ratio.toFixed(1)}:1 vs {contrastAgainst.label}
						{passesAA ? " — passes AA" : " — fails AA (4.5:1 needed)"}
					</span>
					{!passesAA && contrastHex && (
						<button
							type="button"
							onClick={() => onChange(getReadableTextColor(contrastHex).toUpperCase())}
							className="rounded-full border border-border px-2 py-0.5 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Fix
						</button>
					)}
				</p>
			)}
		</div>
	);
}
