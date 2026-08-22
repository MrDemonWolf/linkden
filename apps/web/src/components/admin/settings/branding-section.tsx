"use client";

import { httpUrlSchema } from "@linkden/validators/blocks";
import { SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { z } from "zod";
import { FieldError } from "@/components/admin/field-feedback";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { replaceTemplateVars } from "@/lib/format";
import { fieldError } from "@/lib/validate";

// Same caps the server applies (it truncates silently past them).
const SITE_NAME_MAX = SETTING_REGISTRY.branding_site_name?.maxLength ?? 50;
const FOOTER_TEXT_MAX = SETTING_REGISTRY.branding_text?.maxLength ?? 100;

/** Blank means "cleared"; only filled URLs are checked. */
function urlError(value: string): string | null {
	return value ? fieldError(httpUrlSchema, value) : null;
}

/**
 * Field → message for invalid branding values; `{}` when all valid. Hidden
 * fields (footer link while the footer is off, legal URLs in text mode) are
 * skipped. Upload fields hold relative `/api/images/…` paths and are not URLs.
 */
export function brandingErrors(v: {
	siteName: string;
	footerBrandingEnabled: boolean;
	footerBrandingText: string;
	footerBrandingLink: string;
	ppMode: string;
	ppUrl: string;
	tosMode: string;
	tosUrl: string;
}): Record<string, string> {
	const errors: Record<string, string> = {};
	const siteName = fieldError(z.string().max(SITE_NAME_MAX), v.siteName);
	if (siteName) errors.siteName = siteName;
	if (v.footerBrandingEnabled) {
		const text = fieldError(z.string().max(FOOTER_TEXT_MAX), v.footerBrandingText);
		if (text) errors.footerBrandingText = text;
		const link = urlError(v.footerBrandingLink);
		if (link) errors.footerBrandingLink = link;
	}
	const pp = v.ppMode === "url" ? urlError(v.ppUrl) : null;
	if (pp) errors.ppUrl = pp;
	const tos = v.tosMode === "url" ? urlError(v.tosUrl) : null;
	if (tos) errors.tosUrl = tos;
	return errors;
}

interface BrandingSectionProps {
	siteName: string;
	logoUrl: string;
	faviconUrl: string;
	ppUrl: string;
	tosUrl: string;
	ppMode: string;
	tosMode: string;
	ppText: string;
	tosText: string;
	footerBrandingEnabled: boolean;
	footerBrandingText: string;
	footerBrandingLink: string;
	profileName: string;
	onSiteNameChange: (v: string) => void;
	onLogoUrlChange: (v: string) => void;
	onFaviconUrlChange: (v: string) => void;
	onPpUrlChange: (v: string) => void;
	onTosUrlChange: (v: string) => void;
	onPpModeChange: (v: string) => void;
	onTosModeChange: (v: string) => void;
	onPpTextChange: (v: string) => void;
	onTosTextChange: (v: string) => void;
	onFooterBrandingEnabledChange: (v: boolean) => void;
	onFooterBrandingTextChange: (v: string) => void;
	onFooterBrandingLinkChange: (v: string) => void;
}

function Toggle({
	id,
	checked,
	onChange,
	label,
	description,
}: {
	id: string;
	checked: boolean;
	onChange: (v: boolean) => void;
	label: string;
	description: string;
}) {
	return (
		<div className="flex items-start gap-3">
			<div className="min-w-0 flex-1">
				<Label htmlFor={id} className="text-xs font-medium">
					{label}
				</Label>
				<p className="mt-0.5 text-micro leading-tight text-muted-foreground">{description}</p>
			</div>
			<Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
		</div>
	);
}

/**
 * URL-vs-Text switch for a legal link. Single-select `ToggleGroup` (Base UI's
 * `multiple` defaults to false); an empty `next` means the pressed segment was
 * re-pressed, so it is ignored and one mode always stays selected. `label`
 * names the group — the two segments read "URL"/"Text" in both instances, so
 * without it a screen reader cannot tell the privacy group from the terms one.
 */
function ModeToggle({
	value,
	onChange,
	label,
}: {
	value: string;
	onChange: (v: string) => void;
	label: string;
}) {
	return (
		<ToggleGroup
			value={[value]}
			onValueChange={(next) => {
				const picked = next[0];
				if (picked) onChange(picked);
			}}
			size="sm"
			spacing={0}
			aria-label={label}
			className="rounded-md border border-border p-0.5"
		>
			<ToggleGroupItem
				value="url"
				className="min-h-11 px-3 md:min-h-7 md:px-2 aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:aria-pressed:bg-primary hover:aria-pressed:text-primary-foreground"
			>
				URL
			</ToggleGroupItem>
			<ToggleGroupItem
				value="text"
				className="min-h-11 px-3 md:min-h-7 md:px-2 aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:aria-pressed:bg-primary hover:aria-pressed:text-primary-foreground"
			>
				Text
			</ToggleGroupItem>
		</ToggleGroup>
	);
}

export function BrandingSection({
	siteName,
	logoUrl,
	faviconUrl,
	ppUrl,
	tosUrl,
	ppMode,
	tosMode,
	ppText,
	tosText,
	footerBrandingEnabled,
	footerBrandingText,
	footerBrandingLink,
	profileName,
	onSiteNameChange,
	onLogoUrlChange,
	onFaviconUrlChange,
	onPpUrlChange,
	onTosUrlChange,
	onPpModeChange,
	onTosModeChange,
	onPpTextChange,
	onTosTextChange,
	onFooterBrandingEnabledChange,
	onFooterBrandingTextChange,
	onFooterBrandingLinkChange,
}: BrandingSectionProps) {
	const errors = brandingErrors({
		siteName,
		footerBrandingEnabled,
		footerBrandingText,
		footerBrandingLink,
		ppMode,
		ppUrl,
		tosMode,
		tosUrl,
	});
	return (
		<div className="space-y-6">
			{/* Site Name */}
			<div className="space-y-1.5">
				<Label htmlFor="branding-site-name">Site Name</Label>
				<Input
					id="branding-site-name"
					value={siteName}
					onChange={(e) => onSiteNameChange(e.target.value)}
					placeholder="LinkDen"
					maxLength={SITE_NAME_MAX}
					aria-invalid={!!errors.siteName}
					aria-describedby={
						errors.siteName ? "branding-site-name-error" : "branding-site-name-hint"
					}
				/>
				<p id="branding-site-name-hint" className="text-micro text-muted-foreground">
					Displayed in the admin rail, login page, and browser tab
				</p>
				<FieldError id="branding-site-name-error" error={errors.siteName} />
			</div>

			{/* Logo + Favicon side by side */}
			<div className="grid gap-6 sm:grid-cols-2">
				<div className="space-y-1.5">
					<p className="text-xs font-medium">Logo</p>
					<p className="text-micro text-muted-foreground">Shown on login page and admin sidebar</p>
					<ImageUploadField
						value={logoUrl}
						purpose="logo"
						onUploadComplete={onLogoUrlChange}
						aspectRatio="logo"
					/>
				</div>
				<div className="space-y-1.5">
					<p className="text-xs font-medium">Favicon</p>
					<p className="text-micro text-muted-foreground">
						Browser tab icon (auto-cropped to square)
					</p>
					<ImageUploadField
						value={faviconUrl}
						purpose="favicon"
						onUploadComplete={onFaviconUrlChange}
						aspectRatio="square"
					/>
				</div>
			</div>

			{/* Footer Branding */}
			<div className="space-y-3">
				<Toggle
					id="branding-footer-toggle"
					checked={footerBrandingEnabled}
					onChange={onFooterBrandingEnabledChange}
					label="Footer Branding"
					description="Display a footer with custom text and link on public page"
				/>
				{footerBrandingEnabled && (
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="branding-footer-text">Custom Text</Label>
							<Input
								id="branding-footer-text"
								value={footerBrandingText}
								onChange={(e) => onFooterBrandingTextChange(e.target.value)}
								placeholder="Powered by LinkDen"
								maxLength={FOOTER_TEXT_MAX}
								aria-invalid={!!errors.footerBrandingText}
								aria-describedby={
									errors.footerBrandingText ? "branding-footer-text-error" : undefined
								}
							/>
							<FieldError id="branding-footer-text-error" error={errors.footerBrandingText} />
							<p className="text-micro text-muted-foreground leading-tight">
								Variables: <code className="rounded bg-muted px-1">{"{{year}}"}</code>{" "}
								<code className="rounded bg-muted px-1">{"{{copyright}}"}</code>{" "}
								<code className="rounded bg-muted px-1">{"{{name}}"}</code>
							</p>
							{footerBrandingText && /\{\{(year|copyright|name)\}\}/.test(footerBrandingText) && (
								<p className="text-micro text-muted-foreground">
									Preview:{" "}
									<span className="font-medium text-foreground">
										{replaceTemplateVars(footerBrandingText, profileName || "Your Name")}
									</span>
								</p>
							)}
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="branding-footer-link">Custom Link</Label>
							<Input
								id="branding-footer-link"
								value={footerBrandingLink}
								onChange={(e) => onFooterBrandingLinkChange(e.target.value)}
								placeholder="https://yourdomain.com"
								type="url"
								inputMode="url"
								aria-invalid={!!errors.footerBrandingLink}
								aria-describedby={
									errors.footerBrandingLink ? "branding-footer-link-error" : undefined
								}
							/>
							<FieldError id="branding-footer-link-error" error={errors.footerBrandingLink} />
						</div>
					</div>
				)}
			</div>

			{/* Legal Links */}
			<div className="space-y-3">
				<p className="text-xs font-medium">Legal Links</p>
				<p className="text-micro text-muted-foreground -mt-2">Shown in the login page footer</p>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							<Label htmlFor="branding-pp">Privacy Policy</Label>
							<ModeToggle value={ppMode} onChange={onPpModeChange} label="Privacy policy source" />
						</div>
						{ppMode === "url" ? (
							<Input
								id="branding-pp"
								type="url"
								value={ppUrl}
								onChange={(e) => onPpUrlChange(e.target.value)}
								placeholder="https://yourdomain.com/privacy"
								inputMode="url"
								aria-invalid={!!errors.ppUrl}
								aria-describedby={errors.ppUrl ? "branding-pp-error" : undefined}
							/>
						) : (
							<Textarea
								id="branding-pp"
								value={ppText}
								onChange={(e) => onPpTextChange(e.target.value)}
								placeholder="Enter your privacy policy text..."
								rows={4}
							/>
						)}
						<FieldError id="branding-pp-error" error={errors.ppUrl} />
					</div>
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							<Label htmlFor="branding-tos">Terms of Service</Label>
							<ModeToggle
								value={tosMode}
								onChange={onTosModeChange}
								label="Terms of service source"
							/>
						</div>
						{tosMode === "url" ? (
							<Input
								id="branding-tos"
								type="url"
								value={tosUrl}
								onChange={(e) => onTosUrlChange(e.target.value)}
								placeholder="https://yourdomain.com/terms"
								inputMode="url"
								aria-invalid={!!errors.tosUrl}
								aria-describedby={errors.tosUrl ? "branding-tos-error" : undefined}
							/>
						) : (
							<Textarea
								id="branding-tos"
								value={tosText}
								onChange={(e) => onTosTextChange(e.target.value)}
								placeholder="Enter your terms of service text..."
								rows={4}
							/>
						)}
						<FieldError id="branding-tos-error" error={errors.tosUrl} />
					</div>
				</div>
			</div>
		</div>
	);
}
