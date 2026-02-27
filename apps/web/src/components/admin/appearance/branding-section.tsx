"use client";

import { Tag, BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function VerifiedBadgeSection({
	verifiedBadge,
	onVerifiedBadgeChange,
}: {
	verifiedBadge: boolean;
	onVerifiedBadgeChange: (value: boolean) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<BadgeCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Verified Badge
					</CardTitle>
				</h2>
			</CardHeader>
			<CardContent>
				<label
					htmlFor="a-verified"
					className="flex items-start gap-3 cursor-pointer group"
				>
					<div className="min-w-0 flex-1">
						<span className="text-xs font-medium group-hover:text-foreground transition-colors">
							Show verified badge
						</span>
						<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
							Displays a blue checkmark next to your name
						</p>
					</div>
					<button
						id="a-verified"
						type="button"
						role="switch"
						aria-checked={verifiedBadge}
						aria-label="Show verified badge"
						onClick={() => onVerifiedBadgeChange(!verifiedBadge)}
						className={cn(
							"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
							verifiedBadge ? "bg-primary" : "bg-muted",
						)}
					>
						<span
							className={cn(
								"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
								verifiedBadge ? "translate-x-[18px]" : "translate-x-[3px]",
							)}
						/>
					</button>
				</label>
			</CardContent>
		</Card>
	);
}

export function BrandingSection({
	brandingEnabled,
	brandingText,
	brandingLink,
	profileName,
	onBrandingEnabledChange,
	onBrandingTextChange,
	onBrandingLinkChange,
}: {
	brandingEnabled: boolean;
	brandingText: string;
	brandingLink: string;
	profileName: string;
	onBrandingEnabledChange: (value: boolean) => void;
	onBrandingTextChange: (value: string) => void;
	onBrandingLinkChange: (value: string) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Branding
					</CardTitle>
				</h2>
			</CardHeader>
			<CardContent className="space-y-3">
				<label
					htmlFor="a-branding-enabled"
					className="flex items-start gap-3 cursor-pointer group"
				>
					<div className="min-w-0 flex-1">
						<span className="text-xs font-medium group-hover:text-foreground transition-colors">
							Show whitelabel footer
						</span>
						<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
							Display a footer with custom text and link
						</p>
					</div>
					<button
						id="a-branding-enabled"
						type="button"
						role="switch"
						aria-checked={brandingEnabled}
						aria-label="Show whitelabel footer"
						onClick={() => onBrandingEnabledChange(!brandingEnabled)}
						className={cn(
							"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
							brandingEnabled ? "bg-primary" : "bg-muted",
						)}
					>
						<span
							className={cn(
								"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
								brandingEnabled ? "translate-x-[18px]" : "translate-x-[3px]",
							)}
						/>
					</button>
				</label>
				{brandingEnabled && (
					<div className="space-y-3">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="a-branding-text">Custom Text</Label>
								<Input
									id="a-branding-text"
									value={brandingText}
									onChange={(e) => onBrandingTextChange(e.target.value)}
									placeholder="Powered by LinkDen"
								/>
								<p className="text-[11px] text-muted-foreground leading-tight">
									Variables: <code className="rounded bg-muted px-1">{"{{year}}"}</code>{" "}
									<code className="rounded bg-muted px-1">{"{{copyright}}"}</code>{" "}
									<code className="rounded bg-muted px-1">{"{{name}}"}</code>
								</p>
								{brandingText && /\{\{(year|copyright|name)\}\}/.test(brandingText) && (
									<p className="text-[11px] text-muted-foreground">
										Preview:{" "}
										<span className="font-medium text-foreground">
											{brandingText
												.replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
												.replace(/\{\{copyright\}\}/g, "\u00A9")
												.replace(/\{\{name\}\}/g, profileName || "Your Name")}
										</span>
									</p>
								)}
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="a-branding-link">Custom Link</Label>
								<Input
									id="a-branding-link"
									value={brandingLink}
									onChange={(e) => onBrandingLinkChange(e.target.value)}
									placeholder="https://linkden.io"
								/>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
