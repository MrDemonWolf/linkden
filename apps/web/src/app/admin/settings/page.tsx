"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Search as SearchIcon,
	Shield,
	Mail,
	Save,
	Database,
	Undo2,
	MessageSquare,
	Wallet,
	UserCircle,
	type LucideIcon,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { SeoSection } from "@/components/admin/settings/seo-section";
import { CaptchaSection } from "@/components/admin/settings/captcha-section";
import { EmailSection } from "@/components/admin/settings/email-section";
import { DataSection } from "@/components/admin/settings/data-section";
import { ContactFormSection } from "@/components/admin/settings/contact-form-section";
import { WalletSection } from "@/components/admin/settings/wallet-section";
import { VCardSection } from "@/components/admin/settings/vcard-section";

// ---- Section definitions ----
type SectionId =
	| "seo"
	| "captcha"
	| "email"
	| "contact"
	| "wallet"
	| "vcard"
	| "data";

interface SectionDef {
	id: SectionId;
	label: string;
	icon: LucideIcon;
}

const SECTIONS: SectionDef[] = [
	{ id: "seo", label: "SEO", icon: SearchIcon },
	{ id: "captcha", label: "CAPTCHA", icon: Shield },
	{ id: "email", label: "Email", icon: Mail },
	{ id: "contact", label: "Contact Form", icon: MessageSquare },
	{ id: "wallet", label: "Wallet Pass", icon: Wallet },
	{ id: "vcard", label: "vCard", icon: UserCircle },
	{ id: "data", label: "Data & Info", icon: Database },
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
	contactFormEnabled: boolean;
}

