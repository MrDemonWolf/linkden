"use client";

import { Monitor, Moon, Paintbrush, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ColorField } from "../color-field";

const COLOR_MODE_OPTIONS = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

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
					<div className="inline-flex rounded-lg border border-border/50 p-0.5 bg-muted/30">
						{COLOR_MODE_OPTIONS.map((opt) => {
							const Icon = opt.icon;
							return (
								<button
									key={opt.value}
									type="button"
									aria-pressed={colorMode === opt.value}
									onClick={() => onColorModeChange(opt.value)}
									className={cn(
										"flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all md:min-h-8",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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

				{/* Custom color pickers apply in both light and dark mode (see getThemeColors) */}
				<Label className="text-xs">Custom colors</Label>
				<p className="text-micro text-muted-foreground -mt-2">
					These override the preset in both light and dark mode. Leave a field empty to keep the
					preset&apos;s color.
				</p>

				{/* Color pickers grid */}
				<div className="grid gap-3 sm:grid-cols-2">
					<ColorField
						id="color-primary"
						label="Primary"
						value={primaryColor}
						onChange={onPrimaryChange}
						contrastAgainst={bgColor ? { hex: bgColor, label: "background" } : undefined}
					/>
					{/* No contrast check: secondary is a surface tint, never text on the
					    background — preset light secondaries are near-background by design. */}
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
