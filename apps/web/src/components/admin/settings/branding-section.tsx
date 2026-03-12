"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { cn } from "@/lib/utils";

interface BrandingSectionProps {
	siteName: string;
	logoUrl: string;
	faviconUrl: string;
	ppUrl: string;
	tosUrl: string;
	cookieUrl: string;
	adminBrandingEnabled: boolean;
	footerBrandingEnabled: boolean;
	footerBrandingText: string;
	footerBrandingLink: string;
	profileName: string;
	onSiteNameChange: (v: string) => void;
	onLogoUrlChange: (v: string) => void;
	onFaviconUrlChange: (v: string) => void;
	onPpUrlChange: (v: string) => void;
	onTosUrlChange: (v: string) => void;
	onCookieUrlChange: (v: string) => void;
	onAdminBrandingEnabledChange: (v: boolean) => void;
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
		<label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
			<div className="min-w-0 flex-1">
				<span className="text-xs font-medium group-hover:text-foreground transition-colors">
					{label}
				</span>
				<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
					{description}
				</p>
			</div>
			<button
				id={id}
				type="button"
				role="switch"
				aria-checked={checked}
				aria-label={label}
				onClick={() => onChange(!checked)}
				className={cn(
					"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
					checked ? "bg-primary" : "bg-muted",
				)}
			>
				<span
					className={cn(
						"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
						checked ? "translate-x-[18px]" : "translate-x-[3px]",
					)}
				/>
			</button>
		</label>
	);
}

export function BrandingSection({
	siteName,
	logoUrl,
	faviconUrl,
	ppUrl,
	tosUrl,
	cookieUrl,
	adminBrandingEnabled,
	footerBrandingEnabled,
	footerBrandingText,
	footerBrandingLink,
	profileName,
	onSiteNameChange,
	onLogoUrlChange,
	onFaviconUrlChange,
	onPpUrlChange,
	onTosUrlChange,
	onCookieUrlChange,
	onAdminBrandingEnabledChange,
	onFooterBrandingEnabledChange,
	onFooterBrandingTextChange,
	onFooterBrandingLinkChange,
}: BrandingSectionProps) {
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
					maxLength={50}
				/>
				<p className="text-[11px] text-muted-foreground">
					Displayed in sidebar, login page, and browser tab
				</p>
			</div>

			{/* Logo + Favicon side by side */}
			<div className="grid gap-6 sm:grid-cols-2">
				<div className="space-y-1.5">
					<p className="text-xs font-medium">Logo</p>
					<p className="text-[11px] text-muted-foreground">
						Shown on login page and admin sidebar
					</p>
					<ImageUploadField
						value={logoUrl}
						purpose="logo"
						onUploadComplete={onLogoUrlChange}
						aspectRatio="logo"
					/>
				</div>
				<div className="space-y-1.5">
					<p className="text-xs font-medium">Favicon</p>
					<p className="text-[11px] text-muted-foreground">
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

			{/* Admin Panel Branding toggle */}
			<Toggle
				id="branding-admin-toggle"
				checked={adminBrandingEnabled}
				onChange={onAdminBrandingEnabledChange}
				label="Admin Panel Branding"
				description='Show "Powered by LinkDen" in the admin sidebar'
			/>

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
							/>
							<p className="text-[11px] text-muted-foreground leading-tight">
								Variables: <code className="rounded bg-muted px-1">{"{{year}}"}</code>{" "}
								<code className="rounded bg-muted px-1">{"{{copyright}}"}</code>{" "}
								<code className="rounded bg-muted px-1">{"{{name}}"}</code>
							</p>
							{footerBrandingText && /\{\{(year|copyright|name)\}\}/.test(footerBrandingText) && (
								<p className="text-[11px] text-muted-foreground">
									Preview:{" "}
									<span className="font-medium text-foreground">
										{footerBrandingText
											.replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
											.replace(/\{\{copyright\}\}/g, "\u00A9")
											.replace(/\{\{name\}\}/g, profileName || "Your Name")}
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
								placeholder="https://linkden.io"
							/>
						</div>
					</div>
				)}
			</div>

			{/* Legal Links */}
			<div className="space-y-3">
				<p className="text-xs font-medium">Legal Links</p>
				<p className="text-[11px] text-muted-foreground -mt-2">
					Shown in the login page footer
				</p>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label htmlFor="branding-pp-url">Privacy Policy URL</Label>
						<Input
							id="branding-pp-url"
							type="url"
							value={ppUrl}
							onChange={(e) => onPpUrlChange(e.target.value)}
							placeholder="https://example.com/privacy"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="branding-tos-url">Terms of Service URL</Label>
						<Input
							id="branding-tos-url"
							type="url"
							value={tosUrl}
							onChange={(e) => onTosUrlChange(e.target.value)}
							placeholder="https://example.com/terms"
						/>
					</div>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="branding-cookie-url">Cookie Policy URL</Label>
					<Input
						id="branding-cookie-url"
						type="url"
						value={cookieUrl}
						onChange={(e) => onCookieUrlChange(e.target.value)}
						placeholder="https://example.com/cookies"
					/>
				</div>
			</div>
		</div>
	);
}
