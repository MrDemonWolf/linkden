"use client";

import { SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { AtSign, Key, Mail } from "lucide-react";
import { z } from "zod";
import { FieldError } from "@/components/admin/field-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError } from "@/lib/validate";
import { FieldGroup } from "./field-group";
import { SecretInput } from "./secret-input";

const API_KEY_MAX = SETTING_REGISTRY.email_api_key?.maxLength ?? 512;

/** Field → message for invalid email settings. Blank values are "cleared". */
export function emailErrors(v: { emailApiKey: string; emailFrom: string }): Record<string, string> {
	const errors: Record<string, string> = {};
	const key = fieldError(z.string().max(API_KEY_MAX), v.emailApiKey);
	if (key) errors.emailApiKey = key;
	// Resend accepts `Name <address>` — validate the address part only.
	const address = v.emailFrom.match(/<([^>]*)>\s*$/)?.[1] ?? v.emailFrom;
	const from = v.emailFrom ? fieldError(z.email(), address.trim()) : null;
	if (from) errors.emailFrom = from;
	// A key with no sender saves cleanly and then sends from
	// noreply@example.com (packages/auth), which no provider will accept — so
	// "Email settings saved" would be reported for a setup that cannot send.
	if (v.emailApiKey && !v.emailFrom.trim()) {
		errors.emailFrom = "Required — mail cannot send without a verified sender address";
	}
	return errors;
}

interface EmailSectionProps {
	emailProvider: string;
	emailApiKey: string;
	emailFrom: string;
	onEmailProviderChange: (v: string) => void;
	onEmailApiKeyChange: (v: string) => void;
	onEmailFromChange: (v: string) => void;
}

export function EmailSection({
	emailProvider,
	emailApiKey,
	emailFrom,
	onEmailProviderChange,
	onEmailApiKeyChange,
	onEmailFromChange,
}: EmailSectionProps) {
	const effectiveProvider = emailProvider || "resend";
	const errors = emailErrors({ emailApiKey, emailFrom });
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
				<div>
					<p className="text-sm font-medium">Resend</p>
					<p className="text-micro text-muted-foreground">Email delivery provider</p>
				</div>
			</div>
			{effectiveProvider !== "resend" && (
				<div className="space-y-2">
					<p className="text-micro text-warning">
						Your saved provider is no longer supported. Switch to Resend to send email.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onEmailProviderChange("resend")}
					>
						Use Resend
					</Button>
				</div>
			)}

			{/* Credentials */}
			<FieldGroup columns={2}>
				<div className="space-y-1.5">
					<Label htmlFor="s-email-key">
						<span className="flex items-center gap-1.5">
							<Key className="h-3 w-3 text-muted-foreground" />
							API Key
						</span>
					</Label>
					<SecretInput
						id="s-email-key"
						type="password"
						value={emailApiKey}
						onValueChange={onEmailApiKeyChange}
						hintId="s-email-key-hint"
						maxLength={API_KEY_MAX}
						placeholder={effectiveProvider === "resend" ? "re_..." : "API key"}
						aria-invalid={!!errors.emailApiKey}
						aria-describedby={errors.emailApiKey ? "s-email-key-error" : undefined}
					/>
					<FieldError id="s-email-key-error" error={errors.emailApiKey} />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="s-email-from">
						<span className="flex items-center gap-1.5">
							<AtSign className="h-3 w-3 text-muted-foreground" />
							From Address
						</span>
					</Label>
					<Input
						id="s-email-from"
						value={emailFrom}
						onChange={(e) => onEmailFromChange(e.target.value)}
						placeholder="noreply@yourdomain.com"
						inputMode="email"
						aria-invalid={!!errors.emailFrom}
						aria-describedby={errors.emailFrom ? "s-email-from-error" : "s-email-from-hint"}
					/>
					<p id="s-email-from-hint" className="text-micro text-muted-foreground">
						A verified sender, or{" "}
						<code className="rounded bg-muted px-1">Name &lt;address&gt;</code>
					</p>
					<FieldError id="s-email-from-error" error={errors.emailFrom} />
				</div>
			</FieldGroup>
		</div>
	);
}
