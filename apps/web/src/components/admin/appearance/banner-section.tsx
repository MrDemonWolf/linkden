"use client";

import { Image as ImageIcon, Palette, Upload, Check } from "lucide-react";
import type { BannerPreset } from "@linkden/ui/banner-presets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { ShaderBanner } from "@/components/public/shader-banner";
import { cn } from "@/lib/utils";

export function BannerSection({
	bannerEnabled,
	bannerMode,
	bannerPreset,
	bannerCustomUrl,
	themedBannerPresets,
	onBannerEnabledChange,
	onBannerModeChange,
	onBannerPresetChange,
	onBannerCustomUrlChange,
}: {
	bannerEnabled: boolean;
	bannerMode: "preset" | "custom";
	bannerPreset: string;
	bannerCustomUrl: string;
	themedBannerPresets: BannerPreset[];
	onBannerEnabledChange: (value: boolean) => void;
	onBannerModeChange: (value: "preset" | "custom") => void;
	onBannerPresetChange: (value: string) => void;
	onBannerCustomUrlChange: (url: string) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Banner
					</CardTitle>
				</h2>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Enable toggle */}
				<label
					htmlFor="a-banner-enabled"
					className="flex items-start gap-3 cursor-pointer group rounded-lg border border-border/40 p-3 transition-colors hover:border-border/60"
				>
					<div className="min-w-0 flex-1">
						<span className="text-xs font-medium group-hover:text-foreground transition-colors">
							Show banner on public page
						</span>
						<p className="text-micro text-muted-foreground leading-tight mt-0.5">
							Displays a banner behind your avatar
						</p>
					</div>
					<button
						id="a-banner-enabled"
						type="button"
						role="switch"
						aria-checked={bannerEnabled}
						aria-label="Show banner on public page"
						onClick={() => onBannerEnabledChange(!bannerEnabled)}
						className={cn(
							"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
							bannerEnabled ? "bg-primary" : "bg-muted",
						)}
					>
						<span
							className={cn(
								"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
								bannerEnabled ? "translate-x-[18px]" : "translate-x-[3px]",
							)}
						/>
					</button>
				</label>

				{/* Banner options (when enabled) */}
				{bannerEnabled && (
					<div className="space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
						{/* Mode toggle */}
						<div className="flex gap-2">
							<button
								type="button"
								aria-pressed={bannerMode === "preset"}
								onClick={() => onBannerModeChange("preset")}
								className={cn(
									"flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
									bannerMode === "preset"
										? "border-primary/60 bg-primary/10 text-primary shadow-sm"
										: "border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
								)}
							>
								<Palette className="h-3 w-3" />
								Presets
							</button>
							<button
								type="button"
								aria-pressed={bannerMode === "custom"}
								onClick={() => onBannerModeChange("custom")}
								className={cn(
									"flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
									bannerMode === "custom"
										? "border-primary/60 bg-primary/10 text-primary shadow-sm"
										: "border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
								)}
							>
								<Upload className="h-3 w-3" />
								Custom Image
							</button>
						</div>

						{/* Preset grid or upload */}
						{bannerMode === "preset" ? (
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
								{themedBannerPresets.map((preset: BannerPreset) => (
									<button
										key={preset.id}
										type="button"
										aria-pressed={bannerPreset === preset.id}
										aria-label={preset.name}
										onClick={() => onBannerPresetChange(preset.id)}
										className={cn(
											"group relative h-14 overflow-hidden rounded-lg border-2 transition-all",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
											bannerPreset === preset.id
												? "border-primary ring-2 ring-primary/20 shadow-md"
												: "border-transparent hover:border-muted-foreground/30 hover:shadow-sm",
										)}
									>
										{preset.type === "css" ? (
											<div
												className={`absolute inset-0 ${preset.className ?? ""}`}
												style={preset.style}
											/>
										) : (
											<ShaderBanner preset={preset} staticPreview />
										)}
										{bannerPreset === preset.id && (
											<div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
												<Check className="h-4 w-4 text-white drop-shadow-lg" />
											</div>
										)}
										<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-micro font-medium text-white truncate">
											{preset.name}
										</span>
									</button>
								))}
							</div>
						) : (
							<div>
								<ImageUploadField
									label="Banner Image"
									value={bannerCustomUrl}
									purpose="banner"
									aspectRatio="banner"
									onUploadComplete={onBannerCustomUrlChange}
								/>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
