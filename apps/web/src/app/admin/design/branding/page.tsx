"use client";

import type { SettingKey } from "@linkden/validators/settings";
import { useQuery } from "@tanstack/react-query";
import { Contact, Cookie, Palette, Wallet } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { SectionCard } from "@/components/admin/section-header";
import { BrandingSection, brandingErrors } from "@/components/admin/settings/branding-section";
import { ConsentSection, consentErrors } from "@/components/admin/settings/consent-section";
import { VCardSection, type VCardSectionHandle } from "@/components/admin/settings/vcard-section";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

const DEFAULT_CATEGORIES = JSON.stringify({ analytics: true, marketing: false, functional: false });

interface BrandingForm {
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
	consentBannerEnabled: boolean;
	consentBannerText: string;
	consentPrivacyUrl: string;
	consentCategories: string;
}

function parse(s: Record<string, string>): BrandingForm {
	return {
		siteName: s.branding_site_name ?? "",
		logoUrl: s.branding_logo_url ?? "",
		faviconUrl: s.branding_favicon_url ?? "",
		ppUrl: s.branding_pp_url ?? "",
		tosUrl: s.branding_tos_url ?? "",
		ppMode: s.branding_pp_mode ?? "url",
		tosMode: s.branding_tos_mode ?? "url",
		ppText: s.branding_pp_text ?? "",
		tosText: s.branding_tos_text ?? "",
		footerBrandingEnabled: s.branding_enabled !== "false",
		footerBrandingText: s.branding_text ?? "",
		footerBrandingLink: s.branding_link ?? "",
		consentBannerEnabled: s.consent_banner_enabled !== "false",
		consentBannerText: s.consent_banner_text ?? "",
		consentPrivacyUrl: s.consent_privacy_url ?? "",
		consentCategories: s.consent_categories ?? DEFAULT_CATEGORIES,
	};
}

function serialize(f: BrandingForm): Array<{ key: SettingKey; value: string }> {
	return [
		{ key: "branding_site_name", value: f.siteName },
		{ key: "branding_logo_url", value: f.logoUrl },
		{ key: "branding_favicon_url", value: f.faviconUrl },
		{ key: "branding_pp_url", value: f.ppUrl },
		{ key: "branding_tos_url", value: f.tosUrl },
		{ key: "branding_pp_mode", value: f.ppMode },
		{ key: "branding_tos_mode", value: f.tosMode },
		{ key: "branding_pp_text", value: f.ppText },
		{ key: "branding_tos_text", value: f.tosText },
		{ key: "branding_enabled", value: String(f.footerBrandingEnabled) },
		{ key: "branding_text", value: f.footerBrandingText },
		{ key: "branding_link", value: f.footerBrandingLink },
		{ key: "consent_banner_enabled", value: String(f.consentBannerEnabled) },
		{ key: "consent_banner_text", value: f.consentBannerText },
		{ key: "consent_privacy_url", value: f.consentPrivacyUrl },
		{ key: "consent_categories", value: f.consentCategories },
	];
}

function validate(f: BrandingForm): Record<string, string> {
	return {
		...brandingErrors(f),
		...consentErrors({
			enabled: f.consentBannerEnabled,
			bannerText: f.consentBannerText,
			privacyUrl: f.consentPrivacyUrl,
		}),
	};
}

