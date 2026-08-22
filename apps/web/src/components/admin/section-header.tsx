import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
							"flex h-7 w-7 items-center justify-center rounded-lg",
							variant === "primary" ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted/80",
						)}
					>
						<Icon
							className={cn(
								"h-4 w-4",
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
		<Card className={cn("overflow-hidden", className)}>
			<CardContent className="pt-0">
				<div className="-mx-6 mb-4 flex items-start gap-3 border-b border-border/50 px-6 py-4">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
						<Icon className="h-4 w-4" aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<h2 className="text-sm font-semibold">{title}</h2>
						{description && (
							<p className="mt-0.5 text-micro text-muted-foreground">{description}</p>
						)}
					</div>
				</div>
				{children}
			</CardContent>
		</Card>
	);
}

/**
 * Uppercase eyebrow label used to group fields inside a section. Consolidates the
 * ~30 copy-pasted `text-[10px|11px|xs] font-medium uppercase tracking-wider
 * text-muted-foreground` clusters into one place.
 */
export function SectionLabel({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"text-xs font-medium uppercase tracking-wider text-muted-foreground",
				className,
			)}
		>
			{children}
		</p>
	);
}
