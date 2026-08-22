"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownUp,
	Contact,
	Cookie,
	Database,
	Mail,
	MapPin,
	MessageSquare,
	Palette,
	Save,
	Search,
	Settings2,
	Shield,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { SectionCard } from "@/components/admin/section-header";
import { BrandingSection } from "@/components/admin/settings/branding-section";
import { CaptchaSection } from "@/components/admin/settings/captcha-section";
import { ConsentSection } from "@/components/admin/settings/consent-section";
import { ContactFormSection } from "@/components/admin/settings/contact-form-section";
import { DataSection } from "@/components/admin/settings/data-section";
import { EmailSection } from "@/components/admin/settings/email-section";
import { MapKitSection } from "@/components/admin/settings/mapkit-section";
import { MigrationSection } from "@/components/admin/settings/migration-section";
import { SeoSection } from "@/components/admin/settings/seo-section";
import { VCardSection, type VCardSectionHandle } from "@/components/admin/settings/vcard-section";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

const COMMON_TIMEZONES = [
	// Americas
	{ label: "Pacific Time (US & Canada)", value: "America/Los_Angeles" },
	{ label: "Mountain Time (US & Canada)", value: "America/Denver" },
	{ label: "Central Time (US & Canada)", value: "America/Chicago" },
	{ label: "Eastern Time (US & Canada)", value: "America/New_York" },
	{ label: "Atlantic Time (Canada)", value: "America/Halifax" },
	{ label: "São Paulo", value: "America/Sao_Paulo" },
	{ label: "Buenos Aires", value: "America/Argentina/Buenos_Aires" },
	{ label: "Bogotá", value: "America/Bogota" },
	{ label: "Mexico City", value: "America/Mexico_City" },
	// Europe
	{ label: "UTC", value: "UTC" },
	{ label: "London (GMT/BST)", value: "Europe/London" },
	{ label: "Paris / Berlin / Rome", value: "Europe/Paris" },
	{ label: "Helsinki", value: "Europe/Helsinki" },
	{ label: "Kyiv", value: "Europe/Kyiv" },
	{ label: "Moscow", value: "Europe/Moscow" },
	{ label: "Istanbul", value: "Europe/Istanbul" },
	// Asia/Pacific
	{ label: "Dubai", value: "Asia/Dubai" },
	{ label: "Kolkata (IST)", value: "Asia/Kolkata" },
	{ label: "Bangkok", value: "Asia/Bangkok" },
	{ label: "Singapore / Kuala Lumpur", value: "Asia/Singapore" },
	{ label: "Shanghai / Beijing", value: "Asia/Shanghai" },
	{ label: "Tokyo", value: "Asia/Tokyo" },
	{ label: "Seoul", value: "Asia/Seoul" },
	{ label: "Sydney", value: "Australia/Sydney" },
	{ label: "Auckland", value: "Pacific/Auckland" },
];

// ---- Saved State (global settings only) ----
interface SavedState {
	seoTitle: string;
	seoDescription: string;
	seoOgImage: string;
	captchaProvider: string;
	captchaSiteKey: string;
	captchaSecretKey: string;
	emailProvider: string;
	emailApiKey: string;
	emailFrom: string;
	adminBrandingEnabled: boolean;
	seoOgMode: string;
	seoOgTemplate: string;
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
	loginLogoUrl: string;
	loginBgMode: string;
	loginBgPreset: string;
	loginBgCustomUrl: string;
	timezone: string;
	consentBannerEnabled: boolean;
	consentBannerText: string;
	consentPrivacyUrl: string;
	consentCategories: string;
	contactFormEnabled: boolean;
}

