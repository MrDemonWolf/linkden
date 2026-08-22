"use client";

import { Monitor, Moon, Paintbrush, Sun } from "lucide-react";
import { useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
	const colorModeLabelId = useId();

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
				{/* Color mode toggle — single-select ToggleGroup (Base UI `multiple`
				    defaults to false). An empty `next` means the pressed segment was
				    re-pressed; ignoring it keeps exactly one mode selected. */}
				<div>
					<Label id={colorModeLabelId} className="mb-2 block text-xs">
						Default Color Mode
					</Label>
					<ToggleGroup
						value={[colorMode]}
						onValueChange={(next) => {
							const picked = next[0];
							if (picked) onColorModeChange(picked);
						}}
						spacing={0}
						aria-labelledby={colorModeLabelId}
						className="rounded-lg border border-border/50 bg-muted/30 p-0.5"
					>
						{COLOR_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
							<ToggleGroupItem
								key={value}
								value={value}
								className="min-h-11 gap-1.5 px-3 text-muted-foreground md:min-h-8 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm hover:aria-pressed:bg-background"
							>
								<Icon className="size-3.5" />
								{label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
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
