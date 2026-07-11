"use client";

import { ExternalLink, Trophy } from "lucide-react";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TopLinkItem {
	id?: string | number | null;
	title: string | null;
	url: string | null;
	clicks: number;
}

interface TopLinksListProps {
	items: TopLinkItem[] | undefined;
	isLoading?: boolean;
	isError?: boolean;
	onRetry?: () => void;
	limit?: number;
	title?: string;
}

function extractDomain(url: string | null): string {
	if (!url) return "—";
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return url;
	}
}

export function TopLinksList({
	items,
	isLoading,
	isError,
	onRetry,
	limit = 5,
	title = "Top Links",
}: TopLinksListProps) {
	const data = (items ?? []).slice(0, limit);
	const max = data[0]?.clicks ?? 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-1.5">
					<Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isError ? (
					<QueryError onRetry={onRetry} />
				) : isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: limit }).map((_, i) => (
							<Skeleton key={`tl-sk-${i}`} className="h-10 w-full" />
						))}
					</div>
				) : data.length === 0 ? (
					<p className="text-xs text-muted-foreground py-6 text-center">No clicks yet</p>
				) : (
					<div className="space-y-2.5">
						{data.map((link, i) => {
							const pct = max > 0 ? Math.round((link.clicks / max) * 100) : 0;
							return (
								<div key={String(link.id ?? i)}>
									<div className="flex items-center justify-between gap-3 mb-1">
										<div className="flex items-center gap-2 min-w-0">
											<span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0 w-6">
												#{String(i + 1).padStart(2, "0")}
											</span>
											<div className="min-w-0">
												<p className="text-xs font-medium truncate">{link.title || "Untitled"}</p>
												<p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
													<ExternalLink className="h-2.5 w-2.5 shrink-0" />
													{extractDomain(link.url)}
												</p>
											</div>
										</div>
										<span className="text-xs font-mono tabular-nums font-medium shrink-0">
											{link.clicks.toLocaleString()}
										</span>
									</div>
									<div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
										<div
											className="h-full rounded-full bg-primary/70 transition-all duration-500"
											style={{ width: `${pct}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
