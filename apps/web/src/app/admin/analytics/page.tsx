"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Eye,
	MousePointerClick,
	Globe,
	Link as LinkIcon,
	ArrowUpRight,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type Period = "7d" | "30d" | "90d";

const chartConfig: ChartConfig = {
	count: {
		label: "Views",
		color: "var(--primary, #0FACED)",
	},
};

export default function AnalyticsPage() {
	const [period, setPeriod] = useState<Period>("7d");

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const viewsOverTime = useQuery(
		trpc.analytics.viewsOverTime.queryOptions({ period }),
	);
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	const referrers = useQuery(trpc.analytics.referrers.queryOptions({ period }));
	const countries = useQuery(trpc.analytics.countries.queryOptions({ period }));

	const viewsData = (viewsOverTime.data ?? []).map((d) => ({
		...d,
		label: new Date(d.date).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		}),
	}));

	const periods: { value: Period; label: string }[] = [
		{ value: "7d", label: "7 days" },
		{ value: "30d", label: "30 days" },
		{ value: "90d", label: "90 days" },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="sticky top-0 z-20 mt-1 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-lg font-semibold">Analytics</h1>
					<p className="text-xs text-muted-foreground">
						Track your page performance
					</p>
				</div>
				<div className="flex gap-1">
					{periods.map((p) => (
						<Button
							key={p.value}
							variant={period === p.value ? "default" : "outline"}
							size="xs"
							onClick={() => setPeriod(p.value)}
							aria-pressed={period === p.value}
						>
							{p.label}
						</Button>
					))}
				</div>
			</div>

			{/* Stat cards */}
			<div className="grid gap-3 sm:grid-cols-2">
				<Card size="sm">
					<CardContent className="flex items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/10">
							<Eye className="h-4 w-4 text-primary" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Total Views</p>
							{overview.isLoading ? (
								<Skeleton className="mt-1 h-5 w-16" />
							) : (
								<p className="text-lg font-semibold">
									{(overview.data?.totalViews ?? 0).toLocaleString()}
								</p>
							)}
						</div>
					</CardContent>
				</Card>
				<Card size="sm">
					<CardContent className="flex items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center bg-green-500/10">
							<MousePointerClick className="h-4 w-4 text-green-500" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Total Clicks</p>
							{overview.isLoading ? (
								<Skeleton className="mt-1 h-5 w-16" />
							) : (
								<p className="text-lg font-semibold">
									{(overview.data?.totalClicks ?? 0).toLocaleString()}
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Views over time chart */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-1.5">
						<Eye className="h-4 w-4 text-muted-foreground" />
						Views over time
					</CardTitle>
				</CardHeader>
				<CardContent>
					{viewsOverTime.isLoading ? (
						<div className="flex h-40 items-end gap-1">
							{Array.from({ length: 7 }).map((_, i) => (
								<Skeleton
									key={`sk-${i}`}
									className="flex-1"
									style={{ height: `${20 + Math.random() * 80}%` }}
								/>
							))}
						</div>
					) : viewsData.length === 0 ? (
						<div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
							No data for this period
						</div>
					) : (
						<ChartContainer config={chartConfig} className="h-40 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={viewsData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
									<defs>
										<linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.3} />
											<stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
										</linearGradient>
									</defs>
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 10 }}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 10 }}
										allowDecimals={false}
									/>
									<Tooltip
										content={
											<ChartTooltipContent
												labelFormatter={(label) => label}
											/>
										}
									/>
									<Area
										type="monotone"
										dataKey="count"
										stroke="var(--color-count)"
										strokeWidth={2}
										fill="url(#viewsGradient)"
										dot={false}
										activeDot={{ r: 4, strokeWidth: 2 }}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			{/* Bottom grid */}
			<div className="grid gap-4 md:grid-cols-3">
				{/* Top Links */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<LinkIcon className="h-4 w-4 text-muted-foreground" />
							Top Links
						</CardTitle>
					</CardHeader>
					<CardContent>
						{topLinks.isLoading ? (
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`tl-${i}`} className="h-6" />
								))}
							</div>
						) : !topLinks.data?.length ? (
							<p className="text-xs text-muted-foreground">No click data yet</p>
						) : (
							<div className="space-y-2">
								{topLinks.data.map((link, i) => (
									<div
										key={link.blockId ?? i}
										className="flex items-center justify-between text-xs"
									>
										<span className="min-w-0 truncate">
											{link.blockTitle || link.blockUrl || "Unknown"}
										</span>
										<span className="ml-2 shrink-0 font-medium">
											{link.count}
										</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Referrers */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<ArrowUpRight className="h-4 w-4 text-muted-foreground" />
							Referrers
						</CardTitle>
					</CardHeader>
					<CardContent>
						{referrers.isLoading ? (
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`ref-${i}`} className="h-6" />
								))}
							</div>
						) : !referrers.data?.length ? (
							<p className="text-xs text-muted-foreground">
								No referrer data yet
							</p>
						) : (
							<div className="space-y-2">
								{referrers.data.map((ref, i) => (
									<div
										key={ref.referrer ?? i}
										className="flex items-center justify-between text-xs"
									>
										<span className="min-w-0 truncate">
											{ref.referrer || "Direct"}
										</span>
										<span className="ml-2 shrink-0 font-medium">
											{ref.count}
										</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Countries */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<Globe className="h-4 w-4 text-muted-foreground" />
							Countries
						</CardTitle>
					</CardHeader>
					<CardContent>
						{countries.isLoading ? (
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`co-${i}`} className="h-6" />
								))}
							</div>
						) : !countries.data?.length ? (
							<p className="text-xs text-muted-foreground">
								No country data yet
							</p>
						) : (
							<div className="space-y-2">
								{countries.data.map((c, i) => (
									<div
										key={c.country ?? i}
										className="flex items-center justify-between text-xs"
									>
										<span>{c.country || "Unknown"}</span>
										<span className="font-medium">{c.count}</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
