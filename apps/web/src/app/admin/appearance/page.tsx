"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Undo2 } from "lucide-react";
import { themePresets } from "@linkden/ui/themes";
import { getBannerPresetsForTheme } from "@linkden/ui/banner-presets";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MobilePreviewSheet } from "@/components/admin/mobile-preview-sheet";
import { SharedPreview } from "@/components/admin/shared-preview";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { ProfileSection } from "@/components/admin/appearance/profile-section";
import { ThemePresetsSection } from "@/components/admin/appearance/theme-presets-section";
import { ColorsSection } from "@/components/admin/appearance/colors-section";
import { BannerSection } from "@/components/admin/appearance/banner-section";
import { VerifiedBadgeSection, BrandingSection } from "@/components/admin/appearance/branding-section";
import { CustomCssSection } from "@/components/admin/appearance/custom-css-section";

interface SavedState {
	profileName: string;
	profileBio: string;
	profileAvatar: string;
	theme: string;
	colorMode: string;
	primaryColor: string;
	secondaryColor: string;
	accentColor: string;
	bgColor: string;
	customCss: string;
	bannerEnabled: boolean;
	bannerPreset: string;
	bannerMode: "preset" | "custom";
	bannerCustomUrl: string;
	verifiedBadge: boolean;
	brandingEnabled: boolean;
	brandingText: string;
	brandingLink: string;
}

function buildSavedState(settings: Record<string, string>): SavedState {
	return {
		profileName: settings.profile_name ?? "",
		profileBio: settings.bio ?? "",
		profileAvatar: settings.avatar_url ?? "",
		theme: settings.theme_preset ?? "default",
		colorMode: settings.default_color_mode ?? "light",
		primaryColor: settings.custom_primary ?? "#0FACED",
		secondaryColor: settings.custom_secondary ?? "#E2E8F0",
		accentColor: settings.custom_accent ?? "#38BDF8",
		bgColor: settings.custom_background ?? "#FFFFFF",
		customCss: settings.custom_css ?? "",
		bannerEnabled: settings.banner_enabled === "true",
		bannerPreset: settings.banner_preset ?? "",
		bannerMode: (settings.banner_mode as "preset" | "custom") || "preset",
		bannerCustomUrl: settings.banner_custom_url ?? "",
		verifiedBadge: settings.verified_badge === "true",
		brandingEnabled: settings.branding_enabled !== "false",
		brandingText: settings.branding_text ?? "",
		brandingLink: settings.branding_link ?? "",
	};
}