function buildSavedState(s: Record<string, string>): SavedState {
	return {
		seoTitle: s.seo_title ?? "",
		seoDescription: s.seo_description ?? "",
		seoOgImage: s.seo_og_image ?? "",
		captchaProvider: s.captcha_provider ?? "none",
		captchaSiteKey: s.captcha_site_key ?? "",
		captchaSecretKey: s.captcha_secret_key ?? "",
		emailProvider: s.email_provider ?? "resend",
		emailApiKey: s.email_api_key ?? "",
		emailFrom: s.email_from ?? "",
		contactFormEnabled: s.contact_form_enabled === "true",
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
	const [activeSection, setActiveSection] = useState<SectionId>("seo");

	const { getAnimationProps } = useEntranceAnimation(
		!settingsQuery.isLoading,
	);

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
		contactFormEnabled: false,
	});

	// SEO
	const [seoTitle, setSeoTitle] = useState("");
	const [seoDescription, setSeoDescription] = useState("");
	const [seoOgImage, setSeoOgImage] = useState("");

	// CAPTCHA
	const [captchaProvider, setCaptchaProvider] = useState("none");
	const [captchaSiteKey, setCaptchaSiteKey] = useState("");
	const [captchaSecretKey, setCaptchaSecretKey] = useState("");

	// Email
	const [emailProvider, setEmailProvider] = useState("resend");
	const [emailApiKey, setEmailApiKey] = useState("");
	const [emailFrom, setEmailFrom] = useState("");

	// Contact Form
	const [contactFormEnabled, setContactFormEnabled] = useState(false);

	// Load settings
	useEffect(() => {
		if (settingsQuery.data) {
			const s = buildSavedState(settingsQuery.data);
			setSavedState(s);
			setSeoTitle(s.seoTitle);
			setSeoDescription(s.seoDescription);
			setSeoOgImage(s.seoOgImage);
			setCaptchaProvider(s.captchaProvider);
			setCaptchaSiteKey(s.captchaSiteKey);
			setCaptchaSecretKey(s.captchaSecretKey);
			setEmailProvider(s.emailProvider);
			setEmailApiKey(s.emailApiKey);
			setEmailFrom(s.emailFrom);
			setContactFormEnabled(s.contactFormEnabled);
		}
	}, [settingsQuery.data]);

	const isDirty =
		seoTitle !== savedState.seoTitle ||
		seoDescription !== savedState.seoDescription ||
		seoOgImage !== savedState.seoOgImage ||
		captchaProvider !== savedState.captchaProvider ||
		captchaSiteKey !== savedState.captchaSiteKey ||
		captchaSecretKey !== savedState.captchaSecretKey ||
		emailProvider !== savedState.emailProvider ||
		emailApiKey !== savedState.emailApiKey ||
		emailFrom !== savedState.emailFrom ||
		contactFormEnabled !== savedState.contactFormEnabled;

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
		setCaptchaProvider(savedState.captchaProvider);
		setCaptchaSiteKey(savedState.captchaSiteKey);
		setCaptchaSecretKey(savedState.captchaSecretKey);
		setEmailProvider(savedState.emailProvider);
		setEmailApiKey(savedState.emailApiKey);
		setEmailFrom(savedState.emailFrom);
		setContactFormEnabled(savedState.contactFormEnabled);
	};

	const handleSave = async () => {
		try {
			await updateSettings.mutateAsync([
				{ key: "seo_title", value: seoTitle },
				{ key: "seo_description", value: seoDescription },
				{ key: "seo_og_image", value: seoOgImage },
				{ key: "captcha_provider", value: captchaProvider },
				{ key: "captcha_site_key", value: captchaSiteKey },
				{ key: "captcha_secret_key", value: captchaSecretKey },
				{ key: "email_provider", value: emailProvider },
				{ key: "email_api_key", value: emailApiKey },
				{ key: "email_from", value: emailFrom },
				{
					key: "contact_form_enabled",
					value: String(contactFormEnabled),
				},
			]);
			setSavedState({
				seoTitle,
				seoDescription,
				seoOgImage,
				captchaProvider,
				captchaSiteKey,
				captchaSecretKey,
				emailProvider,
				emailApiKey,
				emailFrom,
				contactFormEnabled,
			});
			invalidate();
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
			await importData.mutateAsync({
				mode: "merge",
				data: parsed.data ?? parsed,
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

	const headerAnim = getAnimationProps(0);
	const sidebarAnim = getAnimationProps(1);
	const contentAnim = getAnimationProps(2);

	const sectionContent: Record<SectionId, React.ReactNode> = {
		seo: (
			<SeoSection
				seoTitle={seoTitle}
				seoDescription={seoDescription}
				seoOgImage={seoOgImage}
				onSeoTitleChange={setSeoTitle}
				onSeoDescriptionChange={setSeoDescription}
				onSeoOgImageChange={setSeoOgImage}
			/>
		),
		captcha: (
			<CaptchaSection
				captchaProvider={captchaProvider}
				captchaSiteKey={captchaSiteKey}
				captchaSecretKey={captchaSecretKey}
				onCaptchaProviderChange={setCaptchaProvider}
				onCaptchaSiteKeyChange={setCaptchaSiteKey}
				onCaptchaSecretKeyChange={setCaptchaSecretKey}
			/>
		),
		email: (
			<EmailSection
				emailProvider={emailProvider}
				emailApiKey={emailApiKey}
				emailFrom={emailFrom}
				onEmailProviderChange={setEmailProvider}
				onEmailApiKeyChange={setEmailApiKey}
				onEmailFromChange={setEmailFrom}
			/>
		),
		contact: (
			<ContactFormSection
				contactFormEnabled={contactFormEnabled}
				onContactFormEnabledChange={setContactFormEnabled}
			/>
		),
		wallet: <WalletSection />,
		vcard: <VCardSection />,
		data: (
			<DataSection
				onExport={handleExport}
				onImport={handleImport}
				isExporting={exportData.isFetching}
				isImporting={importData.isPending}
				fileInputRef={fileInputRef}
				versionCheck={versionCheck.data ?? null}
				onCheckUpdates={() =>
					qc.invalidateQueries({
						queryKey:
							trpc.version.checkUpdate.queryOptions().queryKey,
					})
				}
			/>
		),
	};

	const activeLabel =
		SECTIONS.find((s) => s.id === activeSection)?.label ?? "";

	return (
		<div className="space-y-4">
			<PageHeader
				title="Settings"
				description={
					isDirty
						? "You have unsaved changes"
						: "Configure your LinkDen instance"
				}
				actions={
					<>
						{isDirty && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDiscard}
							>
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
							{updateSettings.isPending ? "Saving..." : "Save"}
						</Button>
					</>
				}
				className={cn(headerAnim.className)}
				style={headerAnim.style}
			/>

			{/* Mobile pills */}
			<div
				className={cn(
					"flex gap-2 overflow-x-auto scrollbar-none md:hidden",
					sidebarAnim.className,
				)}
				style={sidebarAnim.style}
			>
				{SECTIONS.map((section) => {
					const Icon = section.icon;
					const isActive = activeSection === section.id;
					return (
						<button
							key={section.id}
							type="button"
							onClick={() => setActiveSection(section.id)}
							className={cn(
								"inline-flex items-center shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200",
								isActive
									? "border-transparent bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
									: "border border-border/50 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
							)}
						>
							<Icon className="mr-1.5 h-3 w-3" />
							{section.label}
						</button>
					);
				})}
			</div>

			{/* Desktop sidebar + content */}
			<div className="flex gap-6">
				{/* Sidebar (desktop) */}
				<nav
					aria-label="Settings sections"
					className={cn(
						"hidden md:block w-48 shrink-0",
						sidebarAnim.className,
					)}
					style={sidebarAnim.style}
				>
					<div className="sticky top-20 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-1.5 space-y-0.5">
						{SECTIONS.map((section) => {
							const Icon = section.icon;
							const isActive = activeSection === section.id;
							return (
								<button
									key={section.id}
									type="button"
									onClick={() => setActiveSection(section.id)}
									className={cn(
										"flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
										isActive
											? "bg-primary/10 text-primary border-l-2 border-primary"
											: "text-muted-foreground hover:bg-white/10 hover:text-foreground",
									)}
								>
									<Icon className="h-4 w-4 shrink-0" />
									{section.label}
								</button>
							);
						})}
					</div>
				</nav>

				{/* Content */}
				<div
					className={cn("flex-1 min-w-0", contentAnim.className)}
					style={contentAnim.style}
				>
					<Card>
						<CardContent className="space-y-4 pt-2">
							<h2 className="text-sm font-semibold">
								{activeLabel}
							</h2>
							{sectionContent[activeSection]}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
