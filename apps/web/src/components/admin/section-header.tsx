import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionRule } from "@/components/ui/section-rule";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
	icon: LucideIcon;
	title: string;
	count?: number;
	variant?: "primary" | "muted";
}

export function SectionHeader({ icon: Icon, title, count, variant = "muted" }: SectionHeaderProps) {
	return (
		<CardHeader>
			<h2>
				<CardTitle className="flex items-center gap-2 text-sm text-foreground">
					<span
						className={cn(
							"flex size-7 items-center justify-center rounded-md",
							variant === "primary" ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted/80",
						)}
					>
						<Icon
							className={cn(
								"size-4",
								variant === "primary" ? "text-primary" : "text-muted-foreground",
							)}
							aria-hidden="true"
						/>
					</span>
					{title}
					{count !== undefined &&
						(variant === "primary" ? (
							<Badge variant="outline" className="ml-1 text-micro border-primary/30 text-primary">
								{count}
							</Badge>
						) : (
							<span className="text-xs font-normal text-muted-foreground">({count})</span>
						))}
				</CardTitle>
			</h2>
		</CardHeader>
	);
}

interface SectionCardProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}

/**
 * Canonical section container for the admin forms: a Card with an icon-accented
 * header row followed by its content. The icon accent uses the `--primary` token
 * (never a hardcoded colour) so it tracks the Midnight Studio brand and passes
 * contrast in both light and dark. Replaces the ad-hoc blue-500 header blocks
 * previously copy-pasted across the Settings and Wallet pages.
 */
export function SectionCard({
	icon: Icon,
	title,
	description,
	children,
	className,
}: SectionCardProps) {
	return (
		<Card className={className}>
			{/* CardHeader owns the header band, so its padding tracks the Card's own
			    (the old `-mx-6 px-6` row was hand-tuned to a gutter Card no longer
			    uses, which pushed the title 8px out of line with the body). */}
			<CardHeader className="flex flex-row items-start gap-3 border-b border-border/50">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
					<Icon className="size-4" aria-hidden="true" />
				</div>
				<div className="min-w-0">
					<h2>
						<CardTitle className="font-semibold">{title}</CardTitle>
					</h2>
					{description && <p className="mt-0.5 text-micro text-muted-foreground">{description}</p>}
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

/**
 * Group label inside a section: Signal dash + title + hairline rule. Renders as
 * an `h3` because it always sits under a `SectionCard` `h2`.
 */
export function SectionLabel({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<SectionRule as="h3" className={cn("text-small", className)}>
			{children}
		</SectionRule>
	);
}
