"use client";

import { Paintbrush, Sun, Moon, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const COLOR_MODE_OPTIONS = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

function ColorField({
	id,
	label,
	value,
	onChange,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id} className="text-xs">
				{label}
			</Label>
			<div className="flex gap-2">
				<div className="relative">
					<input
						type="color"
						id={id}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="h-9 w-11 cursor-pointer appearance-none rounded-lg border border-border/60 bg-transparent p-0.5 transition-shadow hover:shadow-md [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
					/>
				</div>
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="flex-1 font-mono text-xs uppercase"
					placeholder="#000000"
				/>
			</div>
		</div>
	);
}

export function ColorsSection({
	colorMode,
	primaryColor,
	secondaryColor,
	accentColor,
	bgColor,
	onColorModeChange,
	onPrimaryChange,
	onSecondaryChange,
	onAccentChange,
	onBgChange,
}: {
	colorMode: string;
	primaryColor: string;
	secondaryColor: string;
	accentColor: string;
	bgColor: string;
	onColorModeChange: (value: string) => void;
	onPrimaryChange: (value: string) => void;
	onSecondaryChange: (value: string) => void;
	onAccentChange: (value: string) => void;
	onBgChange: (value: string) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<Paintbrush className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Colors
					</CardTitle>
				</h2>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Color mode toggle */}
				<div>
					<Label className="mb-2 block text-xs">Default Color Mode</Label>
					<div
						className="inline-flex rounded-lg border border-border/50 p-0.5 bg-muted/30"
						role="radiogroup"
						aria-label="Default color mode"
					>
						{COLOR_MODE_OPTIONS.map((opt) => {
							const Icon = opt.icon;
							return (
								<button
									key={opt.value}
									type="button"
									role="radio"
									aria-checked={colorMode === opt.value}
									onClick={() => onColorModeChange(opt.value)}
									className={cn(
										"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
										colorMode === opt.value
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<Icon className="h-3.5 w-3.5" />
									{opt.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className="border-t border-border/40" />

				{/* Color preview strip */}
				<div className="flex gap-1 rounded-lg overflow-hidden h-3">
					<div className="flex-1 transition-colors" style={{ backgroundColor: primaryColor }} />
					<div className="flex-1 transition-colors" style={{ backgroundColor: secondaryColor }} />
					<div className="flex-1 transition-colors" style={{ backgroundColor: accentColor }} />
					<div className="flex-1 transition-colors" style={{ backgroundColor: bgColor }} />
				</div>

				{/* Color pickers grid */}
				<div className="grid gap-3 sm:grid-cols-2">
					<ColorField
						id="color-primary"
						label="Primary"
						value={primaryColor}
						onChange={onPrimaryChange}
					/>
					<ColorField
						id="color-secondary"
						label="Secondary"
						value={secondaryColor}
						onChange={onSecondaryChange}
					/>
					<ColorField
						id="color-accent"
						label="Accent"
						value={accentColor}
						onChange={onAccentChange}
					/>
					<ColorField id="color-bg" label="Background" value={bgColor} onChange={onBgChange} />
				</div>
			</CardContent>
		</Card>
	);
}
