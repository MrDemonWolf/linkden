"use client";

import { Inbox, Mail } from "lucide-react";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { FieldError } from "@/components/admin/field-feedback";
import { SectionCard } from "@/components/admin/section-header";
import { EmailSection } from "@/components/admin/settings/email-section";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsForm } from "@/hooks/use-settings-form";
import {
	DELIVERY_ITEMS,
	type EmailState,
	isDeliveryMode,
	parse,
	serialize,
	validate,
} from "./email-form";

export default function EmailSettingsPage() {
	const form = useSettingsForm<EmailState>({
		parse,
		serialize,
		validate,
		successMessage: "Email settings saved",
	});
	// A failed load would otherwise leave the skeleton up forever.
	if (form.isError) {
		return <QueryError message="Couldn't load settings" onRetry={() => form.refetch()} />;
	}
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
			<SectionCard
				icon={Inbox}
				title="Contact-form delivery"
				description="Where messages from your page's contact form go"
			>
				<div className="space-y-1.5">
					<Label htmlFor="s-contact-delivery">Deliver messages to</Label>
					<Select
						id="s-contact-delivery"
						value={state.contactDelivery}
						onValueChange={(v) => {
							if (isDeliveryMode(v)) setState({ ...state, contactDelivery: v });
						}}
						items={DELIVERY_ITEMS}
					/>
					<p className="text-micro text-muted-foreground">
						Email goes to the admin account&apos;s address through the provider above. Messages kept
						in the Inbox are never lost to an email outage.
					</p>
					<FieldError id="s-contact-delivery-error" error={form.errors.contactDelivery} delay={0} />
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
