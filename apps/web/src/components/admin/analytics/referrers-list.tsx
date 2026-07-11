"use client";

import { ArrowUpRight } from "lucide-react";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReferrerItem {
	referrer: string | null;
	count: number;
}

interface ReferrersListProps {
	items: ReferrerItem[] | undefined;
	isLoading?: boolean;
	isError?: boolean;
	onRetry?: () => void;
	title?: string;
}

export function ReferrersList({
	items,
	isLoading,
	isError,
	onRetry,
	title = "Referrers",
}: ReferrersListProps) {
	const data = items ?? [];
	const total = data.reduce((sum, r) => sum + r.count, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-1.5">
					<ArrowUpRight className="h-4 w-4 text-primary" aria-hidden="true" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isError ? (
					<QueryError onRetry={onRetry} />
				) : isLoading ? (
					<div className="grid gap-2 sm:grid-cols-2">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={`rf-sk-${i}`} className="h-9" />
						))}
					</div>
				) : data.length === 0 ? (
					<p className="text-xs text-muted-foreground py-6 text-center">No referrer data yet</p>
				) : (
					<div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
						{data.map((ref, i) => {
							const pct = total > 0 ? Math.round((ref.count / total) * 100) : 0;
							return (
								<div key={String(ref.referrer ?? i)}>
									<div className="flex items-center justify-between mb-1 gap-2">
										<div className="flex items-center gap-2 min-w-0">
											<span className="text-[10px] text-muted-foreground tabular-nums shrink-0 font-mono">
												{String(i + 1).padStart(2, "0")}
											</span>
											<span className="truncate text-xs font-medium font-mono">
												{ref.referrer || "Direct"}
											</span>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
											<span className="text-xs font-mono tabular-nums text-muted-foreground">
												{ref.count.toLocaleString()}
											</span>
										</div>
									</div>
									<div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
										<div
											className="h-full rounded-full bg-primary/60 transition-all duration-500"
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
