import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FieldGroup } from "./field-group";
import { OG_TEMPLATES } from "@/lib/og-templates";
import { Check } from "lucide-react";

interface SeoSectionProps {
	seoTitle: string;
	seoDescription: string;
	seoOgImage: string;
	seoOgMode: string;
	seoOgTemplate: string;
	profileName: string;
	bio: string;
	onSeoTitleChange: (v: string) => void;
	onSeoDescriptionChange: (v: string) => void;
	onSeoOgImageChange: (v: string) => void;
	onSeoOgModeChange: (v: string) => void;
	onSeoOgTemplateChange: (v: string) => void;
}

export function SeoSection({
	seoTitle,
	seoDescription,
	seoOgImage,
	seoOgMode,
	seoOgTemplate,
	profileName,
	bio,
	onSeoTitleChange,
	onSeoDescriptionChange,
	onSeoOgImageChange,
	onSeoOgModeChange,
	onSeoOgTemplateChange,
}: SeoSectionProps) {
	const previewUrl = `/api/og?template=${encodeURIComponent(seoOgTemplate || "minimal")}&name=${encodeURIComponent(profileName || "My Links")}&bio=${encodeURIComponent(bio || "")}&_preview=1`;

	return (
		<div className="space-y-4">
			<FieldGroup>
				<div className="space-y-1.5">
					<Label htmlFor="s-seo-title">Page Title</Label>
					<Input
						id="s-seo-title"
						value={seoTitle}
						onChange={(e) => onSeoTitleChange(e.target.value)}
						placeholder="My Links"
					/>
				</div>
			</FieldGroup>
			<div className="space-y-1.5">
				<Label htmlFor="s-seo-desc">Description</Label>
				<textarea
					id="s-seo-desc"
					value={seoDescription}
					onChange={(e) => onSeoDescriptionChange(e.target.value)}
					rows={2}
					placeholder="Check out all my links"
					className="dark:bg-input/30 border-input w-full rounded-md border bg-transparent backdrop-blur-sm px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
				/>
			</div>

			{/* OG Image mode toggle */}
			<div className="space-y-3">
				<Label>OG Image</Label>
				<div className="flex rounded-lg border border-border/50 p-0.5 bg-muted/30">
					<button
						type="button"
						onClick={() => onSeoOgModeChange("template")}
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
							seoOgMode === "template"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Use Template
					</button>
					<button
						type="button"
						onClick={() => onSeoOgModeChange("custom")}
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
							seoOgMode === "custom"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Custom URL
					</button>
				</div>

				{seoOgMode === "template" ? (
					<div className="space-y-3">
						{/* Template grid */}
						<div className="grid grid-cols-2 gap-2">
							{OG_TEMPLATES.map((t) => {
								const isSelected = seoOgTemplate === t.id;
								return (
									<button
										key={t.id}
										type="button"
										onClick={() => onSeoOgTemplateChange(t.id)}
										className={cn(
											"relative rounded-lg border p-3 text-left transition-all",
											isSelected
												? "border-primary bg-primary/5 ring-1 ring-primary"
												: "border-border/50 hover:border-border hover:bg-muted/30",
										)}
									>
										{isSelected && (
											<div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
												<Check className="h-2.5 w-2.5" />
											</div>
										)}
										<p className="text-xs font-medium">{t.name}</p>
										<p className="mt-0.5 text-[10px] text-muted-foreground">
											{t.description}
										</p>
									</button>
								);
							})}
						</div>

						{/* Live preview */}
						<div className="space-y-1.5">
							<p className="text-[11px] font-medium text-muted-foreground">Preview</p>
							<div className="overflow-hidden rounded-lg border border-border/50">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={previewUrl}
									alt="OG Image Preview"
									className="w-full"
									key={`${seoOgTemplate}-${profileName}-${bio}`}
								/>
							</div>
							<p className="text-[10px] text-muted-foreground">
								Uses your profile name and bio automatically
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-1.5">
						<Input
							id="s-seo-og"
							value={seoOgImage}
							onChange={(e) => onSeoOgImageChange(e.target.value)}
							placeholder="https://..."
						/>
						<p className="text-[11px] text-muted-foreground">
							Preview image shown when your page is shared on social media
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
