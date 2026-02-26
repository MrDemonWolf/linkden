"use client";

import { Palette, Check } from "lucide-react";
import { themePresets } from "@linkden/ui/themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ThemePresetsSection({
	selectedTheme,
	onThemeSelect,
}: {
	selectedTheme: string;
	onThemeSelect: (name: string) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Theme Presets
					</CardTitle>
				</h2>
			</CardHeader>
			<CardContent>
				<div
					className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
					role="radiogroup"
					aria-label="Theme presets"
				>
					{themePresets.map((theme) => (
						<button
							key={theme.name}
							type="button"
							role="radio"
							aria-checked={selectedTheme === theme.name}
							onClick={() => onThemeSelect(theme.name)}
							className={cn(
								"relative flex flex-col items-center gap-2 rounded-lg border p-3 text-xs transition-colors",
								selectedTheme === theme.name
									? "border-primary bg-primary/5"
									: "border-border hover:border-muted-foreground/30",
							)}
						>
							{selectedTheme === theme.name && (
								<div className="absolute right-1 top-1">
									<Check className="h-3 w-3 text-primary" />
								</div>
							)}
							<div className="flex gap-1">
								<div
									className="h-5 w-5 rounded-full border"
									style={{ backgroundColor: theme.cssVars.light["--ld-primary"] }}
								/>
								<div
									className="h-5 w-5 rounded-full border"
									style={{ backgroundColor: theme.cssVars.light["--ld-accent"] }}
								/>
								<div
									className="h-5 w-5 rounded-full border"
									style={{ backgroundColor: theme.cssVars.light["--ld-background"] }}
								/>
							</div>
							<span className="font-medium text-center leading-tight">
								{theme.label}
							</span>
						</button>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
