"use client";

import { Globe } from "lucide-react";

interface OgPreviewCardProps {
	title: string;
	description: string;
	imageUrl: string;
	siteUrl?: string;
}

/**
 * Live OG card preview — mimics how the link appears on Twitter/Facebook/LinkedIn.
 * Shows a realistic social media embed card with image, title, description, and domain.
 */
export function OgPreviewCard({
	title,
	description,
	imageUrl,
	siteUrl,
}: OgPreviewCardProps) {
	const displayTitle = title || "Your Page Title";
	const displayDescription =
		description || "A short description of your page will appear here.";
	const displayDomain = siteUrl
		? siteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
		: "yourdomain.com";

	return (
		<div className="space-y-3">
			{/* Twitter / X card style */}
			<div>
				<p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
					Twitter / X
				</p>
				<div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
					{imageUrl ? (
						<div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={imageUrl}
								alt="OG Preview"
								className="h-full w-full object-cover"
							/>
						</div>
					) : (
						<div className="flex aspect-[1.91/1] w-full items-center justify-center bg-muted/50">
							<Globe className="h-8 w-8 text-muted-foreground/40" />
						</div>
					)}
					<div className="border-t border-border/40 px-3 py-2.5">
						<p className="truncate text-[11px] text-muted-foreground">
							{displayDomain}
						</p>
						<p className="mt-0.5 truncate text-sm font-medium text-foreground">
							{displayTitle}
						</p>
						<p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
							{displayDescription}
						</p>
					</div>
				</div>
			</div>

			{/* Facebook style */}
			<div>
				<p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
					Facebook / LinkedIn
				</p>
				<div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30 shadow-sm">
					{imageUrl ? (
						<div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={imageUrl}
								alt="OG Preview"
								className="h-full w-full object-cover"
							/>
						</div>
					) : (
						<div className="flex aspect-[1.91/1] w-full items-center justify-center bg-muted/50">
							<Globe className="h-8 w-8 text-muted-foreground/40" />
						</div>
					)}
					<div className="px-3 py-2.5">
						<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							{displayDomain}
						</p>
						<p className="mt-1 truncate text-sm font-semibold text-foreground">
							{displayTitle}
						</p>
						<p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
							{displayDescription}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
