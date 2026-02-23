"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palette, Sun, Moon, Monitor, Check, Upload, Undo2, Info, Tag, BadgeCheck } from "lucide-react";
import { themePresets } from "@linkden/ui/themes";
import { getBannerPresetsForTheme } from "@linkden/ui/banner-presets";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COLOR_MODE_OPTIONS = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

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
	verifiedBadge: boolean;
	brandingEnabled: boolean;
	brandingText: string;
	brandingLink: string;
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
		theme: "default",
		colorMode: "light",
		primaryColor: "#0FACED",
		secondaryColor: "#E2E8F0",
		accentColor: "#38BDF8",
		bgColor: "#FFFFFF",
		customCss: "",
		bannerEnabled: false,
		bannerPreset: "",
		verifiedBadge: false,
		brandingEnabled: true,
		brandingText: "",
		brandingLink: "",
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
	const [verifiedBadge, setVerifiedBadge] = useState(false);
	const [brandingEnabled, setBrandingEnabled] = useState(true);
	const [brandingText, setBrandingText] = useState("");
	const [brandingLink, setBrandingLink] = useState("");

	// Load settings into state
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
			setVerifiedBadge(s.verifiedBadge);
			setBrandingEnabled(s.brandingEnabled);
			setBrandingText(s.brandingText);
			setBrandingLink(s.brandingLink);
		}
	}, [settingsQuery.data]);

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
		verifiedBadge !== savedState.verifiedBadge ||
		brandingEnabled !== savedState.brandingEnabled ||
		brandingText !== savedState.brandingText ||
		brandingLink !== savedState.brandingLink;

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
			const mode = previewDark ? "dark" : "light";
			const vars = preset.cssVars[mode];
			setPrimaryColor(vars["--ld-primary"]);
			setSecondaryColor(vars["--ld-secondary"]);
			setAccentColor(vars["--ld-accent"]);
			setBgColor(vars["--ld-background"]);
		}
	};

	const handlePublish = async () => {
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
				{ key: "verified_badge", value: String(verifiedBadge) },
				{ key: "branding_enabled", value: String(brandingEnabled) },
				{ key: "branding_text", value: brandingText },
				{ key: "branding_link", value: brandingLink },
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
				verifiedBadge,
				brandingEnabled,
				brandingText,
				brandingLink,
			});
			invalidate();
			toast.success("Appearance published");
		} catch {
			toast.error("Failed to publish appearance");
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
		setVerifiedBadge(savedState.verifiedBadge);
		setBrandingEnabled(savedState.brandingEnabled);
		setBrandingText(savedState.brandingText);
		setBrandingLink(savedState.brandingLink);
	};

	// Resolve full theme CSS vars for preview
	const resolvedThemeVars = useMemo(() => {
		const preset = themePresets.find((t) => t.name === selectedTheme) ?? themePresets[0];
		const mode = previewDark ? "dark" : "light";
		const vars = { ...preset.cssVars[mode] };
		vars["--ld-primary"] = primaryColor;
		vars["--ld-secondary"] = secondaryColor;
		vars["--ld-accent"] = accentColor;
		vars["--ld-background"] = bgColor;
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

	// Resolve the active banner style for preview
	const activeBannerStyle = useMemo(() => {
		if (!bannerEnabled || !bannerPreset) return null;
		const preset = themedBannerPresets.find((p: { id: string }) => p.id === bannerPreset);
		return preset ?? null;
	}, [bannerEnabled, bannerPreset, themedBannerPresets]);

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
			{/* Header row */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Appearance</h1>
					<p className="text-xs text-muted-foreground">
						{isDirty
							? "Unsaved changes \u2014 publish to go live"
							: "Your page is up to date"}
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
						variant={isDirty ? "default" : "outline"}
						size="sm"
						disabled={!isDirty || updateSettings.isPending}
						onClick={handlePublish}
					>
						<Upload className="mr-1.5 h-3.5 w-3.5" />
						{updateSettings.isPending ? "Publishing..." : "Publish"}
					</Button>
				</div>
			</div>

			{/* Two-column layout */}
			<div className="flex gap-6">
				{/* Settings column */}
				<div className="flex-1 min-w-0 space-y-6">
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
											"relative flex flex-col items-center gap-2 border p-3 text-xs transition-colors",
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

					{/* Color mode */}
					<Card>
						<CardHeader>
							<CardTitle>Default Color Mode</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex gap-2">
								{COLOR_MODE_OPTIONS.map((opt) => {
									const Icon = opt.icon;
									return (
										<button
											key={opt.value}
											type="button"
											onClick={() => setColorMode(opt.value)}
											className={cn(
												"flex items-center gap-1.5 border px-3 py-2 text-xs font-medium transition-colors",
												colorMode === opt.value
													? "border-primary bg-primary/5 text-primary"
													: "border-border text-muted-foreground hover:text-foreground",
											)}
										>
											<Icon className="h-3.5 w-3.5" />
											{opt.label}
										</button>
									);
								})}
							</div>
						</CardContent>
					</Card>

					{/* Custom colors */}
					<Card>
						<CardHeader>
							<CardTitle>Custom Colors</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="color-primary">Primary</Label>
									<div className="flex gap-2">
										<input
											type="color"
											id="color-primary"
											value={primaryColor}
											onChange={(e) => setPrimaryColor(e.target.value)}
											className="h-8 w-10 cursor-pointer border bg-transparent p-0.5"
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
											className="h-8 w-10 cursor-pointer border bg-transparent p-0.5"
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
											className="h-8 w-10 cursor-pointer border bg-transparent p-0.5"
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
											className="h-8 w-10 cursor-pointer border bg-transparent p-0.5"
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
							<CardTitle>Banner</CardTitle>
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
										Displays a gradient banner behind your avatar
									</p>
								</div>
							</label>
							{bannerEnabled && (
								<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
									{themedBannerPresets.map((preset: { id: string; name: string; style: React.CSSProperties; className?: string }) => (
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
											<div
												className={`absolute inset-0 ${preset.className ?? ""}`}
												style={preset.style}
											/>
											{bannerPreset === preset.id && (
												<div className="absolute inset-0 flex items-center justify-center bg-black/20">
													<Check className="h-4 w-4 text-white drop-shadow" />
												</div>
											)}
											<span className="absolute inset-x-0 bottom-0 bg-black/40 px-1 py-0.5 text-[8px] text-white truncate">
												{preset.name}
											</span>
										</button>
									))}
								</div>
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
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="space-y-1.5">
										<Label htmlFor="a-branding-text">Custom Text</Label>
										<Input
											id="a-branding-text"
											value={brandingText}
											onChange={(e) => setBrandingText(e.target.value)}
											placeholder="Powered by LinkDen"
										/>
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
								className="dark:bg-input/30 border-input w-full border bg-transparent px-3 py-2 font-mono text-xs outline-none"
							/>
							<details className="text-xs text-muted-foreground">
								<summary className="flex cursor-pointer items-center gap-1.5 font-medium hover:text-foreground">
									<Info className="h-3.5 w-3.5" />
									Available CSS classes & variables
								</summary>
								<div className="mt-2 space-y-3 rounded border p-3">
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
					<div className="sticky top-6">
						<div className="mb-3 flex items-center justify-between">
							<span className="text-xs font-medium">Preview</span>
							<button
								type="button"
								onClick={() => setPreviewDark(!previewDark)}
								className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
							>
								{previewDark ? (
									<Moon className="h-3 w-3" />
								) : (
									<Sun className="h-3 w-3" />
								)}
								{previewDark ? "Dark" : "Light"}
							</button>
						</div>
						{/* Phone frame */}
						<div className="relative w-[280px] mx-auto">
							<div
								className={cn(
									"overflow-hidden rounded-[2rem] border-[6px]",
									previewDark
										? "border-gray-700 bg-gray-950"
										: "border-gray-300 bg-white",
								)}
							>
								<div className="flex justify-center py-2">
									<div
										className={cn(
											"h-5 w-24 rounded-full",
											previewDark ? "bg-gray-800" : "bg-gray-200",
										)}
									/>
								</div>
								<div
									className="h-[480px] overflow-y-auto px-4 pb-6"
									style={{
										backgroundColor: resolvedThemeVars["--ld-background"],
										color: resolvedThemeVars["--ld-foreground"],
										transition: "background-color 0.3s ease, color 0.3s ease",
									}}
								>
									{customCss && <style>{customCss}</style>}
									{/* Banner */}
									{bannerEnabled && activeBannerStyle && (
										<div
											className={`h-20 -mx-4 mb-[-2rem] ${activeBannerStyle.className ?? ""}`}
											style={activeBannerStyle.style}
										/>
									)}
									{/* Avatar */}
									<div className="ld-profile mb-4 flex flex-col items-center">
										<div
											className="ld-avatar h-14 w-14 rounded-full"
											style={{
												background: `linear-gradient(135deg, ${resolvedThemeVars["--ld-primary"]}, ${resolvedThemeVars["--ld-accent"]})`,
												...(bannerEnabled && activeBannerStyle ? { position: "relative", zIndex: 1 } : {}),
											}}
										/>
										<div className="mt-2 flex items-center gap-1">
											<div
												className="h-3 w-20 rounded"
												style={{
													backgroundColor: resolvedThemeVars["--ld-muted"],
												}}
											/>
											{verifiedBadge && (
												<BadgeCheck
													className="h-3.5 w-3.5 shrink-0"
													style={{ color: resolvedThemeVars["--ld-primary"] }}
												/>
											)}
										</div>
										<div
											className="ld-bio mt-1.5 h-2 w-32 rounded"
											style={{
												backgroundColor: resolvedThemeVars["--ld-muted"],
											}}
										/>
									</div>
									{/* Sample blocks */}
									<div className="ld-blocks space-y-2">
										{[1, 2, 3].map((i) => (
											<div
												key={i}
												className="ld-link-block flex items-center justify-center py-2.5 text-[10px] font-medium"
												style={{
													backgroundColor: resolvedThemeVars["--ld-card"],
													color: resolvedThemeVars["--ld-card-foreground"],
													borderRadius: resolvedThemeVars["--ld-radius"],
													border: `1px solid ${resolvedThemeVars["--ld-border"]}`,
												}}
											>
												Sample Link {i}
											</div>
										))}
										<div
											className="ld-header-block py-2 text-center text-[10px] font-bold"
											style={{ color: resolvedThemeVars["--ld-foreground"] }}
										>
											Section Header
										</div>
										<div
											className="ld-social-block flex justify-center gap-2 py-2"
										>
											{[1, 2, 3].map((i) => (
												<div
													key={i}
													className="h-6 w-6 rounded-full"
													style={{
														backgroundColor: resolvedThemeVars["--ld-muted"],
													}}
												/>
											))}
										</div>
									</div>
									{/* Footer */}
									{brandingEnabled && (
										<div
											className="ld-footer mt-4 text-center text-[8px]"
											style={{ color: resolvedThemeVars["--ld-muted-foreground"] }}
										>
											{brandingText || "Powered by LinkDen"}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
