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
	ppMode: string;
	tosMode: string;
	ppText: string;
	tosText: string;
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
	onPpModeChange: (v: string) => void;
	onTosModeChange: (v: string) => void;
	onPpTextChange: (v: string) => void;
	onTosTextChange: (v: string) => void;
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

function ModeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	return (
		<div className="inline-flex rounded-md border border-border overflow-hidden text-[10px]">
			<button
				type="button"
				className={cn(
					"px-2 py-0.5 transition-colors",
					value === "url" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
				)}
				onClick={() => onChange("url")}
			>
				URL
			</button>
			<button
				type="button"
				className={cn(
					"px-2 py-0.5 transition-colors",
					value === "text" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
				)}
				onClick={() => onChange("text")}
			>
				Text
			</button>
		</div>
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
	onPpModeChange,
	onTosModeChange,
	onPpTextChange,
	onTosTextChange,
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
						<div className="flex items-center gap-2">
							<Label htmlFor="branding-pp">Privacy Policy</Label>
							<ModeToggle value={ppMode} onChange={onPpModeChange} />
						</div>
						{ppMode === "url" ? (
							<Input
								id="branding-pp"
								type="url"
								value={ppUrl}
								onChange={(e) => onPpUrlChange(e.target.value)}
								placeholder="https://example.com/privacy"
							/>
						) : (
							<textarea
								id="branding-pp"
								value={ppText}
								onChange={(e) => onPpTextChange(e.target.value)}
								placeholder="Enter your privacy policy text..."
								className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								rows={4}
							/>
						)}
					</div>
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							<Label htmlFor="branding-tos">Terms of Service</Label>
							<ModeToggle value={tosMode} onChange={onTosModeChange} />
						</div>
						{tosMode === "url" ? (
							<Input
								id="branding-tos"
								type="url"
								value={tosUrl}
								onChange={(e) => onTosUrlChange(e.target.value)}
								placeholder="https://example.com/terms"
							/>
						) : (
							<textarea
								id="branding-tos"
								value={tosText}
								onChange={(e) => onTosTextChange(e.target.value)}
								placeholder="Enter your terms of service text..."
								className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								rows={4}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
