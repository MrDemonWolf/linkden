"use client";

import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type TopLink = {
	id?: unknown;
	title: string | null;
	url: string | null;
	clicks: number;
};

function extractDomain(url: string | null): string {
	if (!url) return "—";
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return url;
	}
}

interface TopLinksListProps {
	data: TopLink[] | undefined;
	isLoading: boolean;
}

export function TopLinksList({ data, isLoading }: TopLinksListProps) {
	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={`tll-${i}`} className="h-10 w-full" />
				))}
			</div>
		);
	}

	if (!data?.length) {
		return (
			<p className="text-xs text-muted-foreground py-8 text-center">
				No clicks yet
			</p>
		);
	}

	const max = Math.max(...data.map((l) => l.clicks ?? 0), 1);

	return (
		<div className="divide-y divide-dashed divide-border/60">
			{data.map((link, i) => {
				const count = link.clicks ?? 0;
				const pct = Math.round((count / max) * 100);
				return (
					<div
						key={String(link.id ?? i)}
						className="flex items-center gap-3 py-2.5"
					>
						<div className="min-w-0 flex-1">
							<p className="text-xs font-medium truncate">
								{link.title || "Untitled"}
							</p>
							<p className="text-[10px] text-muted-foreground font-mono truncate flex items-center gap-1">
								<ExternalLink className="h-2.5 w-2.5 shrink-0" />
								{extractDomain(link.url)}
							</p>
						</div>
						<div className="h-1.5 w-16 shrink-0 rounded-full bg-muted/50 overflow-hidden">
							<div
								className="h-full rounded-full bg-blue-500/60 transition-all duration-500"
								style={{ width: `${pct}%` }}
							/>
						</div>
						<span className="w-10 shrink-0 text-right text-xs font-mono tabular-nums font-medium">
							{count.toLocaleString()}
						</span>
					</div>
				);
			})}
		</div>
	);
}
