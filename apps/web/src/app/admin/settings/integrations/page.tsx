"use client";

import { MapPin, Shield } from "lucide-react";
import { SectionCard } from "@/components/admin/section-header";
import { CaptchaSection, captchaErrors } from "@/components/admin/settings/captcha-section";
import { MapKitSection, mapkitErrors } from "@/components/admin/settings/mapkit-section";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsForm } from "@/hooks/use-settings-form";

interface IntegrationsState {
	captchaProvider: string;
	captchaSiteKey: string;
	captchaSecretKey: string;
	mapkitEnabled: boolean;
	mapkitToken: string;
}

const parse = (s: Record<string, string>): IntegrationsState => ({
	captchaProvider: s.captcha_provider ?? "none",
	captchaSiteKey: s.captcha_site_key ?? "",
	captchaSecretKey: s.captcha_secret_key ?? "",
	mapkitEnabled: s.mapkit_enabled === "true",
	mapkitToken: s.mapkit_token ?? "",
});

const serialize = (s: IntegrationsState) => [
	{ key: "captcha_provider" as const, value: s.captchaProvider },
	{ key: "captcha_site_key" as const, value: s.captchaSiteKey },
	{ key: "captcha_secret_key" as const, value: s.captchaSecretKey },
	{ key: "mapkit_enabled" as const, value: String(s.mapkitEnabled) },
	{ key: "mapkit_token" as const, value: s.mapkitToken },
];

const validate = (s: IntegrationsState) => ({ ...captchaErrors(s), ...mapkitErrors(s) });

export default function IntegrationsSettingsPage() {
	const form = useSettingsForm<IntegrationsState>({
		parse,
		serialize,
		validate,
		successMessage: "Integrations saved",
	});

	if (form.isLoading || !form.state) return <Skeleton className="h-64" />;
	const { state, setState } = form;

	return (
		<div className="space-y-6">
			<SectionCard
				icon={Shield}
				title="CAPTCHA"
				description="Bot protection for the contact form and sign-in"
			>
				<CaptchaSection
					captchaProvider={state.captchaProvider}
					captchaSiteKey={state.captchaSiteKey}
					captchaSecretKey={state.captchaSecretKey}
					onCaptchaProviderChange={(v) => setState({ ...state, captchaProvider: v })}
					onCaptchaSiteKeyChange={(v) => setState({ ...state, captchaSiteKey: v })}
					onCaptchaSecretKeyChange={(v) => setState({ ...state, captchaSecretKey: v })}
				/>
			</SectionCard>

			<SectionCard
				icon={MapPin}
				title="Apple Maps (MapKit JS)"
				description="Address autocomplete for Location blocks"
			>
				<MapKitSection
					mapkitEnabled={state.mapkitEnabled}
					mapkitToken={state.mapkitToken}
					onMapkitEnabledChange={(v) => setState({ ...state, mapkitEnabled: v })}
					onMapkitTokenChange={(v) => setState({ ...state, mapkitToken: v })}
				/>
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
