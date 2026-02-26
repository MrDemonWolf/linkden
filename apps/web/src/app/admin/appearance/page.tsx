"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palette, Sun, Moon, Monitor, Check, Upload, Undo2, Info, Tag, BadgeCheck, User, Image as ImageIcon, Share2 } from "lucide-react";
import { themePresets } from "@linkden/ui/themes";
import { getBannerPresetsForTheme, type BannerPreset } from "@linkden/ui/banner-presets";
import { socialBrandMap } from "@linkden/ui/social-brands";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { PhoneFrame } from "@/components/admin/phone-frame";
import { PreviewContent } from "@/components/admin/preview-content";
import { ShaderBanner } from "@/components/public/shader-banner";

const COLOR_MODE_OPTIONS = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

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
	socialIconShape: "circle" | "rounded-square";
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
		socialIconShape: (settings.social_icon_shape as "circle" | "rounded-square") || "circle",
	};
}

export default function AppearancePage() {
	const qc = useQueryClient();
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const blocks = (blocksQuery.data ?? []).filter((b: { isEnabled: boolean }) => b.isEnabled);
	const socialsQuery = useQuery(trpc.social.list.queryOptions({ activeOnly: true }));
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());

	const previewSocialNetworks = useMemo(() => {
		return (socialsQuery.data ?? [])
			.filter((s: { isActive: boolean; url: string }) => s.isActive && s.url)
			.map((s: { slug: string; url: string }) => {
				const brand = socialBrandMap.get(s.slug);
				if (!brand) return null;
				return { slug: s.slug, name: brand.name, url: s.url, hex: brand.hex, svgPath: brand.svgPath };
			})
			.filter(Boolean) as Array<{ slug: string; name: string; url: string; hex: string; svgPath: string }>;
	}, [socialsQuery.data]);

	const settings = settingsQuery.data ?? {};

	const [savedState, setSavedState] = useState<SavedState>({
		profileName: "",
		profileBio: "",
		profileAvatar: "",
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
		brandingEnabled: true,
		brandingText: "",
		brandingLink: "",
		socialIconShape: "circle",
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
	const [socialIconShape, setSocialIconShape] = useState<"circle" | "rounded-square">("circle");

	// Detect system color preference for preview when "system" is selected
	const [systemPrefersDark, setSystemPrefersDark] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		setSystemPrefersDark(mq.matches);
		const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	// Sync preview dark mode when color mode setting changes
	useEffect(() => {
		if (colorMode === "dark") setPreviewDark(true);
		else if (colorMode === "light") setPreviewDark(false);
		else if (colorMode === "system") setPreviewDark(systemPrefersDark);
	}, [colorMode, systemPrefersDark]);

	// Load settings into state
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
			setSocialIconShape(s.socialIconShape);
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
		brandingLink !== savedState.brandingLink ||
		socialIconShape !== savedState.socialIconShape;

	// Warn on navigation with unsaved changes
	useEffect(() => {
		const handler = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault();
			}
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [isDirty]);

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
				{ key: "social_icon_shape", value: socialIconShape },
			]);
			setSavedState({
				profileName,
				profileBio,
				profileAvatar,
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
				brandingEnabled,
				brandingText,
				brandingLink,
				socialIconShape,
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
		setSocialIconShape(savedState.socialIconShape);
	};

	// Resolve full theme CSS vars for preview
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

	// Compute themed banner presets for the picker
	const themedBannerPresets = useMemo(() => {
		return getBannerPresetsForTheme(
			resolvedThemeVars["--ld-primary"],
			resolvedThemeVars["--ld-accent"],
			resolvedThemeVars["--ld-background"],
		);
	}, [resolvedThemeVars]);

	if (settingsQuery.isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				<div className="grid gap-3 sm:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={`sk-${i}`} className="h-24" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Sticky header */}
			<div className="sticky top-0 z-20 mt-1 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 px-4 py-3">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-lg font-semibold">Appearance</h1>
						<p className="text-xs text-muted-foreground">
							{isDirty
								? "You have unpublished changes"
								: "All changes are live"}
						</p>
					</div>
					<div className="flex gap-2">
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
							onClick={handlePublish}
						>
							<Upload className="mr-1.5 h-3.5 w-3.5" />
							{updateSettings.isPending ? "Publishing..." : "Publish"}
						</Button>
					</div>
				</div>
			</div>

			{/* Two-column layout */}
			<div className="flex gap-6">
				{/* Settings column */}
				<div className="flex-1 min-w-0 space-y-6">
					{/* Profile — Centered avatar above fields */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<User className="h-4 w-4 text-muted-foreground" />
								Profile
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex flex-col items-center gap-2">
								<ImageUploadField
									value={profileAvatar}
									purpose="avatar"
									aspectRatio="square"
									onUploadComplete={(url) => setProfileAvatar(url)}
								/>
							</div>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="a-name">Display Name</Label>
									<span className="text-[10px] text-muted-foreground">{profileName.length}/50</span>
								</div>
								<Input
									id="a-name"
									value={profileName}
									onChange={(e) => setProfileName(e.target.value.slice(0, 50))}
									maxLength={50}
									placeholder="Your display name"
								/>
							</div>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="a-bio">Bio</Label>
									<span className="text-[10px] text-muted-foreground">{profileBio.length}/300</span>
								</div>
								<textarea
									id="a-bio"
									value={profileBio}
									onChange={(e) => setProfileBio(e.target.value.slice(0, 300))}
									rows={4}
									maxLength={300}
									placeholder="A short bio about you"
									className="dark:bg-input/30 border-input w-full rounded-md border bg-transparent backdrop-blur-sm px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Theme presets */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<Palette className="h-4 w-4 text-muted-foreground" />
								Theme Presets
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
								{themePresets.map((theme) => (
									<button
										key={theme.name}
										type="button"
										onClick={() => handleThemeSelect(theme.name)}
										className={cn(
											"relative flex flex-col items-center gap-2 rounded-lg border p-3 text-xs transition-colors",
											selectedTheme === theme.name
												? "border-primary bg-primary/5"
												: "border-border hover:border-muted-foreground/30",
										)}
									>
										{selectedTheme === theme.name && (
											<div className="absolute right-1 top-1">
												<Check className="h-3 w-3 text-primary" />
											</div>
										)}
										<div className="flex gap-1">
											<div
												className="h-5 w-5 rounded-full border"
												style={{ backgroundColor: theme.cssVars.light["--ld-primary"] }}
											/>
											<div
												className="h-5 w-5 rounded-full border"
												style={{ backgroundColor: theme.cssVars.light["--ld-accent"] }}
											/>
											<div
												className="h-5 w-5 rounded-full border"
												style={{ backgroundColor: theme.cssVars.light["--ld-background"] }}
											/>
										</div>
										<span className="font-medium text-center leading-tight">
											{theme.label}
										</span>
									</button>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Colors */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<Palette className="h-4 w-4 text-muted-foreground" />
								Colors
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label className="mb-2 block">Default Color Mode</Label>
								<div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
									{COLOR_MODE_OPTIONS.map((opt) => {
										const Icon = opt.icon;
										return (
											<button
												key={opt.value}
												type="button"
												onClick={() => setColorMode(opt.value)}
												className={cn(
													"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
													colorMode === opt.value
														? "bg-background text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground",
												)}
											>
												<Icon className="h-3.5 w-3.5" />
												{opt.label}
											</button>
										);
									})}
								</div>
							</div>
							<div className="border-t border-border" />
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="color-primary">Primary</Label>
									<div className="flex gap-2">
										<input
											type="color"
											id="color-primary"
											value={primaryColor}
											onChange={(e) => setPrimaryColor(e.target.value)}
											className="h-8 w-10 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
										/>
										<Input
											value={primaryColor}
											onChange={(e) => setPrimaryColor(e.target.value)}
											className="flex-1"
										/>
									</div>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="color-secondary">Secondary</Label>
									<div className="flex gap-2">
										<input
											type="color"
											id="color-secondary"
											value={secondaryColor}
											onChange={(e) => setSecondaryColor(e.target.value)}
											className="h-8 w-10 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
										/>
										<Input
											value={secondaryColor}
											onChange={(e) => setSecondaryColor(e.target.value)}
											className="flex-1"
										/>
									</div>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="color-accent">Accent</Label>
									<div className="flex gap-2">
										<input
											type="color"
											id="color-accent"
											value={accentColor}
											onChange={(e) => setAccentColor(e.target.value)}
											className="h-8 w-10 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
										/>
										<Input
											value={accentColor}
											onChange={(e) => setAccentColor(e.target.value)}
											className="flex-1"
										/>
									</div>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="color-bg">Background</Label>
									<div className="flex gap-2">
										<input
											type="color"
											id="color-bg"
											value={bgColor}
											onChange={(e) => setBgColor(e.target.value)}
											className="h-8 w-10 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
										/>
										<Input
											value={bgColor}
											onChange={(e) => setBgColor(e.target.value)}
											className="flex-1"
										/>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>


					{/* Banner */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<ImageIcon className="h-4 w-4 text-muted-foreground" />
								Banner
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<label
								htmlFor="a-banner-enabled"
								className="flex items-start gap-3 cursor-pointer group"
							>
								<button
									id="a-banner-enabled"
									type="button"
									role="switch"
									aria-checked={bannerEnabled}
									aria-label="Show banner on public page"
									onClick={() => setBannerEnabled(!bannerEnabled)}
									className={cn(
										"relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
										bannerEnabled ? "bg-primary" : "bg-muted",
									)}
								>
									<span
										className={cn(
											"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
											bannerEnabled ? "translate-x-[18px]" : "translate-x-[3px]",
										)}
									/>
								</button>
								<div className="min-w-0 flex-1">
									<span className="text-xs font-medium group-hover:text-foreground transition-colors">
										Show banner on public page
									</span>
									<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
										Displays a banner behind your avatar
									</p>
								</div>
							</label>
							{bannerEnabled && (
								<>
									{/* Banner mode tabs */}
									<div className="flex gap-2" role="tablist">
										<button
											type="button"
											role="tab"
											id="tab-banner-preset"
											aria-selected={bannerMode === "preset"}
											onClick={() => setBannerMode("preset")}
											className={cn(
												"flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
												bannerMode === "preset"
													? "border-primary bg-primary/5 text-primary"
													: "border-border text-muted-foreground hover:text-foreground",
											)}
										>
											<Palette className="h-3 w-3" />
											Presets
										</button>
										<button
											type="button"
											role="tab"
											id="tab-banner-custom"
											aria-selected={bannerMode === "custom"}
											onClick={() => setBannerMode("custom")}
											className={cn(
												"flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
												bannerMode === "custom"
													? "border-primary bg-primary/5 text-primary"
													: "border-border text-muted-foreground hover:text-foreground",
											)}
										>
											<Upload className="h-3 w-3" />
											Custom Image
										</button>
									</div>

									{bannerMode === "preset" ? (
										<div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="tabpanel" aria-labelledby="tab-banner-preset">
											{themedBannerPresets.map((preset: BannerPreset) => (
												<button
													key={preset.id}
													type="button"
													onClick={() => setBannerPreset(preset.id)}
													className={cn(
														"group relative h-12 overflow-hidden rounded-md border-2 transition-all",
														bannerPreset === preset.id
															? "border-primary ring-2 ring-primary/30"
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
												{bannerPreset === preset.id && (
														<div className="absolute inset-0 flex items-center justify-center bg-black/20">
															<Check className="h-4 w-4 text-white drop-shadow" />
														</div>
													)}
													<span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate">
														{preset.name}
													</span>
												</button>
											))}
										</div>
									) : (
										<ImageUploadField
											label="Banner Image"
											value={bannerCustomUrl}
											purpose="banner"
											aspectRatio="banner"
											onUploadComplete={(url) => setBannerCustomUrl(url)}
										/>
									)}
								</>
							)}
						</CardContent>
					</Card>

					{/* Verified Badge */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<BadgeCheck className="h-4 w-4 text-muted-foreground" />
								Verified Badge
							</CardTitle>
						</CardHeader>
						<CardContent>
							<label
								htmlFor="a-verified"
								className="flex items-start gap-3 cursor-pointer group"
							>
								<button
									id="a-verified"
									type="button"
									role="switch"
									aria-checked={verifiedBadge}
									aria-label="Show verified badge"
									onClick={() => setVerifiedBadge(!verifiedBadge)}
									className={cn(
										"relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
										verifiedBadge ? "bg-primary" : "bg-muted",
									)}
								>
									<span
										className={cn(
											"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
											verifiedBadge ? "translate-x-[18px]" : "translate-x-[3px]",
										)}
									/>
								</button>
								<div className="min-w-0 flex-1">
									<span className="text-xs font-medium group-hover:text-foreground transition-colors">
										Show verified badge
									</span>
									<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
										Displays a blue checkmark next to your name
									</p>
								</div>
							</label>
						</CardContent>
					</Card>

					{/* Social Icon Shape */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<Share2 className="h-4 w-4 text-muted-foreground" />
								Social Icon Shape
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
								<button
									type="button"
									onClick={() => setSocialIconShape("circle")}
									className={cn(
										"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
										socialIconShape === "circle"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
									Circle
								</button>
								<button
									type="button"
									onClick={() => setSocialIconShape("rounded-square")}
									className={cn(
										"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
										socialIconShape === "rounded-square"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="6" /></svg>
									Rounded
								</button>
							</div>
							<p className="mt-2 text-[11px] text-muted-foreground">
								Sets the shape of social network icons on your public page
							</p>
						</CardContent>
					</Card>

					{/* Branding */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<Tag className="h-4 w-4 text-muted-foreground" />
								Branding
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<label
								htmlFor="a-branding-enabled"
								className="flex items-start gap-3 cursor-pointer group"
							>
								<button
									id="a-branding-enabled"
									type="button"
									role="switch"
									aria-checked={brandingEnabled}
									aria-label="Show whitelabel footer"
									onClick={() => setBrandingEnabled(!brandingEnabled)}
									className={cn(
										"relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
										brandingEnabled ? "bg-primary" : "bg-muted",
									)}
								>
									<span
										className={cn(
											"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
											brandingEnabled ? "translate-x-[18px]" : "translate-x-[3px]",
										)}
									/>
								</button>
								<div className="min-w-0 flex-1">
									<span className="text-xs font-medium group-hover:text-foreground transition-colors">
										Show whitelabel footer
									</span>
									<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
										Display a footer with custom text and link
									</p>
								</div>
							</label>
							{brandingEnabled && (
								<div className="space-y-3">
									<div className="grid gap-3 sm:grid-cols-2">
										<div className="space-y-1.5">
											<Label htmlFor="a-branding-text">Custom Text</Label>
											<Input
												id="a-branding-text"
												value={brandingText}
												onChange={(e) => setBrandingText(e.target.value)}
												placeholder="Powered by LinkDen"
											/>
											<p className="text-[10px] text-muted-foreground leading-tight">
												Variables: <code className="rounded bg-muted px-1">{"{{year}}"}</code>{" "}
												<code className="rounded bg-muted px-1">{"{{copyright}}"}</code>{" "}
												<code className="rounded bg-muted px-1">{"{{name}}"}</code>
											</p>
											{brandingText && /\{\{(year|copyright|name)\}\}/.test(brandingText) && (
												<p className="text-[10px] text-muted-foreground">
													Preview:{" "}
													<span className="font-medium text-foreground">
														{brandingText
															.replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
															.replace(/\{\{copyright\}\}/g, "\u00A9")
															.replace(/\{\{name\}\}/g, profileName || "Your Name")}
													</span>
												</p>
											)}
										</div>
										<div className="space-y-1.5">
											<Label htmlFor="a-branding-link">Custom Link</Label>
											<Input
												id="a-branding-link"
												value={brandingLink}
												onChange={(e) => setBrandingLink(e.target.value)}
												placeholder="https://linkden.io"
											/>
										</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Custom CSS */}
					<Card>
						<CardHeader>
							<CardTitle>Custom CSS</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<textarea
								value={customCss}
								onChange={(e) => setCustomCss(e.target.value)}
								rows={8}
								placeholder={"/* Add custom CSS for your public page */\n.ld-link-block {\n  border-radius: 20px;\n}"}
								className="dark:bg-input/30 border-input w-full rounded-lg border bg-transparent backdrop-blur-sm px-3 py-2 font-mono text-xs outline-none"
							/>
							<details className="text-xs text-muted-foreground">
								<summary className="flex cursor-pointer items-center gap-1.5 font-medium hover:text-foreground">
									<Info className="h-3.5 w-3.5" />
									Available CSS classes & variables
								</summary>
								<div className="mt-2 space-y-3 rounded-lg border p-3">
									<div>
										<p className="mb-1 font-medium text-foreground">CSS Classes</p>
										<div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
											<span>.ld-page</span><span className="text-muted-foreground">Page container</span>
											<span>.ld-profile</span><span className="text-muted-foreground">Profile/header section</span>
											<span>.ld-avatar</span><span className="text-muted-foreground">Profile avatar</span>
											<span>.ld-bio</span><span className="text-muted-foreground">Bio text</span>
											<span>.ld-blocks</span><span className="text-muted-foreground">Blocks container</span>
											<span>.ld-link-block</span><span className="text-muted-foreground">Link buttons</span>
											<span>.ld-header-block</span><span className="text-muted-foreground">Header/divider blocks</span>
											<span>.ld-social-block</span><span className="text-muted-foreground">Social icons row</span>
											<span>.ld-embed-block</span><span className="text-muted-foreground">Embed blocks</span>
											<span>.ld-contact-block</span><span className="text-muted-foreground">Contact form</span>
											<span>.ld-footer</span><span className="text-muted-foreground">Branding footer</span>
										</div>
									</div>
									<div>
										<p className="mb-1 font-medium text-foreground">CSS Variables</p>
										<div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
											<span>--ld-primary</span><span className="text-muted-foreground">Primary color</span>
											<span>--ld-accent</span><span className="text-muted-foreground">Accent color</span>
											<span>--ld-background</span><span className="text-muted-foreground">Page background</span>
											<span>--ld-foreground</span><span className="text-muted-foreground">Text color</span>
											<span>--ld-card</span><span className="text-muted-foreground">Card background</span>
											<span>--ld-border</span><span className="text-muted-foreground">Border color</span>
											<span>--ld-muted</span><span className="text-muted-foreground">Muted background</span>
											<span>--ld-radius</span><span className="text-muted-foreground">Border radius</span>
										</div>
									</div>
								</div>
							</details>
						</CardContent>
					</Card>
				</div>

				{/* Preview column (desktop) */}
				<div className="hidden w-[320px] shrink-0 lg:block">
					<div className="sticky top-16">
						<div className="mb-3 flex items-center justify-between">
							<span className="text-xs font-medium text-muted-foreground">Live Preview</span>
							<div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
								<button
									type="button"
									onClick={() => setPreviewDark(false)}
									className={cn(
										"flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
										!previewDark
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<Sun className="h-3 w-3" />
									Light
								</button>
								<button
									type="button"
									onClick={() => setPreviewDark(true)}
									className={cn(
										"flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
										previewDark
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<Moon className="h-3 w-3" />
									Dark
								</button>
							</div>
						</div>
						<PhoneFrame previewDark={previewDark}>
							<PreviewContent
								profile={{
									name: profileName || "Your Name",
									email: "",
									image: profileAvatar || null,
									bio: profileBio || null,
									isVerified: verifiedBadge,
								}}
								blocks={blocks.map((b: { id: string; type: string; title: string | null; url: string | null; icon: string | null; embedType: string | null; embedUrl: string | null; socialIcons: string | null; config: string | null; position: number }) => ({
									id: b.id,
									type: b.type,
									title: b.title,
									url: b.url,
									icon: b.icon,
									embedType: b.embedType,
									embedUrl: b.embedUrl,
									socialIcons: b.socialIcons,
									config: b.config,
									position: b.position,
								}))}
								socialNetworks={previewSocialNetworks}
								settings={{
									brandingEnabled,
									brandingText: brandingText || "Powered by LinkDen",
									bannerPreset: bannerEnabled && bannerMode === "preset" ? bannerPreset : null,
									bannerEnabled,
									bannerMode,
									bannerCustomUrl: bannerEnabled && bannerMode === "custom" ? bannerCustomUrl : undefined,
									socialIconShape,
								}}
								themeColors={{
									primary: resolvedThemeVars["--ld-primary"],
									accent: resolvedThemeVars["--ld-accent"],
									bg: resolvedThemeVars["--ld-background"],
									fg: resolvedThemeVars["--ld-foreground"],
									card: resolvedThemeVars["--ld-card"],
									cardFg: resolvedThemeVars["--ld-card-foreground"],
									border: resolvedThemeVars["--ld-border"],
									muted: resolvedThemeVars["--ld-muted"],
									mutedFg: resolvedThemeVars["--ld-muted-foreground"],
								}}
								colorMode={previewDark ? "dark" : "light"}
							/>
						</PhoneFrame>
					</div>
				</div>
			</div>
		</div>
	);
}
