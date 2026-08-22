"use client";

import { Check, Image, Layout } from "lucide-react";
import { z } from "zod";
import { CharCount, FieldError } from "@/components/admin/field-feedback";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SectionLabel } from "@/components/admin/section-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OG_TEMPLATES } from "@/lib/og-templates";
import { cn } from "@/lib/utils";
import { fieldError } from "@/lib/validate";
import { FieldGroup } from "./field-group";

// Search engines truncate titles past ~70 and descriptions past ~160 chars.
const SEO_TITLE_MAX = 70;
const SEO_DESCRIPTION_MAX = 160;

/**
 * Field → message for every invalid SEO value; `{}` when all valid. The OG
 * image is upload-only (a relative `/api/images/…` path), so it is not checked.
 */
export function seoErrors(v: { seoTitle: string; seoDescription: string }): Record<string, string> {
	const errors: Record<string, string> = {};
	const title = fieldError(z.string().max(SEO_TITLE_MAX), v.seoTitle);
	if (title) errors.seoTitle = title;
	const description = fieldError(z.string().max(SEO_DESCRIPTION_MAX), v.seoDescription);
	if (description) errors.seoDescription = description;
	return errors;
}

const focusRing =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The `/og` template render for the social preview card (same params the live page uses). */
export function ogTemplatePreviewUrl(v: {
	template: string;
	profileName: string;
	bio: string;
	primaryColor: string;
	avatarUrl: string;
}): string {
	return `/og?template=${encodeURIComponent(v.template || "minimal")}&name=${encodeURIComponent(v.profileName || "My Links")}&bio=${encodeURIComponent(v.bio || "")}&theme=${encodeURIComponent(v.primaryColor || "#6366f1")}${v.avatarUrl ? `&avatar=${encodeURIComponent(v.avatarUrl)}` : ""}&_preview=1`;
}

interface SeoSectionProps {
	seoTitle: string;
	seoDescription: string;
	seoOgImage: string;
	seoOgMode: string;
	seoOgTemplate: string;
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
	onSeoTitleChange,
	onSeoDescriptionChange,
	onSeoOgImageChange,
	onSeoOgModeChange,
	onSeoOgTemplateChange,
}: SeoSectionProps) {
	// ponytail: the social preview card moved to the page (Design → SEO preview column toggle).
	const errors = seoErrors({ seoTitle, seoDescription });

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
							aria-invalid={!!errors.seoTitle}
							aria-describedby={errors.seoTitle ? "s-seo-title-error" : "s-seo-title-hint"}
						/>
						<div className="flex items-start justify-between gap-2">
							<p id="s-seo-title-hint" className="text-micro text-muted-foreground">
								Shown in browser tab and search results
							</p>
							<CharCount value={seoTitle} max={SEO_TITLE_MAX} />
						</div>
						<FieldError id="s-seo-title-error" error={errors.seoTitle} />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="s-seo-desc">Meta Description</Label>
						<textarea
							id="s-seo-desc"
							value={seoDescription}
							onChange={(e) => onSeoDescriptionChange(e.target.value)}
							rows={2}
							placeholder="Check out all my links"
							aria-invalid={!!errors.seoDescription}
							aria-describedby={errors.seoDescription ? "s-seo-desc-error" : "s-seo-desc-hint"}
							className="dark:bg-input/30 border-input aria-invalid:border-destructive w-full rounded-md border bg-transparent backdrop-blur-sm px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
						/>
						<div className="flex items-start justify-between gap-2">
							<p id="s-seo-desc-hint" className="text-micro text-muted-foreground">
								Appears below the title in search engine results
							</p>
							<CharCount value={seoDescription} max={SEO_DESCRIPTION_MAX} />
						</div>
						<FieldError id="s-seo-desc-error" error={errors.seoDescription} />
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
									<p className="mt-0.5 text-micro text-muted-foreground">{t.description}</p>
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
						<p className="text-micro text-muted-foreground">
							Recommended size: 1200 x 630 pixels. Max 5MB.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
