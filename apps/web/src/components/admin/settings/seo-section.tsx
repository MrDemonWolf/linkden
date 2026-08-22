"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FieldGroup } from "./field-group";
import { OG_TEMPLATES } from "@/lib/og-templates";
import { OgPreviewCard } from "./og-preview-card";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SectionLabel } from "@/components/admin/section-header";
import { Check, Layout, Image } from "lucide-react";

const focusRing =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface SeoSectionProps {
	seoTitle: string;
	seoDescription: string;
	seoOgImage: string;
	seoOgMode: string;
	seoOgTemplate: string;
	profileName: string;
	bio: string;
	primaryColor: string;
	avatarUrl: string;
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
	primaryColor,
	avatarUrl,
	onSeoTitleChange,
	onSeoDescriptionChange,
	onSeoOgImageChange,
	onSeoOgModeChange,
	onSeoOgTemplateChange,
}: SeoSectionProps) {
	const previewUrl = `/og?template=${encodeURIComponent(seoOgTemplate || "minimal")}&name=${encodeURIComponent(profileName || "My Links")}&bio=${encodeURIComponent(bio || "")}&theme=${encodeURIComponent(primaryColor || "#6366f1")}${avatarUrl ? `&avatar=${encodeURIComponent(avatarUrl)}` : ""}&_preview=1`;

	// Determine the OG image URL for the preview card
	const ogImageForPreview = seoOgMode === "template" ? previewUrl : seoOgImage || "";

	return (
		<div className="space-y-6">
			{/* Page Title & Meta Description */}
			<div className="space-y-4">
				<SectionLabel>Meta Tags</SectionLabel>
				<FieldGroup columns={2}>
					<div className="space-y-1.5">
						<Label htmlFor="s-seo-title">Page Title</Label>
						<Input
							id="s-seo-title"
							value={seoTitle}
							onChange={(e) => onSeoTitleChange(e.target.value)}
							placeholder="My Links"
						/>
						<p className="text-[11px] text-muted-foreground">
							Shown in browser tab and search results
						</p>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="s-seo-desc">Meta Description</Label>
						<textarea
							id="s-seo-desc"
							value={seoDescription}
							onChange={(e) => onSeoDescriptionChange(e.target.value)}
							rows={2}
							placeholder="Check out all my links"
							className="dark:bg-input/30 border-input w-full rounded-md border bg-transparent backdrop-blur-sm px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
						/>
						<p className="text-[11px] text-muted-foreground">
							Appears below the title in search engine results
						</p>
					</div>
				</FieldGroup>
			</div>

			{/* OG Image section */}
			<div className="space-y-4">
				<SectionLabel>Open Graph Image</SectionLabel>

				{/* Mode toggle */}
				<div className="flex gap-2">
					<button
						type="button"
						aria-pressed={seoOgMode === "template"}
						onClick={() => onSeoOgModeChange("template")}
						className={cn(
							"flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
							focusRing,
							seoOgMode === "template"
								? "border-primary/50 bg-primary/10 text-primary"
								: "border-border text-muted-foreground hover:text-foreground",
						)}
					>
						<Layout className="h-3 w-3" />
						Template
					</button>
					<button
						type="button"
						aria-pressed={seoOgMode === "custom"}
						onClick={() => onSeoOgModeChange("custom")}
						className={cn(
							"flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
							focusRing,
							seoOgMode === "custom"
								? "border-primary/50 bg-primary/10 text-primary"
								: "border-border text-muted-foreground hover:text-foreground",
						)}
					>
						<Image className="h-3 w-3" />
						Upload Image
					</button>
				</div>

				{/* Template selection */}
				{seoOgMode === "template" && (
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{OG_TEMPLATES.map((t) => {
							const isSelected = seoOgTemplate === t.id;
							return (
								<button
									key={t.id}
									type="button"
									aria-pressed={isSelected}
									onClick={() => onSeoOgTemplateChange(t.id)}
									className={cn(
										"relative rounded-lg border p-3 text-left transition-all",
										focusRing,
										isSelected
											? "border-primary/50 bg-primary/5 ring-1 ring-primary/50"
											: "border-border/50 hover:border-border hover:bg-muted/30",
									)}
								>
									{isSelected && (
										<div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
											<Check className="h-2.5 w-2.5" />
										</div>
									)}
									<p className="text-xs font-medium">{t.name}</p>
									<p className="mt-0.5 text-[10px] text-muted-foreground">{t.description}</p>
								</button>
							);
						})}
					</div>
				)}

				{/* Upload image mode */}
				{seoOgMode === "custom" && (
					<div className="space-y-1.5">
						<ImageUploadField
							value={seoOgImage}
							purpose="og_image"
							onUploadComplete={onSeoOgImageChange}
							aspectRatio="banner"
						/>
						<p className="text-[11px] text-muted-foreground">
							Recommended size: 1200 x 630 pixels. Max 5MB.
						</p>
					</div>
				)}
			</div>

			{/* Live Social Preview */}
			<div className="space-y-3">
				<SectionLabel>Social Media Preview</SectionLabel>
				<p className="text-[11px] text-muted-foreground -mt-2">
					How your page will look when shared on social media
				</p>
				<OgPreviewCard
					title={seoTitle || profileName || "My Links"}
					description={seoDescription || bio || "Check out all my links"}
					imageUrl={ogImageForPreview}
				/>
			</div>
		</div>
	);
}
