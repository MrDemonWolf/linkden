"use client";

import { Switch } from "@linkden/ui";
import { httpUrlSchema } from "@linkden/validators/blocks";
import { SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { z } from "zod";
import { CharCount, FieldError } from "@/components/admin/field-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError } from "@/lib/validate";

// The server's cap (settings registry), not a copy of it.
const CONSENT_TEXT_MAX = SETTING_REGISTRY.consent_banner_text?.maxLength ?? 500;

/** Field → message for invalid consent values. Only checked while the banner is enabled (the fields are hidden otherwise). */
export function consentErrors(v: {
	enabled: boolean;
	bannerText: string;
	privacyUrl: string;
}): Record<string, string> {
	if (!v.enabled) return {};
	const errors: Record<string, string> = {};
	const text = fieldError(z.string().max(CONSENT_TEXT_MAX), v.bannerText);
	if (text) errors.bannerText = text;
	const url = v.privacyUrl ? fieldError(httpUrlSchema, v.privacyUrl) : null;
	if (url) errors.privacyUrl = url;
	return errors;
}

interface ConsentCategories {
	analytics: boolean;
	marketing: boolean;
	functional: boolean;
}

interface ConsentSectionProps {
	enabled: boolean;
	bannerText: string;
	privacyUrl: string;
	categories: ConsentCategories;
	onEnabledChange: (v: boolean) => void;
	onBannerTextChange: (v: string) => void;
	onPrivacyUrlChange: (v: string) => void;
	onCategoriesChange: (v: ConsentCategories) => void;
}

export function ConsentSection({
	enabled,
	bannerText,
	privacyUrl,
	categories,
	onEnabledChange,
	onBannerTextChange,
	onPrivacyUrlChange,
	onCategoriesChange,
}: ConsentSectionProps) {
	const errors = consentErrors({ enabled, bannerText, privacyUrl });
	return (
		<div className="space-y-6">
			{/* Enable/disable toggle */}
			<div className="flex items-center justify-between">
				<div>
					<Label className="text-sm font-medium">Show Consent Banner</Label>
					<p className="text-micro text-muted-foreground">
						Display a cookie consent banner to visitors
					</p>
				</div>
				<Switch
					checked={enabled}
					onCheckedChange={onEnabledChange}
					aria-label="Show consent banner"
				/>
			</div>

			{enabled && (
				<>
					{/* Banner Text */}
					<div className="space-y-1.5">
						<Label htmlFor="consent-text">Banner Text</Label>
						<textarea
							id="consent-text"
							value={bannerText}
							onChange={(e) => onBannerTextChange(e.target.value)}
							rows={3}
							placeholder="This site uses cookies for authentication and optional analytics..."
							aria-invalid={!!errors.bannerText}
							aria-describedby={errors.bannerText ? "consent-text-error" : "consent-text-hint"}
							className="dark:bg-input/30 border-input-border aria-invalid:border-destructive w-full rounded-md border bg-transparent backdrop-blur-sm px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
						/>
						<div className="flex items-start justify-between gap-2">
							<p id="consent-text-hint" className="text-micro text-muted-foreground">
								Customize the message shown in the consent banner
							</p>
							<CharCount value={bannerText} max={CONSENT_TEXT_MAX} />
						</div>
						<FieldError id="consent-text-error" error={errors.bannerText} />
					</div>

					{/* Privacy Policy URL */}
					<div className="space-y-1.5">
						<Label htmlFor="consent-privacy-url">Privacy Policy URL</Label>
						<Input
							id="consent-privacy-url"
							value={privacyUrl}
							onChange={(e) => onPrivacyUrlChange(e.target.value)}
							placeholder="https://yourdomain.com/privacy"
							type="url"
							inputMode="url"
							aria-invalid={!!errors.privacyUrl}
							aria-describedby={
								errors.privacyUrl ? "consent-privacy-url-error" : "consent-privacy-url-hint"
							}
						/>
						<p id="consent-privacy-url-hint" className="text-micro text-muted-foreground">
							Link shown in the banner for your privacy policy
						</p>
						<FieldError id="consent-privacy-url-error" error={errors.privacyUrl} />
					</div>

					{/* Cookie Categories */}
					<div className="space-y-3">
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Cookie Categories
						</p>

						<div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
							{/* Essential — always on */}
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium">Essential</p>
									<p className="text-micro text-muted-foreground">
										Required for authentication and core features
									</p>
								</div>
								<Switch checked disabled aria-label="Essential cookies" />
							</div>

							<div className="border-t border-border/30" />

							{/* Analytics */}
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium">Analytics</p>
									<p className="text-micro text-muted-foreground">
										Track page views, clicks, and visitor behaviour
									</p>
								</div>
								<Switch
									checked={categories.analytics}
									onCheckedChange={(v) => onCategoriesChange({ ...categories, analytics: v })}
									aria-label="Analytics cookies"
								/>
							</div>

							<div className="border-t border-border/30" />

							{/* Embedded media (stored as "functional"). Marketing is no longer
							    offered: nothing on the page used it. Stored values keep the key. */}
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium">Embedded media</p>
									<p className="text-micro text-muted-foreground">
										Loads YouTube, Spotify and other embeds; until allowed, embeds show a
										click-to-load placeholder
									</p>
								</div>
								<Switch
									checked={categories.functional}
									onCheckedChange={(v) => onCategoriesChange({ ...categories, functional: v })}
									aria-label="Embedded media"
								/>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
