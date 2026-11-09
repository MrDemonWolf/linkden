"use client";

import { Switch } from "@linkden/ui";
import { httpUrlSchema } from "@linkden/validators/blocks";
import { SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { z } from "zod";
import { CharCount, FieldError } from "@/components/admin/field-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
			<div className="flex items-start justify-between gap-4">
				<div>
					<Label htmlFor="consent-banner-enabled" className="text-sm font-medium">
						Show consent banner
					</Label>
					<p id="consent-banner-enabled-hint" className="mt-1 text-micro text-muted-foreground">
						{enabled
							? "Ask before loading embedded media. Profile views and button clicks are not tracked."
							: "When off, supported embeds can load without asking. Profile activity is still not tracked."}
					</p>
				</div>
				<Switch
					id="consent-banner-enabled"
					checked={enabled}
					onCheckedChange={onEnabledChange}
					aria-label="Show consent banner"
					aria-describedby="consent-banner-enabled-hint"
				/>
			</div>

			{enabled && (
				<>
					<div className="space-y-3">
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Visitor choices
						</p>
						<div className="divide-y divide-border rounded-lg border border-border bg-muted/20 px-3">
							<div className="flex items-start justify-between gap-4 py-3">
								<div>
									<p className="text-xs font-medium">Essential</p>
									<p className="mt-1 text-micro text-muted-foreground">
										Essential preferences and core features
									</p>
								</div>
								<Switch checked disabled aria-label="Essential cookies" />
							</div>
							<div className="flex items-start justify-between gap-4 py-3">
								<div>
									<Label htmlFor="consent-embedded-media" className="text-sm font-medium">
										Embedded media
									</Label>
									<p
										id="consent-embedded-media-hint"
										className="mt-1 text-micro text-muted-foreground"
									>
										Offer a choice to allow YouTube, Spotify and other embeds. Until allowed, embeds
										show a click-to-load placeholder.
									</p>
								</div>
								<Switch
									id="consent-embedded-media"
									checked={categories.functional}
									onCheckedChange={(v) => onCategoriesChange({ ...categories, functional: v })}
									aria-label="Embedded media"
									aria-describedby="consent-embedded-media-hint"
								/>
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="consent-text">Banner Text</Label>
						<Textarea
							id="consent-text"
							value={bannerText}
							onChange={(e) => onBannerTextChange(e.target.value)}
							rows={3}
							placeholder="Choose whether to load videos and music from third parties."
							aria-invalid={!!errors.bannerText}
							aria-describedby={errors.bannerText ? "consent-text-error" : "consent-text-hint"}
						/>
						<div className="flex items-start justify-between gap-2">
							<p id="consent-text-hint" className="text-micro text-muted-foreground">
								Leave blank to use the default message.
							</p>
							<CharCount value={bannerText} max={CONSENT_TEXT_MAX} />
						</div>
						<FieldError id="consent-text-error" error={errors.bannerText} />
					</div>

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
				</>
			)}
		</div>
	);
}
