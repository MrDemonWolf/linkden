"use client";

import { SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { AtSign, Cloud, Key, Mail } from "lucide-react";
import { z } from "zod";
import { FieldError } from "@/components/admin/field-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fieldError } from "@/lib/validate";
import { FieldGroup } from "./field-group";

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

const PROVIDERS = [
	{
		id: "resend",
		name: "Resend",
		icon: Mail,
		description: "Modern email API for developers",
		comingSoon: false,
	},
	{
		id: "cloudflare",
		name: "Cloudflare Email Workers",
		icon: Cloud,
		description: "Native Cloudflare email routing",
		comingSoon: true,
	},
];

export function EmailSection({
	emailProvider,
	emailApiKey,
	emailFrom,
	onEmailProviderChange,
	onEmailApiKeyChange,
	onEmailFromChange,
}: EmailSectionProps) {
	const errors = emailErrors({ emailApiKey, emailFrom });
	return (
		<div className="space-y-4">
			{/* Provider selection cards */}
			<div className="space-y-1.5">
				<Label>Provider</Label>
				<div className="grid gap-2 sm:grid-cols-2">
					{PROVIDERS.map((p) => {
						const isSelected = emailProvider === p.id;
						const Icon = p.icon;
						return (
							<button
								key={p.id}
								type="button"
								aria-pressed={isSelected}
								disabled={p.comingSoon}
								onClick={() => onEmailProviderChange(p.id)}
								className={cn(
									"flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
									p.comingSoon && "cursor-not-allowed",
									isSelected
										? "border-primary/50 bg-primary/5 ring-1 ring-primary/50"
										: p.comingSoon
											? "border-border/50 opacity-60"
											: "border-border/50 hover:border-border hover:bg-muted/30",
								)}
							>
								<div
									className={cn(
										"mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
										isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
									)}
								>
									<Icon className="h-3.5 w-3.5" />
								</div>
								<div className="min-w-0">
									<p className="text-xs font-medium">
										{p.name}
										{p.comingSoon && (
											<span className="ml-1.5 rounded-sm bg-muted px-1 py-0.5 text-micro font-medium uppercase tracking-wider text-muted-foreground">
												Coming soon
											</span>
										)}
									</p>
									<p className="mt-0.5 text-micro text-muted-foreground">{p.description}</p>
								</div>
							</button>
						);
					})}
				</div>
				<p className="text-micro text-muted-foreground">
					Resend is currently the only supported provider — Cloudflare Email Workers support is
					coming soon.
				</p>
				{emailProvider === "cloudflare" && (
					<p className="text-micro text-warning">
						This instance is still set to Cloudflare Email Workers, which isn't wired up yet —
						password reset and magic-link emails won't send until you switch to Resend.
					</p>
				)}
			</div>

			{/* Credentials */}
			<FieldGroup columns={2}>
				<div className="space-y-1.5">
					<Label htmlFor="s-email-key">
						<span className="flex items-center gap-1.5">
							<Key className="h-3 w-3 text-muted-foreground" />
							API Key
						</span>
					</Label>
					<Input
						id="s-email-key"
						type="password"
						value={emailApiKey}
						onChange={(e) => onEmailApiKeyChange(e.target.value)}
						placeholder={emailProvider === "resend" ? "re_..." : "API key"}
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
