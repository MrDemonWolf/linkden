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
				<label
					htmlFor="a-banner-enabled"
					className="flex items-start gap-3 cursor-pointer group"
				>
					<div className="min-w-0 flex-1">
						<span className="text-xs font-medium group-hover:text-foreground transition-colors">
							Show banner on public page
						</span>
						<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
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
				{bannerEnabled && (
					<>
						<div className="flex gap-2" role="tablist">
							<button
								type="button"
								role="tab"
								id="tab-banner-preset"
								aria-selected={bannerMode === "preset"}
								onClick={() => onBannerModeChange("preset")}
								className={cn(
									"flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
									bannerMode === "preset"
										? "border-primary bg-primary/5 text-primary"
										: "border-border text-muted-foreground hover:text-foreground",
								)}
							>
								<Palette className="h-3 w-3" />
								Presets
							</button>
							<button
								type="button"
								role="tab"
								id="tab-banner-custom"
								aria-selected={bannerMode === "custom"}
								onClick={() => onBannerModeChange("custom")}
								className={cn(
									"flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
									bannerMode === "custom"
										? "border-primary bg-primary/5 text-primary"
										: "border-border text-muted-foreground hover:text-foreground",
								)}
							>
								<Upload className="h-3 w-3" />
								Custom Image
							</button>
						</div>

						{bannerMode === "preset" ? (
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tabpanel" aria-labelledby="tab-banner-preset">
								{themedBannerPresets.map((preset: BannerPreset) => (
									<button
										key={preset.id}
										type="button"
										onClick={() => onBannerPresetChange(preset.id)}
										className={cn(
											"group relative h-12 overflow-hidden rounded-md border-2 transition-all",
											bannerPreset === preset.id
												? "border-primary ring-2 ring-primary/30"
												: "border-transparent hover:border-muted-foreground/30",
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
											<div className="absolute inset-0 flex items-center justify-center bg-black/20">
												<Check className="h-4 w-4 text-white drop-shadow" />
											</div>
										)}
										<span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate">
											{preset.name}
										</span>
									</button>
								))}
							</div>
						) : (
							<ImageUploadField
								label="Banner Image"
								value={bannerCustomUrl}
								purpose="banner"
								aspectRatio="banner"
								onUploadComplete={onBannerCustomUrlChange}
							/>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