export default function AppearancePage() {
	const qc = useQueryClient();
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());

	const settings = settingsQuery.data ?? {};

	const [savedState, setSavedState] = useState<SavedState>({
		profileName: "", profileBio: "", profileAvatar: "",
		theme: "default", colorMode: "light",
		primaryColor: "#0FACED", secondaryColor: "#E2E8F0",
		accentColor: "#38BDF8", bgColor: "#FFFFFF",
		customCss: "", bannerEnabled: false, bannerPreset: "",
		bannerMode: "preset", bannerCustomUrl: "",
		verifiedBadge: false, brandingEnabled: true,
		brandingText: "", brandingLink: "",
	});

	const [profileName, setProfileName] = useState("");
	const [profileBio, setProfileBio] = useState("");
	const [profileAvatar, setProfileAvatar] = useState("");
	const [selectedTheme, setSelectedTheme] = useState("default");
	const [colorMode, setColorMode] = useState("light");
	const [primaryColor, setPrimaryColor] = useState("#0FACED");
	const [secondaryColor, setSecondaryColor] = useState("#E2E8F0");
	const [accentColor, setAccentColor] = useState("#38BDF8");
	const [bgColor, setBgColor] = useState("#FFFFFF");
	const [customCss, setCustomCss] = useState("");
	const [previewDark, setPreviewDark] = useState(false);
	const [bannerEnabled, setBannerEnabled] = useState(false);
	const [bannerPreset, setBannerPreset] = useState("");
	const [bannerMode, setBannerMode] = useState<"preset" | "custom">("preset");
	const [bannerCustomUrl, setBannerCustomUrl] = useState("");
	const [verifiedBadge, setVerifiedBadge] = useState(false);
	const [brandingEnabled, setBrandingEnabled] = useState(true);
	const [brandingText, setBrandingText] = useState("");
	const [brandingLink, setBrandingLink] = useState("");
	const [showMobilePreview, setShowMobilePreview] = useState(false);

	const [systemPrefersDark, setSystemPrefersDark] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		setSystemPrefersDark(mq.matches);
		const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	useEffect(() => {
		if (colorMode === "dark") setPreviewDark(true);
		else if (colorMode === "light") setPreviewDark(false);
		else if (colorMode === "system") setPreviewDark(systemPrefersDark);
	}, [colorMode, systemPrefersDark]);

	useEffect(() => {
		if (settingsQuery.data) {
			const s = buildSavedState(settings);
			setSavedState(s);
			setProfileName(s.profileName);
			setProfileBio(s.profileBio);
			setProfileAvatar(s.profileAvatar);
			setSelectedTheme(s.theme);
			setColorMode(s.colorMode);
			setPrimaryColor(s.primaryColor);
			setSecondaryColor(s.secondaryColor);
			setAccentColor(s.accentColor);
			setBgColor(s.bgColor);
			setCustomCss(s.customCss);
			setBannerEnabled(s.bannerEnabled);
			setBannerPreset(s.bannerPreset);
			setBannerMode(s.bannerMode);
			setBannerCustomUrl(s.bannerCustomUrl);
			setVerifiedBadge(s.verifiedBadge);
			setBrandingEnabled(s.brandingEnabled);
			setBrandingText(s.brandingText);
			setBrandingLink(s.brandingLink);
		}
	}, [settingsQuery.data]);

	const isDirty =
		profileName !== savedState.profileName ||
		profileBio !== savedState.profileBio ||
		profileAvatar !== savedState.profileAvatar ||
		selectedTheme !== savedState.theme ||
		colorMode !== savedState.colorMode ||
		primaryColor !== savedState.primaryColor ||
		secondaryColor !== savedState.secondaryColor ||
		accentColor !== savedState.accentColor ||
		bgColor !== savedState.bgColor ||
		customCss !== savedState.customCss ||
		bannerEnabled !== savedState.bannerEnabled ||
		bannerPreset !== savedState.bannerPreset ||
		bannerMode !== savedState.bannerMode ||
		bannerCustomUrl !== savedState.bannerCustomUrl ||
		verifiedBadge !== savedState.verifiedBadge ||
		brandingEnabled !== savedState.brandingEnabled ||
		brandingText !== savedState.brandingText ||
		brandingLink !== savedState.brandingLink;

	useUnsavedChanges(isDirty);

	const invalidate = useCallback(() => {
		qc.invalidateQueries({
			queryKey: trpc.settings.getAll.queryOptions().queryKey,
		});
	}, [qc]);

	const handleThemeSelect = (name: string) => {
		setSelectedTheme(name);
		const preset = themePresets.find((t) => t.name === name);
		if (preset) {
			const vars = preset.cssVars.light;
			setPrimaryColor(vars["--ld-primary"]);
			setSecondaryColor(vars["--ld-secondary"]);
			setAccentColor(vars["--ld-accent"]);
			setBgColor(vars["--ld-background"]);
		}
	};

	const handlePublish = async () => {
		try {
			await updateSettings.mutateAsync([
				{ key: "profile_name", value: profileName },
				{ key: "bio", value: profileBio },
				{ key: "avatar_url", value: profileAvatar },
				{ key: "theme_preset", value: selectedTheme },
				{ key: "default_color_mode", value: colorMode },
				{ key: "custom_primary", value: primaryColor },
				{ key: "custom_secondary", value: secondaryColor },
				{ key: "custom_accent", value: accentColor },
				{ key: "custom_background", value: bgColor },
				{ key: "custom_css", value: customCss },
				{ key: "banner_enabled", value: String(bannerEnabled) },
				{ key: "banner_preset", value: bannerPreset },
				{ key: "banner_mode", value: bannerMode },
				{ key: "banner_custom_url", value: bannerCustomUrl },
				{ key: "verified_badge", value: String(verifiedBadge) },
				{ key: "branding_enabled", value: String(brandingEnabled) },
				{ key: "branding_text", value: brandingText },
				{ key: "branding_link", value: brandingLink },
				]);
			setSavedState({
				profileName, profileBio, profileAvatar,
				theme: selectedTheme, colorMode,
				primaryColor, secondaryColor, accentColor, bgColor,
				customCss, bannerEnabled, bannerPreset, bannerMode, bannerCustomUrl,
				verifiedBadge, brandingEnabled, brandingText, brandingLink,
			});
			invalidate();
			toast.success("Appearance published");
		} catch {
			toast.error("Failed to publish appearance");
		}
	};

	const handleDiscard = () => {
		setProfileName(savedState.profileName);
		setProfileBio(savedState.profileBio);
		setProfileAvatar(savedState.profileAvatar);
		setSelectedTheme(savedState.theme);
		setColorMode(savedState.colorMode);
		setPrimaryColor(savedState.primaryColor);
		setSecondaryColor(savedState.secondaryColor);
		setAccentColor(savedState.accentColor);
		setBgColor(savedState.bgColor);
		setCustomCss(savedState.customCss);
		setBannerEnabled(savedState.bannerEnabled);
		setBannerPreset(savedState.bannerPreset);
		setBannerMode(savedState.bannerMode);
		setBannerCustomUrl(savedState.bannerCustomUrl);
		setVerifiedBadge(savedState.verifiedBadge);
		setBrandingEnabled(savedState.brandingEnabled);
		setBrandingText(savedState.brandingText);
		setBrandingLink(savedState.brandingLink);
	};

	const resolvedThemeVars = useMemo(() => {
		const preset = themePresets.find((t) => t.name === selectedTheme) ?? themePresets[0];
		const mode = previewDark ? "dark" : "light";
		const vars = { ...preset.cssVars[mode] };
		if (!previewDark) {
			vars["--ld-primary"] = primaryColor;
			vars["--ld-secondary"] = secondaryColor;
			vars["--ld-accent"] = accentColor;
			vars["--ld-background"] = bgColor;
		}
		return vars;
	}, [selectedTheme, previewDark, primaryColor, secondaryColor, accentColor, bgColor]);

	const themedBannerPresets = useMemo(() => {
		return getBannerPresetsForTheme(
			resolvedThemeVars["--ld-primary"],
			resolvedThemeVars["--ld-accent"],
			resolvedThemeVars["--ld-background"],
		);
	}, [resolvedThemeVars]);

	if (settingsQuery.isLoading) {
		return (
			<div className="space-y-6" aria-busy="true" role="status" aria-label="Loading appearance settings">
				<Skeleton className="h-8 w-48" />
				<div className="grid gap-3 sm:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={`sk-${i}`} className="h-24" />
					))}
				</div>
			</div>
		);
	}

	const previewOverrides = {
		profile: {
			name: profileName || "Your Name",
			bio: profileBio || null,
			image: profileAvatar || null,
			isVerified: verifiedBadge,
		},
		themeColors: {
			primary: resolvedThemeVars["--ld-primary"],
			accent: resolvedThemeVars["--ld-accent"],
			bg: resolvedThemeVars["--ld-background"],
			fg: resolvedThemeVars["--ld-foreground"],
			card: resolvedThemeVars["--ld-card"],
			cardFg: resolvedThemeVars["--ld-card-foreground"],
			border: resolvedThemeVars["--ld-border"],
			muted: resolvedThemeVars["--ld-muted"],
			mutedFg: resolvedThemeVars["--ld-muted-foreground"],
		},
		settings: {
			brandingEnabled,
			brandingText: brandingText || "Powered by LinkDen",
			bannerEnabled,
			bannerPreset: bannerEnabled && bannerMode === "preset" ? bannerPreset : null,
			bannerMode,
			bannerCustomUrl: bannerEnabled && bannerMode === "custom" ? bannerCustomUrl : undefined,
		},
	};

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-4">
			{/* Inline header */}
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-base font-semibold tracking-tight">Appearance</h1>
					<p className={cn("text-xs", isDirty ? "text-amber-500" : "text-muted-foreground")}>
						{isDirty ? "Unpublished changes" : "All changes are live"}
					</p>
				</div>
			</div>

			{/* Two-column layout */}
			<div className="flex gap-6">
				{/* Settings column */}
				<div className="flex-1 min-w-0 space-y-6">
					<ProfileSection
						profileName={profileName}
						profileBio={profileBio}
						profileAvatar={profileAvatar}
						onNameChange={setProfileName}
						onBioChange={setProfileBio}
						onAvatarChange={setProfileAvatar}
					/>
					<ThemePresetsSection
						selectedTheme={selectedTheme}
						onThemeSelect={handleThemeSelect}
					/>
					<ColorsSection
						colorMode={colorMode}
						primaryColor={primaryColor}
						secondaryColor={secondaryColor}
						accentColor={accentColor}
						bgColor={bgColor}
						onColorModeChange={setColorMode}
						onPrimaryChange={setPrimaryColor}
						onSecondaryChange={setSecondaryColor}
						onAccentChange={setAccentColor}
						onBgChange={setBgColor}
					/>
					<BannerSection
						bannerEnabled={bannerEnabled}
						bannerMode={bannerMode}
						bannerPreset={bannerPreset}
						bannerCustomUrl={bannerCustomUrl}
						themedBannerPresets={themedBannerPresets}
						onBannerEnabledChange={setBannerEnabled}
						onBannerModeChange={setBannerMode}
						onBannerPresetChange={setBannerPreset}
						onBannerCustomUrlChange={setBannerCustomUrl}
					/>
					<VerifiedBadgeSection
						verifiedBadge={verifiedBadge}
						onVerifiedBadgeChange={setVerifiedBadge}
					/>
					<BrandingSection
						brandingEnabled={brandingEnabled}
						brandingText={brandingText}
						brandingLink={brandingLink}
						profileName={profileName}
						onBrandingEnabledChange={setBrandingEnabled}
						onBrandingTextChange={setBrandingText}
						onBrandingLinkChange={setBrandingLink}
					/>
					<CustomCssSection
						customCss={customCss}
						onCustomCssChange={setCustomCss}
					/>
				</div>

				{/* Preview column (desktop) */}
				<div className="hidden w-[320px] shrink-0 lg:block">
					<div className="sticky top-6">
						<SharedPreview
							overrides={previewOverrides}
							mode={previewDark ? "dark" : "light"}
							onModeChange={(m) => setPreviewDark(m === "dark")}
						/>
					</div>
				</div>
			</div>

			{/* Mobile preview sheet */}
			<MobilePreviewSheet
				open={showMobilePreview}
				onOpenChange={setShowMobilePreview}
			>
				<SharedPreview
					overrides={previewOverrides}
					mode={previewDark ? "dark" : "light"}
					onModeChange={(m) => setPreviewDark(m === "dark")}
					showHeader={false}
				/>
			</MobilePreviewSheet>

			{/* Sticky bottom publish bar */}
			{isDirty && (
				<div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-56 z-30 border-t border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between shadow-lg">
					<span className="text-sm text-muted-foreground">Unpublished changes</span>
					<div className="flex gap-2">
						<Button variant="ghost" size="sm" onClick={handleDiscard}>
							<Undo2 className="mr-1.5 h-3.5 w-3.5" />
							Discard
						</Button>
						<Button
							size="sm"
							disabled={updateSettings.isPending}
							onClick={handlePublish}
						>
							<Upload className="mr-1.5 h-3.5 w-3.5" />
							{updateSettings.isPending ? "Publishing…" : "Publish"}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
