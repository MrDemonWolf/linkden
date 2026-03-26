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
					className="grid grid-cols-2 gap-3 sm:grid-cols-3"
					role="radiogroup"
					aria-label="Theme presets"
				>
					{themePresets.map((theme) => {
						const isSelected = selectedTheme === theme.name;
						const light = theme.cssVars.light;
						const dark = theme.cssVars.dark;
						return (
							<button
								key={theme.name}
								type="button"
								role="radio"
								aria-checked={isSelected}
								onClick={() => onThemeSelect(theme.name)}
								className={cn(
									"group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all duration-200",
									isSelected
										? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
										: "border-border/50 hover:border-muted-foreground/40 hover:shadow-md",
								)}
							>
								{/* Theme preview mini-card */}
								<div
									className="relative h-20 w-full overflow-hidden"
									style={{ background: `linear-gradient(135deg, ${light["--ld-background"]} 50%, ${dark["--ld-background"]} 50%)` }}
								>
									{/* Light side elements */}
									<div className="absolute left-2 top-2 flex flex-col gap-1">
										<div
											className="h-1.5 w-8 rounded-full"
											style={{ backgroundColor: light["--ld-primary"] }}
										/>
										<div
											className="h-1.5 w-5 rounded-full opacity-60"
											style={{ backgroundColor: light["--ld-accent"] }}
										/>
									</div>
									{/* Light card preview */}
									<div
										className="absolute left-2 top-8 h-5 w-[42%] rounded-sm border"
										style={{
											backgroundColor: light["--ld-card"],
											borderColor: light["--ld-border"],
										}}
									>
										<div
											className="mx-1 mt-1 h-1 w-6 rounded-full"
											style={{ backgroundColor: light["--ld-primary"] }}
										/>
									</div>
									{/* Dark side elements */}
									<div className="absolute right-2 top-2 flex flex-col items-end gap-1">
										<div
											className="h-1.5 w-8 rounded-full"
											style={{ backgroundColor: dark["--ld-primary"] }}
										/>
										<div
											className="h-1.5 w-5 rounded-full opacity-60"
											style={{ backgroundColor: dark["--ld-accent"] }}
										/>
									</div>
									{/* Dark card preview */}
									<div
										className="absolute right-2 top-8 h-5 w-[42%] rounded-sm border"
										style={{
											backgroundColor: dark["--ld-card"],
											borderColor: dark["--ld-border"],
										}}
									>
										<div
											className="mx-1 mt-1 h-1 w-6 rounded-full float-right"
											style={{ backgroundColor: dark["--ld-primary"] }}
										/>
									</div>
									{/* Selected indicator */}
									{isSelected && (
										<div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
											<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg">
												<Check className="h-3.5 w-3.5 text-primary-foreground" />
											</div>
										</div>
									)}
								</div>
								{/* Label + color dots */}
								<div className="flex items-center gap-2 px-2.5 py-2 bg-card">
									<div className="flex gap-1">
										<div
											className="h-3 w-3 rounded-full border border-border/50 shadow-sm"
											style={{ backgroundColor: light["--ld-primary"] }}
										/>
										<div
											className="h-3 w-3 rounded-full border border-border/50 shadow-sm"
											style={{ backgroundColor: light["--ld-accent"] }}
										/>
										<div
											className="h-3 w-3 rounded-full border border-border/50 shadow-sm"
											style={{ backgroundColor: light["--ld-background"] }}
										/>
									</div>
									<span className="text-[11px] font-semibold truncate">
										{theme.label}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