function buildSavedState(s: Record<string, string>): SavedState {
	return {
		seoTitle: s.seo_title ?? "",
		seoDescription: s.seo_description ?? "",
		seoOgImage: s.seo_og_image ?? "",
		seoOgMode: s.seo_og_mode ?? "template",
		seoOgTemplate: s.seo_og_template ?? "minimal",
		captchaProvider: s.captcha_provider ?? "none",
		captchaSiteKey: s.captcha_site_key ?? "",
		captchaSecretKey: s.captcha_secret_key ?? "",
		emailProvider: s.email_provider ?? "resend",
		emailApiKey: s.email_api_key ?? "",
		emailFrom: s.email_from ?? "",
		adminBrandingEnabled: s.admin_branding_enabled !== "false",
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
		loginLogoUrl: s.branding_login_logo_url ?? "",
		loginBgMode: s.branding_login_bg_mode ?? "default",
		loginBgPreset: s.branding_login_bg_preset ?? "wolf-shadow",
		loginBgCustomUrl: s.branding_login_bg_custom_url ?? "",
		timezone: s.timezone ?? "",
		consentBannerEnabled: s.consent_banner_enabled !== "false",
		consentBannerText: s.consent_banner_text ?? "",
		consentPrivacyUrl: s.consent_privacy_url ?? "",
		consentCategories:
			s.consent_categories ??
			JSON.stringify({ analytics: true, marketing: false, functional: false }),
		contactFormEnabled: s.contact_form_enabled === "true",
	};
}

const SETTINGS_TABS = ["seo", "branding", "email", "features", "data", "privacy"];

