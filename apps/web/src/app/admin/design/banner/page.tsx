"use client";

import { getBannerPresetsForTheme } from "@linkden/ui/banner-presets";
import { themePresets } from "@linkden/ui/themes";
import type { SettingKey } from "@linkden/validators/settings";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BannerSection } from "@/components/admin/appearance/banner-section";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { trpc } from "@/utils/trpc";

interface BannerForm {
	enabled: boolean;
	preset: string;
	mode: "preset" | "custom";
	customUrl: string;
}

function parse(s: Record<string, string>): BannerForm {
	return {
		enabled: s.banner_enabled === "true",
		preset: s.banner_preset ?? "",
		mode: (s.banner_mode as "preset" | "custom") || "preset",
		customUrl: s.banner_custom_url ?? "",
	};
}

function serialize(f: BannerForm): Array<{ key: SettingKey; value: string }> {
	return [
		{ key: "banner_enabled", value: String(f.enabled) },
		{ key: "banner_preset", value: f.preset },
		{ key: "banner_mode", value: f.mode },
		{ key: "banner_custom_url", value: f.customUrl },
	];
}

/** Design → Banner: the strip behind the avatar, presets tinted by the saved theme. */
export default function DesignBannerPage() {
	const form = useSettingsForm<BannerForm>({
		parse,
		serialize,
		successMessage: "Banner saved",
		errorMessage: "Failed to save banner",
	});
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const { state: f, setState } = form;
	const set = <K extends keyof BannerForm>(key: K, value: BannerForm[K]) =>
		setState((prev) => (prev ? { ...prev, [key]: value } : prev));

	const [previewDark, setPreviewDark] = useState(false);

	// Preset thumbnails follow the *saved* theme (Design → Theme) in the previewed mode.
	const saved = settingsQuery.data;
	const themedPresets = useMemo(() => {
		const preset =
			themePresets.find((t) => t.name === (saved?.theme_preset ?? "default")) ?? themePresets[0];
		const vars = { ...preset.cssVars[previewDark ? "dark" : "light"] };
		if (saved?.custom_primary) vars["--ld-primary"] = saved.custom_primary;
		if (saved?.custom_accent) vars["--ld-accent"] = saved.custom_accent;
		if (saved?.custom_background) vars["--ld-background"] = saved.custom_background;
		return getBannerPresetsForTheme(
			vars["--ld-primary"],
			vars["--ld-accent"],
			vars["--ld-background"],
		);
	}, [saved, previewDark]);

	usePreviewSlot({
		overrides: f
			? {
					settings: {
						bannerEnabled: f.enabled,
						bannerPreset: f.preset,
						bannerMode: f.mode,
						bannerCustomUrl: f.customUrl,
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
			<div className="space-y-5" aria-busy="true" role="status" aria-label="Loading banner">
				<Skeleton className="h-64" />
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<BannerSection
				bannerEnabled={f.enabled}
				bannerMode={f.mode}
				bannerPreset={f.preset}
				bannerCustomUrl={f.customUrl}
				themedBannerPresets={themedPresets}
				onBannerEnabledChange={(v) => set("enabled", v)}
				onBannerModeChange={(v) => set("mode", v)}
				onBannerPresetChange={(v) => set("preset", v)}
				onBannerCustomUrlChange={(v) => set("customUrl", v)}
			/>

			<StickySaveBar
				isDirty={form.isDirty}
				isSaving={form.isSaving}
				onSave={form.save}
				onDiscard={form.reset}
			/>
		</div>
	);
}
