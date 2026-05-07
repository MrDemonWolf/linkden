"use client";

import { Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CountryItem {
	country: string | null;
	count: number;
}

interface CountriesListProps {
	items: CountryItem[] | undefined;
	isLoading?: boolean;
	limit?: number;
	title?: string;
}

function flagFromCountry(input: string | null): string {
	if (!input) return "🌐";
	const code = input.trim().toUpperCase();
	if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return "🌐";
	const A = 0x1f1e6;
	const cp1 = A + (code.charCodeAt(0) - 65);
	const cp2 = A + (code.charCodeAt(1) - 65);
	return String.fromCodePoint(cp1, cp2);
}

export function CountriesList({
	items,
	isLoading,
	limit = 8,
	title = "Countries",
}: CountriesListProps) {
	const data = (items ?? []).slice(0, limit);
	const max = data[0]?.count ?? 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-1.5">
					<Globe className="h-4 w-4 text-emerald-400" aria-hidden="true" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: limit }).map((_, i) => (
							<Skeleton key={`co-sk-${i}`} className="h-8 w-full" />
						))}
					</div>
				) : data.length === 0 ? (
					<p className="text-xs text-muted-foreground py-6 text-center">
						No country data yet
					</p>
				) : (
					<div className="space-y-2">
						{data.map((c, i) => {
							const pct = max > 0 ? Math.round((c.count / max) * 100) : 0;
							return (
								<div
									key={String(c.country ?? i)}
									className="flex items-center gap-3"
								>
									<span className="text-base shrink-0 w-5 text-center">
										{flagFromCountry(c.country)}
									</span>
									<span className="text-xs font-medium truncate min-w-0 flex-1">
										{c.country || "Unknown"}
									</span>
									<div className="hidden sm:block h-1 w-24 rounded-full bg-muted/50 overflow-hidden">
										<div
											className="h-full rounded-full bg-emerald-500/70 transition-all duration-500"
											style={{ width: `${pct}%` }}
										/>
									</div>
									<span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0 w-10 text-right">
										{c.count.toLocaleString()}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
