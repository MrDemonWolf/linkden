"use client";

import type { SettingKey } from "@linkden/validators/settings";
import { useQuery } from "@tanstack/react-query";
import { Languages, Search } from "lucide-react";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { SectionCard, SectionLabel } from "@/components/admin/section-header";
import { OgPreviewCard } from "@/components/admin/settings/og-preview-card";
import {
	ogTemplatePreviewUrl,
	SeoSection,
	seoErrors,
} from "@/components/admin/settings/seo-section";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Label } from "@/components/ui/label";
import { Select, type SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { ogThemeColor } from "@/lib/og-params";
import { trpc } from "@/utils/trpc";

interface SeoForm {
	seoTitle: string;
	seoDescription: string;
	seoOgImage: string;
	seoOgMode: string;
	seoOgTemplate: string;
	siteLanguage: string;
}

/** Common page languages (BCP-47). A stored tag outside this list is still shown. */
const LANGUAGES: readonly SelectItem[] = [
	{ value: "en", label: "English" },
	{ value: "es", label: "Español" },
	{ value: "fr", label: "Français" },
	{ value: "de", label: "Deutsch" },
	{ value: "it", label: "Italiano" },
	{ value: "pt", label: "Português" },
	{ value: "pt-BR", label: "Português (Brasil)" },
	{ value: "nl", label: "Nederlands" },
	{ value: "sv", label: "Svenska" },
	{ value: "da", label: "Dansk" },
	{ value: "nb", label: "Norsk bokmål" },
	{ value: "fi", label: "Suomi" },
	{ value: "pl", label: "Polski" },
	{ value: "cs", label: "Čeština" },
	{ value: "tr", label: "Türkçe" },
	{ value: "uk", label: "Українська" },
	{ value: "ru", label: "Русский" },
	{ value: "ar", label: "العربية" },
	{ value: "he", label: "עברית" },
	{ value: "hi", label: "हिन्दी" },
	{ value: "id", label: "Bahasa Indonesia" },
	{ value: "vi", label: "Tiếng Việt" },
	{ value: "th", label: "ไทย" },
	{ value: "ja", label: "日本語" },
	{ value: "ko", label: "한국어" },
	{ value: "zh-Hans", label: "中文（简体）" },
	{ value: "zh-Hant", label: "中文（繁體）" },
];

function languageItems(current: string): readonly SelectItem[] {
	return LANGUAGES.some((l) => l.value === current)
		? LANGUAGES
		: [...LANGUAGES, { value: current, label: current }];
}

function parse(s: Record<string, string>): SeoForm {
	return {
		seoTitle: s.seo_title ?? "",
		seoDescription: s.seo_description ?? "",
		seoOgImage: s.seo_og_image ?? "",
		seoOgMode: s.seo_og_mode ?? "template",
		seoOgTemplate: s.seo_og_template ?? "minimal",
		siteLanguage: s.site_language || "en",
	};
}

function serialize(f: SeoForm): Array<{ key: SettingKey; value: string }> {
	return [
		{ key: "seo_title", value: f.seoTitle },
		{ key: "seo_description", value: f.seoDescription },
		{ key: "seo_og_image", value: f.seoOgImage },
		{ key: "seo_og_mode", value: f.seoOgMode },
		{ key: "seo_og_template", value: f.seoOgTemplate },
		{ key: "site_language", value: f.siteLanguage },
	];
}

/** Design → SEO: title, description and OG image; the preview column toggles phone ↔ social card. */
export default function DesignSeoPage() {
	const form = useSettingsForm<SeoForm>({
		parse,
		serialize,
		validate: seoErrors,
		successMessage: "SEO saved",
		errorMessage: "Failed to save SEO",
	});
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const { state: f, setState } = form;
	const set = <K extends keyof SeoForm>(key: K, value: SeoForm[K]) =>
		setState((prev) => (prev ? { ...prev, [key]: value } : prev));

	const saved = settingsQuery.data ?? {};
	const ogCard = f ? (
		<OgPreviewCard
			title={f.seoTitle || saved.profile_name || "My Links"}
			description={f.seoDescription || saved.bio || "Check out all my links"}
			imageUrl={
				f.seoOgMode === "template"
					? ogTemplatePreviewUrl({
							template: f.seoOgTemplate,
							profileName: saved.profile_name ?? "",
							bio: saved.bio ?? "",
							primaryColor: ogThemeColor({
								customPrimary: saved.custom_primary,
								themePreset: saved.theme_preset,
							}),
							avatarUrl: saved.avatar_url ?? "",
						})
					: f.seoOgImage
			}
		/>
	) : null;

	usePreviewSlot({
		overrides: f
			? {
					settings: {
						seoTitle: f.seoTitle || null,
						seoDescription: f.seoDescription || null,
						seoOgImage: f.seoOgImage || null,
						siteLanguage: f.siteLanguage || null,
					},
				}
			: undefined,
		altView: ogCard ? { label: "Social card", node: ogCard } : undefined,
	});

	// Only a load with nothing to show: a failed background refetch keeps the form.
	if (form.isError) {
		return <QueryError message="Couldn't load settings" onRetry={() => form.refetch()} />;
	}
	if (!f) {
		return (
			<div className="space-y-5" aria-busy="true" role="status" aria-label="Loading SEO">
				<Skeleton className="h-64" />
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<SectionCard
				icon={Search}
				title="SEO & Open Graph"
				description="How your page appears in search results and social shares"
			>
				<SeoSection
					seoTitle={f.seoTitle}
					seoDescription={f.seoDescription}
					seoOgImage={f.seoOgImage}
					seoOgMode={f.seoOgMode}
					seoOgTemplate={f.seoOgTemplate}
					onSeoTitleChange={(v) => set("seoTitle", v)}
					onSeoDescriptionChange={(v) => set("seoDescription", v)}
					onSeoOgImageChange={(v) => set("seoOgImage", v)}
					onSeoOgModeChange={(v) => set("seoOgMode", v)}
					onSeoOgTemplateChange={(v) => set("seoOgTemplate", v)}
				/>

				{/* Below lg there is no preview column, so the card stays inline here. */}
				<div className="mt-6 space-y-3 lg:hidden">
					<SectionLabel>Social Media Preview</SectionLabel>
					{ogCard}
				</div>
			</SectionCard>

			<SectionCard
				icon={Languages}
				title="Page language"
				description="Tells browsers, screen readers and search engines which language your page is in"
			>
				<div className="space-y-1.5">
					<Label htmlFor="seo-site-language" className="text-xs">
						Language
					</Label>
					<Select
						id="seo-site-language"
						value={f.siteLanguage}
						onValueChange={(v) => set("siteLanguage", v)}
						items={languageItems(f.siteLanguage)}
					/>
					<p className="text-micro text-muted-foreground">
						Screen readers use it to pick the right voice and pronunciation.
					</p>
				</div>
			</SectionCard>

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
