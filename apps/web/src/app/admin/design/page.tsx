"use client";

import { themePresets } from "@linkden/ui/themes";
import type { SettingKey } from "@linkden/validators/settings";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { VerifiedBadgeSection } from "@/components/admin/appearance/branding-section";
import { ColorsSection } from "@/components/admin/appearance/colors-section";
import { CustomCssSection } from "@/components/admin/appearance/custom-css-section";
import {
	type SocialIconShape,
	SocialIconShapeSection,
} from "@/components/admin/appearance/social-icon-shape-section";
import { ThemePresetsSection } from "@/components/admin/appearance/theme-presets-section";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { FieldError } from "@/components/admin/field-feedback";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { fieldError } from "@/lib/validate";
import { trpc } from "@/utils/trpc";

// The public page only injects the first 20k chars of custom CSS.
const customCssSchema = z.string().max(20_000);

// Fresh-install fallbacks mirror the default preset's light palette so the
// pickers (and their contrast badges) match what the public page renders
// before any custom color is saved.
const defaultLightVars = themePresets[0].cssVars.light;

interface ThemeForm {
	theme: string;
	colorMode: string;
	primaryColor: string;
	secondaryColor: string;
	accentColor: string;
	bgColor: string;
	customCss: string;
	verifiedBadge: boolean;
	socialIconShape: SocialIconShape;
}

function parse(s: Record<string, string>): ThemeForm {
	return {
		theme: s.theme_preset ?? "default",
		colorMode: s.default_color_mode ?? "light",
		primaryColor: s.custom_primary ?? defaultLightVars["--ld-primary"],
		secondaryColor: s.custom_secondary ?? defaultLightVars["--ld-secondary"],
		accentColor: s.custom_accent ?? defaultLightVars["--ld-accent"],
		bgColor: s.custom_background ?? defaultLightVars["--ld-background"],
		customCss: s.custom_css ?? "",
		verifiedBadge: s.verified_badge === "true",
		socialIconShape: (s.social_icon_shape as SocialIconShape) || "circle",
	};
}

function serialize(f: ThemeForm): Array<{ key: SettingKey; value: string }> {
	return [
		{ key: "theme_preset", value: f.theme },
		{ key: "default_color_mode", value: f.colorMode },
		{ key: "custom_primary", value: f.primaryColor },
		{ key: "custom_secondary", value: f.secondaryColor },
		{ key: "custom_accent", value: f.accentColor },
		{ key: "custom_background", value: f.bgColor },
		{ key: "custom_css", value: f.customCss },
		{ key: "verified_badge", value: String(f.verifiedBadge) },
		{ key: "social_icon_shape", value: f.socialIconShape },
	];
}

function validate(f: ThemeForm): Record<string, string> {
	const css = fieldError(customCssSchema, f.customCss);
	return css ? { customCss: css } : {};
}

/** Design → Theme: presets, colours, default colour mode, icon shape, verified badge, custom CSS. */
export default function DesignThemePage() {
	const form = useSettingsForm<ThemeForm>({
		parse,
		serialize,
		validate,
		successMessage: "Theme saved",
		errorMessage: "Failed to save theme",
	});
	// Same cache entry the hook reads — only used for the error/retry state.
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const { state: f, setState } = form;
	const set = <K extends keyof ThemeForm>(key: K, value: ThemeForm[K]) =>
		setState((prev) => (prev ? { ...prev, [key]: value } : prev));

	// Preview follows the default colour mode until the admin flips it manually.
	const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
	const [previewDark, setPreviewDark] = useState(false);
	const colorMode = f?.colorMode;
	useEffect(() => {
		if (colorMode === "dark") setPreviewDark(true);
		else if (colorMode === "light") setPreviewDark(false);
		else if (colorMode === "system") setPreviewDark(systemDark);
	}, [colorMode, systemDark]);

	// Unsaved edits in `public.getPage` shape — PublicPage resolves the theme
	// from these exactly as the live page does.
	usePreviewSlot({
		overrides: f
			? {
					profile: { isVerified: f.verifiedBadge },
					settings: {
						themePreset: f.theme,
						customPrimary: f.primaryColor,
						customSecondary: f.secondaryColor,
						customAccent: f.accentColor,
						customBackground: f.bgColor,
						customCss: f.customCss,
						socialIconShape: f.socialIconShape,
					},
				}
			: undefined,
		mode: previewDark ? "dark" : "light",
		onModeChange: (m) => setPreviewDark(m === "dark"),
	});

	if (settingsQuery.isError) {
		return <QueryError message="Couldn't load settings" onRetry={() => settingsQuery.refetch()} />;
	}
	if (!f) {
		return (
			<div className="space-y-5" aria-busy="true" role="status" aria-label="Loading theme">
				<Skeleton className="h-64" />
				<Skeleton className="h-48" />
				<Skeleton className="h-32" />
			</div>
		);
	}

	const handleThemeSelect = (name: string) => {
		const preset = themePresets.find((t) => t.name === name);
		setState((prev) => {
			if (!prev) return prev;
			if (!preset) return { ...prev, theme: name };
			const vars = preset.cssVars.light;
			return {
				...prev,
				theme: name,
				primaryColor: vars["--ld-primary"],
				secondaryColor: vars["--ld-secondary"],
				accentColor: vars["--ld-accent"],
				bgColor: vars["--ld-background"],
			};
		});
	};

	return (
		<div className="space-y-5">
			<ThemePresetsSection selectedTheme={f.theme} onThemeSelect={handleThemeSelect} />

			<ColorsSection
				colorMode={f.colorMode}
				primaryColor={f.primaryColor}
				secondaryColor={f.secondaryColor}
				accentColor={f.accentColor}
				bgColor={f.bgColor}
				onColorModeChange={(v) => set("colorMode", v)}
				onPrimaryChange={(v) => set("primaryColor", v)}
				onSecondaryChange={(v) => set("secondaryColor", v)}
				onAccentChange={(v) => set("accentColor", v)}
				onBgChange={(v) => set("bgColor", v)}
			/>

			<SocialIconShapeSection
				shape={f.socialIconShape}
				onShapeChange={(v) => set("socialIconShape", v)}
			/>

			<VerifiedBadgeSection
				verifiedBadge={f.verifiedBadge}
				onVerifiedBadgeChange={(v) => set("verifiedBadge", v)}
			/>

			{/* The error belongs to the CSS card above it, so it rides in the same
			    stack instead of floating a full section gap away. */}
			<div className="space-y-2">
				<CustomCssSection customCss={f.customCss} onCustomCssChange={(v) => set("customCss", v)} />
				<FieldError id="custom-css-error" error={form.errors.customCss ?? null} />
			</div>

			<StickySaveBar
				isDirty={form.isDirty}
				isSaving={form.isSaving}
				hasErrors={form.hasErrors}
				onSave={form.save}
				onDiscard={form.reset}
			/>
		</div>
	);
}
