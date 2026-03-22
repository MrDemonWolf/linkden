"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldGroup, selectClassName } from "./field-group";
import { cn } from "@/lib/utils";
import { Mail, Cloud, Key, AtSign } from "lucide-react";

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
	},
	{
		id: "cloudflare",
		name: "Cloudflare Email Workers",
		icon: Cloud,
		description: "Native Cloudflare email routing",
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
								onClick={() => onEmailProviderChange(p.id)}
								className={cn(
									"flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
									isSelected
										? "border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/50"
										: "border-border/50 hover:border-border hover:bg-muted/30",
								)}
							>
								<div
									className={cn(
										"mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
										isSelected
											? "bg-blue-500/10 text-blue-400"
											: "bg-muted text-muted-foreground",
									)}
								>
									<Icon className="h-3.5 w-3.5" />
								</div>
								<div className="min-w-0">
									<p className="text-xs font-medium">{p.name}</p>
									<p className="mt-0.5 text-[10px] text-muted-foreground">
										{p.description}
									</p>
								</div>
							</button>
						);
					})}
				</div>
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
					/>
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
					/>
				</div>
			</FieldGroup>
		</div>
	);
}