/** Design → Branding: footer, logo/favicon, legal links, consent banner and the footer actions (vCard, Wallet). */
export default function DesignBrandingPage() {
	const form = useSettingsForm<BrandingForm>({
		parse,
		serialize,
		validate,
		successMessage: "Branding saved",
		errorMessage: "Failed to save branding",
	});
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const { state: f, setState } = form;
	const set = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) =>
		setState((prev) => (prev ? { ...prev, [key]: value } : prev));

	// vCard persists via its own tRPC mutation; the page's Save awaits it through the ref.
	const vcardRef = useRef<VCardSectionHandle>(null);
	const [vcardDirty, setVcardDirty] = useState(false);
	const [vcardHasErrors, setVcardHasErrors] = useState(false);
	useUnsavedChanges(vcardDirty);

	usePreviewSlot({
		overrides: f
			? {
					settings: {
						brandingEnabled: f.footerBrandingEnabled,
						brandingText: f.footerBrandingText || "Powered by LinkDen · by MrDemonWolf, Inc.",
						brandingPpUrl: f.ppMode === "url" ? f.ppUrl || null : null,
						consentBannerEnabled: f.consentBannerEnabled,
						consentBannerText: f.consentBannerText || null,
						consentPrivacyUrl: f.consentPrivacyUrl || null,
						consentCategories: f.consentCategories,
					},
				}
			: undefined,
	});

	if (settingsQuery.isError) {
		return <QueryError message="Couldn't load settings" onRetry={() => settingsQuery.refetch()} />;
	}
	if (!f) {
		return (
			<div className="space-y-5" aria-busy="true" role="status" aria-label="Loading branding">
				<Skeleton className="h-64" />
				<Skeleton className="h-40" />
			</div>
		);
	}

	const handleSave = async () => {
		try {
			// Awaited so a vCard failure is surfaced (it toasts itself) before the
			// settings save reports success.
			await vcardRef.current?.saveIfDirty();
		} catch {
			return;
		}
		await form.save();
	};

	const walletEnabled = settingsQuery.data?.wallet_pass_enabled === "true";

	return (
		<div className="space-y-5">
			<SectionCard
				icon={Palette}
				title="Branding"
				description="Site name, logo, favicon, footer text and legal links"
			>
				<BrandingSection
					siteName={f.siteName}
					logoUrl={f.logoUrl}
					faviconUrl={f.faviconUrl}
					ppUrl={f.ppUrl}
					tosUrl={f.tosUrl}
					ppMode={f.ppMode}
					tosMode={f.tosMode}
					ppText={f.ppText}
					tosText={f.tosText}
					footerBrandingEnabled={f.footerBrandingEnabled}
					footerBrandingText={f.footerBrandingText}
					footerBrandingLink={f.footerBrandingLink}
					profileName={settingsQuery.data?.profile_name ?? ""}
					onSiteNameChange={(v) => set("siteName", v)}
					onLogoUrlChange={(v) => set("logoUrl", v)}
					onFaviconUrlChange={(v) => set("faviconUrl", v)}
					onPpUrlChange={(v) => set("ppUrl", v)}
					onTosUrlChange={(v) => set("tosUrl", v)}
					onPpModeChange={(v) => set("ppMode", v)}
					onTosModeChange={(v) => set("tosMode", v)}
					onPpTextChange={(v) => set("ppText", v)}
					onTosTextChange={(v) => set("tosText", v)}
					onFooterBrandingEnabledChange={(v) => set("footerBrandingEnabled", v)}
					onFooterBrandingTextChange={(v) => set("footerBrandingText", v)}
					onFooterBrandingLinkChange={(v) => set("footerBrandingLink", v)}
				/>
			</SectionCard>

			<SectionCard
				icon={Cookie}
				title="Cookie & consent banner"
				description="The GDPR consent banner shown to visitors and its cookie categories"
			>
				<ConsentSection
					enabled={f.consentBannerEnabled}
					bannerText={f.consentBannerText}
					privacyUrl={f.consentPrivacyUrl}
					categories={JSON.parse(f.consentCategories)}
					onEnabledChange={(v) => set("consentBannerEnabled", v)}
					onBannerTextChange={(v) => set("consentBannerText", v)}
					onPrivacyUrlChange={(v) => set("consentPrivacyUrl", v)}
					onCategoriesChange={(v) => set("consentCategories", JSON.stringify(v))}
				/>
			</SectionCard>

			<SectionCard
				icon={Contact}
				title="Footer actions"
				description="The Save contact (vCard) and Add to Wallet buttons under your links"
			>
				<div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-border p-3">
					<div className="flex min-w-0 items-center gap-2">
						<Wallet className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						<div className="min-w-0">
							<p className="text-xs font-medium">Apple Wallet pass</p>
							<p className="text-micro text-muted-foreground">
								Pass contents and signing live under Settings → Wallet.
							</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Badge variant="outline" className={walletEnabled ? "text-success" : undefined}>
							{walletEnabled ? "On" : "Off"}
						</Badge>
						<Link
							href="/admin/settings/wallet"
							className="text-xs font-medium text-primary underline-offset-2 hover:underline"
						>
							Configure in Wallet
						</Link>
					</div>
				</div>
				<VCardSection
					ref={vcardRef}
					onDirtyChange={setVcardDirty}
					onErrorsChange={setVcardHasErrors}
				/>
			</SectionCard>

			<StickySaveBar
				isDirty={form.isDirty || vcardDirty}
				isSaving={form.isSaving}
				hasErrors={form.hasErrors || vcardHasErrors}
				onSave={handleSave}
				onDiscard={form.reset}
			/>
		</div>
	);
}
