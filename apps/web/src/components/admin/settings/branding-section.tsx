"use client";

import { Check, Sparkles, Upload, Image as ImageIcon } from "lucide-react";
import type { BannerPreset } from "@linkden/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { ShaderBanner } from "@/components/public/shader-banner";
import { cn } from "@/lib/utils";
import { replaceTemplateVars } from "@/lib/format";
import { getLoginBgPresets } from "@/lib/login-bg";

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
	loginLogoUrl: string;
	loginBgMode: string;
	loginBgPreset: string;
	loginBgCustomUrl: string;
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
	onLoginLogoUrlChange: (v: string) => void;
	onLoginBgModeChange: (v: string) => void;
	onLoginBgPresetChange: (v: string) => void;
	onLoginBgCustomUrlChange: (v: string) => void;
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
				<p className="text-micro text-muted-foreground leading-tight mt-0.5">{description}</p>
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
		<div className="inline-flex rounded-md border border-border overflow-hidden text-micro">
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
	loginLogoUrl,
	loginBgMode,
	loginBgPreset,
	loginBgCustomUrl,
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
	onLoginLogoUrlChange,
	onLoginBgModeChange,
	onLoginBgPresetChange,
	onLoginBgCustomUrlChange,
}: BrandingSectionProps) {
	const loginBgPresets = getLoginBgPresets();
	const resolvedBgMode = loginBgMode || "default";
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
				<p className="text-micro text-muted-foreground">
					Displayed in sidebar, login page, and browser tab
				</p>
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

			{/* Login Page customization */}
			<div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
				<div>
					<p className="text-xs font-medium">Login Page</p>
					<p className="text-micro text-muted-foreground">
						Customize the login + setup screens with a dedicated logo and background
					</p>
				</div>

				<div className="space-y-1.5">
					<p className="text-micro font-medium text-muted-foreground">Login Logo</p>
					<p className="text-micro text-muted-foreground">
						Optional — falls back to the main logo above when empty
					</p>
					<ImageUploadField
						value={loginLogoUrl}
						purpose="login_logo"
						onUploadComplete={onLoginLogoUrlChange}
						aspectRatio="logo"
					/>
				</div>

				<div className="space-y-2">
					<p className="text-micro font-medium text-muted-foreground">Login Background</p>
					<div
						className="inline-flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background p-1"
						role="tablist"
						aria-label="Login background mode"
					>
						{(
							[
								{ id: "default", label: "Default", icon: Sparkles },
								{ id: "preset", label: "Preset", icon: ImageIcon },
								{ id: "custom", label: "Custom", icon: Upload },
							] as const
						).map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={resolvedBgMode === id}
								onClick={() => onLoginBgModeChange(id)}
								className={cn(
									"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
									resolvedBgMode === id
										? "bg-primary/10 text-primary shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="h-3 w-3" />
								{label}
							</button>
						))}
					</div>

					{resolvedBgMode === "default" && (
						<p className="text-micro text-muted-foreground">
							Theme-aware glow over the base background — adapts to the active theme.
						</p>
					)}

					{resolvedBgMode === "preset" && (
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{loginBgPresets.map((preset: BannerPreset) => (
								<button
									key={preset.id}
									type="button"
									onClick={() => onLoginBgPresetChange(preset.id)}
									className={cn(
										"group relative h-16 overflow-hidden rounded-lg border-2 transition-all",
										loginBgPreset === preset.id
											? "border-primary ring-2 ring-primary/20 shadow-md"
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
									{loginBgPreset === preset.id && (
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
					)}

					{resolvedBgMode === "custom" && (
						<ImageUploadField
							value={loginBgCustomUrl}
							purpose="login_background"
							onUploadComplete={onLoginBgCustomUrlChange}
							aspectRatio="banner"
						/>
					)}
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
								placeholder="https://linkden.io"
							/>
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
