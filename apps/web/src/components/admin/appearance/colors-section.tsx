"use client";

import { Paintbrush, Sun, Moon, Monitor } from "lucide-react";
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
	previewDark = false,
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
	previewDark?: boolean;
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
										"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
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

				{/* Custom color pickers — light mode only */}
				<div className="flex items-center justify-between gap-2">
					<Label className="text-xs">Custom colors</Label>
					<span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
						Light mode only
					</span>
				</div>
				<p className="text-[11px] text-muted-foreground -mt-2">
					These override the preset&apos;s light palette. Dark mode always uses the selected
					preset&apos;s built-in dark colors.
				</p>
				{previewDark && (
					<p className="flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning">
						You&apos;re previewing dark mode — changes below won&apos;t affect this preview.
					</p>
				)}

				{/* Color pickers grid */}
				<div className="grid gap-3 sm:grid-cols-2">
					<ColorField
						id="color-primary"
						label="Primary"
						value={primaryColor}
						onChange={onPrimaryChange}
						contrastAgainst={bgColor ? { hex: bgColor, label: "background" } : undefined}
					/>
					<ColorField
						id="color-secondary"
						label="Secondary"
						value={secondaryColor}
						onChange={onSecondaryChange}
						contrastAgainst={bgColor ? { hex: bgColor, label: "background" } : undefined}
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