export default function SettingsPage() {
	const qc = useQueryClient();
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());
	const versionCheck = useQuery(trpc.version.checkUpdate.queryOptions());
	const exportData = useQuery({
		...trpc.backup.export.queryOptions(),
		enabled: false,
	});
	const importData = useMutation(trpc.backup.import.mutationOptions());

	const fileInputRef = useRef<HTMLInputElement>(null);

	// Active tab: `?tab=` wins (deep links from the dashboard), else the last
	// tab from localStorage so navigations land back where you were.
	const tabParam = useSearchParams().get("tab");
	const [activeTab, setActiveTab] = useState<string>(
		tabParam && SETTINGS_TABS.includes(tabParam) ? tabParam : "seo",
	);
	useEffect(() => {
		if (tabParam && SETTINGS_TABS.includes(tabParam)) return;
		const stored = window.localStorage.getItem("admin.settings.tab");
		if (stored && SETTINGS_TABS.includes(stored)) setActiveTab(stored);
	}, [tabParam]);
	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("admin.settings.tab", activeTab);
	}, [activeTab]);

	// Saved state for dirty tracking
	const [savedState, setSavedState] = useState<SavedState>({
		seoTitle: "",
		seoDescription: "",
		seoOgImage: "",
		captchaProvider: "none",
		captchaSiteKey: "",
		captchaSecretKey: "",
		emailProvider: "resend",
		emailApiKey: "",
		emailFrom: "",
		adminBrandingEnabled: true,
		seoOgMode: "template",
		seoOgTemplate: "minimal",
		siteName: "",
		logoUrl: "",
		faviconUrl: "",
		ppUrl: "",
		tosUrl: "",
		ppMode: "url",
		tosMode: "url",
		ppText: "",
		tosText: "",
		footerBrandingEnabled: true,
		footerBrandingText: "",
		footerBrandingLink: "",
		loginLogoUrl: "",
		loginBgMode: "default",
		loginBgPreset: "wolf-shadow",
		loginBgCustomUrl: "",
		timezone: "",
		consentBannerEnabled: true,
		consentBannerText: "",
		consentPrivacyUrl: "",
		consentCategories: JSON.stringify({ analytics: true, marketing: false, functional: false }),
		contactFormEnabled: false,
	});

	// SEO
	const [seoTitle, setSeoTitle] = useState("");
	const [seoDescription, setSeoDescription] = useState("");
	const [seoOgImage, setSeoOgImage] = useState("");
	const [seoOgMode, setSeoOgMode] = useState("template");
	const [seoOgTemplate, setSeoOgTemplate] = useState("minimal");

	// CAPTCHA
	const [captchaProvider, setCaptchaProvider] = useState("none");
	const [captchaSiteKey, setCaptchaSiteKey] = useState("");
	const [captchaSecretKey, setCaptchaSecretKey] = useState("");

	// Email
	const [emailProvider, setEmailProvider] = useState("resend");
	const [emailApiKey, setEmailApiKey] = useState("");
	const [emailFrom, setEmailFrom] = useState("");

	// Admin Branding
	const [adminBrandingEnabled, setAdminBrandingEnabled] = useState(true);

	// Branding
	const [siteName, setSiteName] = useState("");
	const [logoUrl, setLogoUrl] = useState("");
	const [faviconUrl, setFaviconUrl] = useState("");
	const [ppUrl, setPpUrl] = useState("");
	const [tosUrl, setTosUrl] = useState("");
	const [ppMode, setPpMode] = useState("url");
	const [tosMode, setTosMode] = useState("url");
	const [ppText, setPpText] = useState("");
	const [tosText, setTosText] = useState("");
	const [footerBrandingEnabled, setFooterBrandingEnabled] = useState(true);
	const [footerBrandingText, setFooterBrandingText] = useState("");
	const [footerBrandingLink, setFooterBrandingLink] = useState("");
	const [loginLogoUrl, setLoginLogoUrl] = useState("");
	const [loginBgMode, setLoginBgMode] = useState("default");
	const [loginBgPreset, setLoginBgPreset] = useState("wolf-shadow");
	const [loginBgCustomUrl, setLoginBgCustomUrl] = useState("");
	const [timezone, setTimezone] = useState("");

	// Consent
	const [consentBannerEnabled, setConsentBannerEnabled] = useState(true);
	const [consentBannerText, setConsentBannerText] = useState("");
	const [consentPrivacyUrl, setConsentPrivacyUrl] = useState("");
	const [consentCategories, setConsentCategories] = useState(
		JSON.stringify({ analytics: true, marketing: false, functional: false }),
	);

	// Features
	const [contactFormEnabled, setContactFormEnabled] = useState(false);

	// vCard section (saves via its own tRPC mutation; the global save awaits it via the ref)
	const [vcardDirty, setVcardDirty] = useState(false);
	const vcardSectionRef = useRef<VCardSectionHandle>(null);

	// Load settings
	useEffect(() => {
		if (settingsQuery.data) {
			const s = buildSavedState(settingsQuery.data);
			setSavedState(s);
			setSeoTitle(s.seoTitle);
			setSeoDescription(s.seoDescription);
			setSeoOgImage(s.seoOgImage);
			setSeoOgMode(s.seoOgMode);
			setSeoOgTemplate(s.seoOgTemplate);
			setCaptchaProvider(s.captchaProvider);
			setCaptchaSiteKey(s.captchaSiteKey);
			setCaptchaSecretKey(s.captchaSecretKey);
			setEmailProvider(s.emailProvider);
			setEmailApiKey(s.emailApiKey);
			setEmailFrom(s.emailFrom);
			setAdminBrandingEnabled(s.adminBrandingEnabled);
			setSiteName(s.siteName);
			setLogoUrl(s.logoUrl);
			setFaviconUrl(s.faviconUrl);
			setPpUrl(s.ppUrl);
			setTosUrl(s.tosUrl);
			setPpMode(s.ppMode);
			setTosMode(s.tosMode);
			setPpText(s.ppText);
			setTosText(s.tosText);
			setFooterBrandingEnabled(s.footerBrandingEnabled);
			setFooterBrandingText(s.footerBrandingText);
			setFooterBrandingLink(s.footerBrandingLink);
			setLoginLogoUrl(s.loginLogoUrl);
			setLoginBgMode(s.loginBgMode);
			setLoginBgPreset(s.loginBgPreset);
			setLoginBgCustomUrl(s.loginBgCustomUrl);
			setTimezone(s.timezone);
			setConsentBannerEnabled(s.consentBannerEnabled);
			setConsentBannerText(s.consentBannerText);
			setConsentPrivacyUrl(s.consentPrivacyUrl);
			setConsentCategories(s.consentCategories);
			setContactFormEnabled(s.contactFormEnabled);
		}
	}, [settingsQuery.data]);

	const isDirty =
		seoTitle !== savedState.seoTitle ||
		seoDescription !== savedState.seoDescription ||
		seoOgImage !== savedState.seoOgImage ||
		seoOgMode !== savedState.seoOgMode ||
		seoOgTemplate !== savedState.seoOgTemplate ||
		captchaProvider !== savedState.captchaProvider ||
		captchaSiteKey !== savedState.captchaSiteKey ||
		captchaSecretKey !== savedState.captchaSecretKey ||
		emailProvider !== savedState.emailProvider ||
		emailApiKey !== savedState.emailApiKey ||
		emailFrom !== savedState.emailFrom ||
		adminBrandingEnabled !== savedState.adminBrandingEnabled ||
		siteName !== savedState.siteName ||
		logoUrl !== savedState.logoUrl ||
		faviconUrl !== savedState.faviconUrl ||
		ppUrl !== savedState.ppUrl ||
		tosUrl !== savedState.tosUrl ||
		ppMode !== savedState.ppMode ||
		tosMode !== savedState.tosMode ||
		ppText !== savedState.ppText ||
		tosText !== savedState.tosText ||
		footerBrandingEnabled !== savedState.footerBrandingEnabled ||
		footerBrandingText !== savedState.footerBrandingText ||
		footerBrandingLink !== savedState.footerBrandingLink ||
		loginLogoUrl !== savedState.loginLogoUrl ||
		loginBgMode !== savedState.loginBgMode ||
		loginBgPreset !== savedState.loginBgPreset ||
		loginBgCustomUrl !== savedState.loginBgCustomUrl ||
		timezone !== savedState.timezone ||
		consentBannerEnabled !== savedState.consentBannerEnabled ||
		consentBannerText !== savedState.consentBannerText ||
		consentPrivacyUrl !== savedState.consentPrivacyUrl ||
		consentCategories !== savedState.consentCategories ||
		contactFormEnabled !== savedState.contactFormEnabled ||
		vcardDirty;

	useUnsavedChanges(isDirty);

	const invalidate = useCallback(() => {
		qc.invalidateQueries({
			queryKey: trpc.settings.getAll.queryOptions().queryKey,
		});
	}, [qc]);

	const handleDiscard = () => {
		setSeoTitle(savedState.seoTitle);
		setSeoDescription(savedState.seoDescription);
		setSeoOgImage(savedState.seoOgImage);
		setSeoOgMode(savedState.seoOgMode);
		setSeoOgTemplate(savedState.seoOgTemplate);
		setCaptchaProvider(savedState.captchaProvider);
		setCaptchaSiteKey(savedState.captchaSiteKey);
		setCaptchaSecretKey(savedState.captchaSecretKey);
		setEmailProvider(savedState.emailProvider);
		setEmailApiKey(savedState.emailApiKey);
		setEmailFrom(savedState.emailFrom);
		setAdminBrandingEnabled(savedState.adminBrandingEnabled);
		setSiteName(savedState.siteName);
		setLogoUrl(savedState.logoUrl);
		setFaviconUrl(savedState.faviconUrl);
		setPpUrl(savedState.ppUrl);
		setTosUrl(savedState.tosUrl);
		setPpMode(savedState.ppMode);
		setTosMode(savedState.tosMode);
		setPpText(savedState.ppText);
		setTosText(savedState.tosText);
		setFooterBrandingEnabled(savedState.footerBrandingEnabled);
		setFooterBrandingText(savedState.footerBrandingText);
		setFooterBrandingLink(savedState.footerBrandingLink);
		setLoginLogoUrl(savedState.loginLogoUrl);
		setLoginBgMode(savedState.loginBgMode);
		setLoginBgPreset(savedState.loginBgPreset);
		setLoginBgCustomUrl(savedState.loginBgCustomUrl);
		setTimezone(savedState.timezone);
		setConsentBannerEnabled(savedState.consentBannerEnabled);
		setConsentBannerText(savedState.consentBannerText);
		setConsentPrivacyUrl(savedState.consentPrivacyUrl);
		setConsentCategories(savedState.consentCategories);
		setContactFormEnabled(savedState.contactFormEnabled);
	};

	const handleSave = async () => {
		try {
			// Awaited so a vCard save failure surfaces in this try/catch instead of
			// racing an independent success toast (it persists via its own tRPC mutation).
			await vcardSectionRef.current?.saveIfDirty();
			await updateSettings.mutateAsync([
				{ key: "seo_title", value: seoTitle },
				{ key: "seo_description", value: seoDescription },
				{ key: "seo_og_image", value: seoOgImage },
				{ key: "seo_og_mode", value: seoOgMode },
				{ key: "seo_og_template", value: seoOgTemplate },
				{ key: "captcha_provider", value: captchaProvider },
				{ key: "captcha_site_key", value: captchaSiteKey },
				{ key: "captcha_secret_key", value: captchaSecretKey },
				{ key: "email_provider", value: emailProvider },
				{ key: "email_api_key", value: emailApiKey },
				{ key: "email_from", value: emailFrom },
				{
					key: "admin_branding_enabled",
					value: String(adminBrandingEnabled),
				},
				{ key: "branding_site_name", value: siteName },
				{ key: "branding_logo_url", value: logoUrl },
				{ key: "branding_favicon_url", value: faviconUrl },
				{ key: "branding_pp_url", value: ppUrl },
				{ key: "branding_tos_url", value: tosUrl },
				{ key: "branding_pp_mode", value: ppMode },
				{ key: "branding_tos_mode", value: tosMode },
				{ key: "branding_pp_text", value: ppText },
				{ key: "branding_tos_text", value: tosText },
				{ key: "branding_enabled", value: String(footerBrandingEnabled) },
				{ key: "branding_text", value: footerBrandingText },
				{ key: "branding_link", value: footerBrandingLink },
				{ key: "branding_login_logo_url", value: loginLogoUrl },
				{ key: "branding_login_bg_mode", value: loginBgMode },
				{ key: "branding_login_bg_preset", value: loginBgPreset },
				{ key: "branding_login_bg_custom_url", value: loginBgCustomUrl },
				{ key: "timezone", value: timezone },
				{ key: "consent_banner_enabled", value: String(consentBannerEnabled) },
				{ key: "consent_banner_text", value: consentBannerText },
				{ key: "consent_privacy_url", value: consentPrivacyUrl },
				{ key: "consent_categories", value: consentCategories },
				{ key: "contact_form_enabled", value: String(contactFormEnabled) },
			]);
			setSavedState({
				seoTitle,
				seoDescription,
				seoOgImage,
				seoOgMode,
				seoOgTemplate,
				captchaProvider,
				captchaSiteKey,
				captchaSecretKey,
				emailProvider,
				emailApiKey,
				emailFrom,
				adminBrandingEnabled,
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
				loginLogoUrl,
				loginBgMode,
				loginBgPreset,
				loginBgCustomUrl,
				timezone,
				consentBannerEnabled,
				consentBannerText,
				consentPrivacyUrl,
				consentCategories,
				contactFormEnabled,
			});
			invalidate();
			qc.invalidateQueries({
				queryKey: trpc.settings.get.queryOptions({ key: "admin_branding_enabled" }).queryKey,
			});
			qc.invalidateQueries({
				queryKey: trpc.settings.get.queryOptions({ key: "timezone" }).queryKey,
			});
			toast.success("Settings saved");
		} catch {
			toast.error("Failed to save settings");
		}
	};

	const handleExport = async () => {
		try {
			const result = await exportData.refetch();
			if (result.data) {
				const blob = new Blob([JSON.stringify(result.data, null, 2)], {
					type: "application/json",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `linkden-backup-${new Date().toISOString().slice(0, 10)}.json`;
				a.click();
				URL.revokeObjectURL(url);
				toast.success("Export downloaded");
			}
		} catch {
			toast.error("Failed to export");
		}
	};

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			if (!parsed.data) {
				toast.error("Invalid LinkDen export file.");
				if (fileInputRef.current) fileInputRef.current.value = "";
				return;
			}
			await importData.mutateAsync({
				mode: "merge",
				data: parsed.data,
			});
			invalidate();
			toast.success("Import successful");
		} catch {
			toast.error("Failed to import. Make sure the file is valid JSON.");
		}
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	if (settingsQuery.isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={`sk-${i}`} className="h-40" />
				))}
			</div>
		);
	}

	return (
		<PageShell>
			<PageHeader
				title="Settings"
				description={isDirty ? "You have unsaved changes" : "Configure your LinkDen instance"}
				badge={
					isDirty ? (
						<Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
							Unsaved
						</Badge>
					) : undefined
				}
				actions={
					<Button
						size="sm"
						variant={isDirty ? "default" : "outline"}
						disabled={!isDirty || updateSettings.isPending}
						onClick={handleSave}
					>
						<Save className="mr-1.5 h-3.5 w-3.5" />
						{updateSettings.isPending ? "Saving…" : "Save changes"}
					</Button>
				}
			/>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
				<TabsList className="grid h-auto w-full grid-cols-3 sm:inline-flex sm:w-auto">
					<TabsTrigger value="seo">SEO</TabsTrigger>
					<TabsTrigger value="branding">Branding</TabsTrigger>
					<TabsTrigger value="email">Email</TabsTrigger>
					<TabsTrigger value="features">Features</TabsTrigger>
					<TabsTrigger value="data">Data</TabsTrigger>
					<TabsTrigger value="privacy">Privacy</TabsTrigger>
				</TabsList>

				{/* SEO */}
				<TabsContent value="seo" className="space-y-6 mt-0">
					<SectionCard
						icon={Search}
						title="SEO & Open Graph"
						description="Control how your page appears in search results and social media shares"
					>
						<SeoSection
							seoTitle={seoTitle}
							seoDescription={seoDescription}
							seoOgImage={seoOgImage}
							seoOgMode={seoOgMode}
							seoOgTemplate={seoOgTemplate}
							profileName={settingsQuery.data?.profile_name ?? ""}
							bio={settingsQuery.data?.bio ?? ""}
							primaryColor={settingsQuery.data?.custom_primary ?? "#6366f1"}
							avatarUrl={settingsQuery.data?.avatar_url ?? ""}
							onSeoTitleChange={setSeoTitle}
							onSeoDescriptionChange={setSeoDescription}
							onSeoOgImageChange={setSeoOgImage}
							onSeoOgModeChange={setSeoOgMode}
							onSeoOgTemplateChange={setSeoOgTemplate}
						/>
					</SectionCard>
				</TabsContent>

				{/* Branding */}
				<TabsContent value="branding" className="space-y-6 mt-0">
					<SectionCard
						icon={Palette}
						title="Branding"
						description="Customize your site name, logo, favicon, and footer"
					>
						<BrandingSection
							siteName={siteName}
							logoUrl={logoUrl}
							faviconUrl={faviconUrl}
							ppUrl={ppUrl}
							tosUrl={tosUrl}
							ppMode={ppMode}
							tosMode={tosMode}
							ppText={ppText}
							tosText={tosText}
							adminBrandingEnabled={adminBrandingEnabled}
							footerBrandingEnabled={footerBrandingEnabled}
							footerBrandingText={footerBrandingText}
							footerBrandingLink={footerBrandingLink}
							profileName={settingsQuery.data?.profile_name ?? ""}
							loginLogoUrl={loginLogoUrl}
							loginBgMode={loginBgMode}
							loginBgPreset={loginBgPreset}
							loginBgCustomUrl={loginBgCustomUrl}
							onSiteNameChange={setSiteName}
							onLogoUrlChange={setLogoUrl}
							onFaviconUrlChange={setFaviconUrl}
							onPpUrlChange={setPpUrl}
							onTosUrlChange={setTosUrl}
							onPpModeChange={setPpMode}
							onTosModeChange={setTosMode}
							onPpTextChange={setPpText}
							onTosTextChange={setTosText}
							onAdminBrandingEnabledChange={setAdminBrandingEnabled}
							onFooterBrandingEnabledChange={setFooterBrandingEnabled}
							onFooterBrandingTextChange={setFooterBrandingText}
							onFooterBrandingLinkChange={setFooterBrandingLink}
							onLoginLogoUrlChange={setLoginLogoUrl}
							onLoginBgModeChange={setLoginBgMode}
							onLoginBgPresetChange={setLoginBgPreset}
							onLoginBgCustomUrlChange={setLoginBgCustomUrl}
						/>
					</SectionCard>

					<SectionCard
						icon={Settings2}
						title="Site Configuration"
						description="Timezone and regional preferences"
					>
						<div className="space-y-1.5">
							<label
								htmlFor="timezone-select"
								className="text-xs font-medium text-muted-foreground"
							>
								Timezone
							</label>
							<Select
								id="timezone-select"
								value={timezone}
								onValueChange={setTimezone}
								items={[
									{
										value: "",
										label: `Browser default (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
									},
									...COMMON_TIMEZONES,
								]}
							/>
							<p className="text-micro text-muted-foreground">
								Used for timestamps on the dashboard. Defaults to your browser&apos;s timezone.
							</p>
						</div>
					</SectionCard>
				</TabsContent>

				{/* Email */}
				<TabsContent value="email" className="space-y-6 mt-0">
					<SectionCard
						icon={Mail}
						title="Email Provider"
						description="Configure the email service for notifications and auth emails"
					>
						<EmailSection
							emailProvider={emailProvider}
							emailApiKey={emailApiKey}
							emailFrom={emailFrom}
							onEmailProviderChange={setEmailProvider}
							onEmailApiKeyChange={setEmailApiKey}
							onEmailFromChange={setEmailFrom}
						/>
					</SectionCard>
				</TabsContent>

				{/* Features — visitor-facing features backed by the public page */}
				<TabsContent value="features" className="space-y-6 mt-0">
					<SectionCard
						icon={Contact}
						title="Digital business card (vCard)"
						description="Let visitors save your contact details to their phone with one tap"
					>
						<VCardSection ref={vcardSectionRef} onDirtyChange={setVcardDirty} />
					</SectionCard>

					<SectionCard
						icon={MessageSquare}
						title="Contact form"
						description="Collect messages from visitors via a form on your public page"
					>
						<ContactFormSection
							contactFormEnabled={contactFormEnabled}
							onContactFormEnabledChange={setContactFormEnabled}
						/>
					</SectionCard>

					<SectionCard
						icon={MapPin}
						title="Apple Maps (MapKit JS)"
						description="Enable address autocomplete for Location blocks"
					>
						<MapKitSection />
					</SectionCard>
				</TabsContent>

				{/* Data — backup, import/export, version + platform migration */}
				<TabsContent value="data" className="space-y-6 mt-0">
					<SectionCard
						icon={Database}
						title="Backup & version"
						description="Export or import your data and check for updates"
					>
						<DataSection
							onExport={handleExport}
							onImport={handleImport}
							isExporting={exportData.isFetching}
							isImporting={importData.isPending}
							fileInputRef={fileInputRef}
							versionCheck={versionCheck.data ?? null}
							onCheckUpdates={() =>
								qc.invalidateQueries({
									queryKey: trpc.version.checkUpdate.queryOptions().queryKey,
								})
							}
						/>
					</SectionCard>

					<SectionCard
						icon={ArrowDownUp}
						title="Migration"
						description="Import data from other link-in-bio platforms"
					>
						<MigrationSection onImportComplete={invalidate} />
					</SectionCard>
				</TabsContent>

				{/* Privacy */}
				<TabsContent value="privacy" className="space-y-6 mt-0">
					<SectionCard
						icon={Cookie}
						title="Cookie & Consent"
						description="Configure the GDPR consent banner and cookie categories"
					>
						<ConsentSection
							enabled={consentBannerEnabled}
							bannerText={consentBannerText}
							privacyUrl={consentPrivacyUrl}
							categories={JSON.parse(consentCategories)}
							onEnabledChange={setConsentBannerEnabled}
							onBannerTextChange={setConsentBannerText}
							onPrivacyUrlChange={setConsentPrivacyUrl}
							onCategoriesChange={(v) => setConsentCategories(JSON.stringify(v))}
						/>
					</SectionCard>

					<SectionCard
						icon={Shield}
						title="Security"
						description="CAPTCHA and bot protection settings"
					>
						<CaptchaSection
							captchaProvider={captchaProvider}
							captchaSiteKey={captchaSiteKey}
							captchaSecretKey={captchaSecretKey}
							onCaptchaProviderChange={setCaptchaProvider}
							onCaptchaSiteKeyChange={setCaptchaSiteKey}
							onCaptchaSecretKeyChange={setCaptchaSecretKey}
						/>
					</SectionCard>
				</TabsContent>

				{/* Sticky save bar — visible across tabs while dirty */}
				<StickySaveBar
					isDirty={isDirty}
					isSaving={updateSettings.isPending}
					onSave={handleSave}
					onDiscard={handleDiscard}
				/>
			</Tabs>
		</PageShell>
	);
}
