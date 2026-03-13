"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Save,
	Undo2,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { SeoSection } from "@/components/admin/settings/seo-section";
import { CaptchaSection } from "@/components/admin/settings/captcha-section";
import { EmailSection } from "@/components/admin/settings/email-section";
import { BrandingSection } from "@/components/admin/settings/branding-section";
import { DataSection } from "@/components/admin/settings/data-section";
import { MigrationSection } from "@/components/admin/settings/migration-section";

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
	};
}

export default function SettingsPage() {
	const qc = useQueryClient();
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSettings = useMutation(
		trpc.settings.updateBulk.mutationOptions(),
	);
	const versionCheck = useQuery(trpc.version.checkUpdate.queryOptions());
	const exportData = useQuery({
		...trpc.backup.export.queryOptions(),
		enabled: false,
	});
	const importData = useMutation(trpc.backup.import.mutationOptions());

	const fileInputRef = useRef<HTMLInputElement>(null);


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
		adminBrandingEnabled !== savedState.adminBrandingEnabled
		|| siteName !== savedState.siteName
		|| logoUrl !== savedState.logoUrl
		|| faviconUrl !== savedState.faviconUrl
		|| ppUrl !== savedState.ppUrl
		|| tosUrl !== savedState.tosUrl
		|| ppMode !== savedState.ppMode
		|| tosMode !== savedState.tosMode
		|| ppText !== savedState.ppText
		|| tosText !== savedState.tosText
		|| footerBrandingEnabled !== savedState.footerBrandingEnabled
		|| footerBrandingText !== savedState.footerBrandingText
		|| footerBrandingLink !== savedState.footerBrandingLink;

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
	};

	const handleSave = async () => {
		try {
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
				siteName, logoUrl, faviconUrl, ppUrl, tosUrl, ppMode, tosMode, ppText, tosText,
				footerBrandingEnabled, footerBrandingText, footerBrandingLink,
			});
			invalidate();
			qc.invalidateQueries({
				queryKey: trpc.settings.get.queryOptions({ key: "admin_branding_enabled" }).queryKey,
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
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			<PageHeader
				title="Settings"
				description={isDirty ? "You have unsaved changes" : "Configure your LinkDen instance"}
				actions={
					<>
						{isDirty && (
							<Button variant="ghost" size="sm" onClick={handleDiscard}>
								<Undo2 className="mr-1.5 h-3.5 w-3.5" />
								Discard
							</Button>
						)}
						<Button
							size="sm"
							variant={isDirty ? "default" : "outline"}
							disabled={!isDirty || updateSettings.isPending}
							onClick={handleSave}
						>
							<Save className="mr-1.5 h-3.5 w-3.5" />
							{updateSettings.isPending ? "Saving…" : "Save"}
						</Button>
					</>
				}
			/>

			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">Branding</h2>
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
					/>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">SEO</h2>
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
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">Security</h2>
					<CaptchaSection
						captchaProvider={captchaProvider}
						captchaSiteKey={captchaSiteKey}
						captchaSecretKey={captchaSecretKey}
						onCaptchaProviderChange={setCaptchaProvider}
						onCaptchaSiteKeyChange={setCaptchaSiteKey}
						onCaptchaSecretKeyChange={setCaptchaSecretKey}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">Email</h2>
					<EmailSection
						emailProvider={emailProvider}
						emailApiKey={emailApiKey}
						emailFrom={emailFrom}
						onEmailProviderChange={setEmailProvider}
						onEmailApiKeyChange={setEmailApiKey}
						onEmailFromChange={setEmailFrom}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">Data & Info</h2>
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
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">Migration</h2>
					<MigrationSection onImportComplete={invalidate} />
				</CardContent>
			</Card>
		</div>
	);
}
