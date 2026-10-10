"use client";

import { themePresets } from "@linkden/ui/themes";
import { SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { useEffect, useState } from "react";
import { z } from "zod";
import { VerifiedBadgeSection } from "@/components/admin/appearance/branding-section";
import { ColorsSection, type PresetColors } from "@/components/admin/appearance/colors-section";
import { CustomCssSection } from "@/components/admin/appearance/custom-css-section";
import { SocialIconShapeSection } from "@/components/admin/appearance/social-icon-shape-section";
import { ThemePresetsSection } from "@/components/admin/appearance/theme-presets-section";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { FieldError } from "@/components/admin/field-feedback";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { fieldError } from "@/lib/validate";
import { clearCustomColors, parse, serialize, type ThemeForm } from "./theme-form";

// The public page only injects the first 20k chars of custom CSS.
const customCssSchema = z.string().max(SETTING_REGISTRY.custom_css?.maxLength ?? 20_000);

/** The preset's own palette for a mode: what an empty custom-colour field inherits. */
function presetColorsFor(theme: string, mode: "light" | "dark"): PresetColors | undefined {
	const vars = themePresets.find((t) => t.name === theme)?.cssVars[mode];
	if (!vars) return undefined;
	return {
		primary: vars["--ld-primary"] ?? "",
		secondary: vars["--ld-secondary"] ?? "",
		accent: vars["--ld-accent"] ?? "",
		background: vars["--ld-background"] ?? "",
	};
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

	// Only a load with nothing to show: a failed background refetch keeps the form.
	if (form.isError) {
		return <QueryError message="Couldn't load settings" onRetry={() => form.refetch()} />;
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

	// Picking a preset adopts its full light + dark palette, so any custom
	// overrides are cleared rather than replaced with the preset's light values.
	const handleThemeSelect = (name: string) => {
		setState((prev) => (prev ? clearCustomColors(prev, name) : prev));
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
				presetColors={presetColorsFor(f.theme, previewDark ? "dark" : "light")}
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
