"use client";

import { Mail } from "lucide-react";
import { SectionCard } from "@/components/admin/section-header";
import { EmailSection, emailErrors } from "@/components/admin/settings/email-section";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsForm } from "@/hooks/use-settings-form";

interface EmailState {
	emailProvider: string;
	emailApiKey: string;
	emailFrom: string;
}

const parse = (s: Record<string, string>): EmailState => ({
	emailProvider: s.email_provider ?? "resend",
	emailApiKey: s.email_api_key ?? "",
	emailFrom: s.email_from ?? "",
});

const serialize = (s: EmailState) => [
	{ key: "email_provider" as const, value: s.emailProvider },
	{ key: "email_api_key" as const, value: s.emailApiKey },
	{ key: "email_from" as const, value: s.emailFrom },
];

// ponytail: `contact_delivery` has no editor today (only read on Insights) — not invented here.
export default function EmailSettingsPage() {
	const form = useSettingsForm<EmailState>({
		parse,
		serialize,
		validate: emailErrors,
		successMessage: "Email settings saved",
	});

	if (form.isLoading || !form.state) return <Skeleton className="h-64" />;
	const { state, setState } = form;

	return (
		<div className="space-y-6">
			<SectionCard
				icon={Mail}
				title="Email provider"
				description="Used for password resets, magic links, and contact-form delivery"
			>
				<EmailSection
					emailProvider={state.emailProvider}
					emailApiKey={state.emailApiKey}
					emailFrom={state.emailFrom}
					onEmailProviderChange={(v) => setState({ ...state, emailProvider: v })}
					onEmailApiKeyChange={(v) => setState({ ...state, emailApiKey: v })}
					onEmailFromChange={(v) => setState({ ...state, emailFrom: v })}
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
