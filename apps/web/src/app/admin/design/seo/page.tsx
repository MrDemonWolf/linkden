"use client";

import type { SettingKey } from "@linkden/validators/settings";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { trpc } from "@/utils/trpc";

interface SeoForm {
	seoTitle: string;
	seoDescription: string;
	seoOgImage: string;
	seoOgMode: string;
	seoOgTemplate: string;
}

function parse(s: Record<string, string>): SeoForm {
	return {
		seoTitle: s.seo_title ?? "",
		seoDescription: s.seo_description ?? "",
		seoOgImage: s.seo_og_image ?? "",
		seoOgMode: s.seo_og_mode ?? "template",
		seoOgTemplate: s.seo_og_template ?? "minimal",
	};
}

function serialize(f: SeoForm): Array<{ key: SettingKey; value: string }> {
	return [
		{ key: "seo_title", value: f.seoTitle },
		{ key: "seo_description", value: f.seoDescription },
		{ key: "seo_og_image", value: f.seoOgImage },
		{ key: "seo_og_mode", value: f.seoOgMode },
		{ key: "seo_og_template", value: f.seoOgTemplate },
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
							primaryColor: saved.custom_primary ?? "#6366f1",
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
					},
				}
			: undefined,
		altView: ogCard ? { label: "Social card", node: ogCard } : undefined,
	});

	if (settingsQuery.isError) {
		return <QueryError message="Couldn't load settings" onRetry={() => settingsQuery.refetch()} />;
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

				{/* ponytail: below lg there is no preview column, so the card stays inline here. */}
				<div className="mt-6 space-y-3 lg:hidden">
					<SectionLabel>Social Media Preview</SectionLabel>
					{ogCard}
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
