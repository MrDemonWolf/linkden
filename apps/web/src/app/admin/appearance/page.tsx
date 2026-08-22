"use client";

import { getBannerPresetsForTheme } from "@linkden/ui/banner-presets";
import { themePresets } from "@linkden/ui/themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BannerSection } from "@/components/admin/appearance/banner-section";
import { VerifiedBadgeSection } from "@/components/admin/appearance/branding-section";
import { ColorsSection } from "@/components/admin/appearance/colors-section";
import { CustomCssSection } from "@/components/admin/appearance/custom-css-section";
import {
	type SocialIconShape,
	SocialIconShapeSection,
} from "@/components/admin/appearance/social-icon-shape-section";
import { ThemePresetsSection } from "@/components/admin/appearance/theme-presets-section";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { MobilePreviewSheet } from "@/components/admin/mobile-preview-sheet";
import { PageHeader } from "@/components/admin/page-header";
import { PagePreview, type PreviewOverrides } from "@/components/admin/page-preview";
import { PageShell } from "@/components/admin/page-shell";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

interface SavedState {
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
	socialIconShape: SocialIconShape;
}

function buildSavedState(settings: Record<string, string>): SavedState {
	return {
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
		socialIconShape: (settings.social_icon_shape as SocialIconShape) || "circle",
	};
}

export default function AppearancePage() {
	const qc = useQueryClient();
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());

	const settings = settingsQuery.data ?? {};

	const [savedState, setSavedState] = useState<SavedState>({
		theme: "default",
		colorMode: "light",
		primaryColor: "#0FACED",
		secondaryColor: "#E2E8F0",
		accentColor: "#38BDF8",
		bgColor: "#FFFFFF",
		customCss: "",
		bannerEnabled: false,
		bannerPreset: "",
		bannerMode: "preset",
		bannerCustomUrl: "",
		verifiedBadge: false,
		socialIconShape: "circle",
	});

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
	const [socialIconShape, setSocialIconShape] = useState<SocialIconShape>("circle");
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
			setSocialIconShape(s.socialIconShape);
		}
	}, [settingsQuery.data, settings]);

	const isDirty =
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
		socialIconShape !== savedState.socialIconShape;

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

	const handleSave = async () => {
		try {
			await updateSettings.mutateAsync([
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
				{ key: "social_icon_shape", value: socialIconShape },
			]);
			setSavedState({
				theme: selectedTheme,
				colorMode,
				primaryColor,
				secondaryColor,
				accentColor,
				bgColor,
				customCss,
				bannerEnabled,
				bannerPreset,
				bannerMode,
				bannerCustomUrl,
				verifiedBadge,
				socialIconShape,
			});
			invalidate();
			toast.success("Appearance saved");
		} catch {
			toast.error("Failed to save appearance");
		}
	};

	const handleDiscard = () => {
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
		setSocialIconShape(savedState.socialIconShape);
	};

	const resolvedThemeVars = useMemo(() => {
		const preset = themePresets.find((t) => t.name === selectedTheme) ?? themePresets[0];
		const mode = previewDark ? "dark" : "light";
		// Custom colors apply in both modes, same as getThemeColors on the live page.
		const vars = { ...preset.cssVars[mode] };
		if (primaryColor) vars["--ld-primary"] = primaryColor;
		if (secondaryColor) vars["--ld-secondary"] = secondaryColor;
		if (accentColor) vars["--ld-accent"] = accentColor;
		if (bgColor) vars["--ld-background"] = bgColor;
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
			<PageShell aria-busy="true" role="status" aria-label="Loading appearance settings">
				<Skeleton className="h-8 w-48" />
				<div className="flex gap-6">
					<div className="flex-1 space-y-4">
						<Skeleton className="h-64" />
						<Skeleton className="h-48" />
						<Skeleton className="h-32" />
					</div>
					<div className="hidden lg:block w-[360px]">
						<Skeleton className="h-[640px] rounded-[2rem]" />
					</div>
				</div>
			</PageShell>
		);
	}

	if (settingsQuery.isError) {
		return (
			<PageShell>
				<QueryError message="Couldn't load settings" onRetry={() => settingsQuery.refetch()} />
			</PageShell>
		);
	}

	// Unsaved edits in `public.getPage` shape — PublicPage resolves the theme
	// from these exactly as the live page does.
	const previewOverrides: PreviewOverrides = {
		profile: { isVerified: verifiedBadge },
		settings: {
			themePreset: selectedTheme,
			customPrimary: primaryColor,
			customSecondary: secondaryColor,
			customAccent: accentColor,
			customBackground: bgColor,
			customCss,
			bannerEnabled,
			bannerPreset,
			bannerMode,
			bannerCustomUrl,
			socialIconShape,
		},
	};

	return (
		<PageShell>
			{/* Page header */}
			<PageHeader
				title="Appearance"
				badge={
					<span
						className={cn(
							"text-xs transition-colors",
							isDirty ? "text-warning" : "text-muted-foreground",
						)}
					>
						{isDirty ? "Unsaved changes" : "All changes saved"}
					</span>
				}
				actions={
					<Button
						variant="outline"
						size="sm"
						className="lg:hidden"
						onClick={() => setShowMobilePreview(true)}
					>
						<Eye className="mr-1.5 h-3.5 w-3.5" />
						Preview
					</Button>
				}
			/>

			{/* Two-column layout: settings left, preview right */}
			<div className="flex gap-6">
				{/* Settings column */}
				<div className="flex-1 min-w-0 space-y-5">
					<ThemePresetsSection selectedTheme={selectedTheme} onThemeSelect={handleThemeSelect} />

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

					<SocialIconShapeSection shape={socialIconShape} onShapeChange={setSocialIconShape} />

					<VerifiedBadgeSection
						verifiedBadge={verifiedBadge}
						onVerifiedBadgeChange={setVerifiedBadge}
					/>

					<CustomCssSection customCss={customCss} onCustomCssChange={setCustomCss} />

					<StickySaveBar
						isDirty={isDirty}
						isSaving={updateSettings.isPending}
						onSave={handleSave}
						onDiscard={handleDiscard}
					/>
				</div>

				{/* Preview column (desktop) */}
				<div className="hidden w-[360px] shrink-0 lg:block">
					<div className="sticky top-6">
						<PagePreview
							overrides={previewOverrides}
							mode={previewDark ? "dark" : "light"}
							onModeChange={(m) => setPreviewDark(m === "dark")}
						/>
					</div>
				</div>
			</div>

			{/* Mobile preview sheet */}
			<MobilePreviewSheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
				<PagePreview
					overrides={previewOverrides}
					mode={previewDark ? "dark" : "light"}
					onModeChange={(m) => setPreviewDark(m === "dark")}
					showHeader={false}
				/>
			</MobilePreviewSheet>
		</PageShell>
	);
}
