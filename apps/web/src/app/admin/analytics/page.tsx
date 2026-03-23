"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Eye,
	MousePointerClick,
	Percent,
	Users,
	Trophy,
	ArrowUpRight,
	Globe,
	ExternalLink,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from "recharts";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ChartContainer,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { PeriodSelector, type Period } from "@/components/admin/period-selector";

const chartConfig: ChartConfig = {
	views: {
		label: "Views",
		color: "var(--primary, #0FACED)",
	},
	clicks: {
		label: "Clicks",
		color: "#22c55e",
	},
};

function computeTrend(
	current: number,
	previous: number,
): { value: number; label: string } {
	if (previous === 0) {
		return {
			value: current > 0 ? 100 : 0,
			label: current > 0 ? "+100%" : "Stable",
		};
	}
	const pct = Math.round(((current - previous) / previous) * 100);
	return { value: pct, label: `${pct > 0 ? "+" : ""}${pct}%` };
}

function extractDomain(url: string | null): string {
	if (!url) return "--";
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return url;
	}
}

export default function AnalyticsPage() {
	const [period, setPeriod] = useState<Period>("7d");

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const viewsOverTime = useQuery(
		trpc.analytics.viewsOverTime.queryOptions({ period }),
	);
	const clicksOverTime = useQuery(
		trpc.analytics.clicksOverTime.queryOptions({ period }),
	);
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	const referrers = useQuery(
		trpc.analytics.referrers.queryOptions({ period }),
	);
	const countries = useQuery(
		trpc.analytics.countries.queryOptions({ period }),
	);

	// Merge views + clicks into a single time-series dataset
	const chartData = useMemo(() => {
		const viewsMap = new Map<string, number>();
		const clicksMap = new Map<string, number>();

		for (const d of viewsOverTime.data ?? []) {
			viewsMap.set(d.date as string, d.count as number);
		}
		for (const d of clicksOverTime.data ?? []) {
			clicksMap.set(d.date as string, d.count as number);
		}

		const allDates = new Set([...viewsMap.keys(), ...clicksMap.keys()]);
		const sorted = [...allDates].sort();

		return sorted.map((date) => ({
			date,
			label: new Date(date).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
			}),
			views: viewsMap.get(date) ?? 0,
			clicks: clicksMap.get(date) ?? 0,
		}));
	}, [viewsOverTime.data, clicksOverTime.data]);

	const totalViews = (overview.data?.totalViews ?? 0) as number;
	const totalClicks = (overview.data?.totalClicks ?? 0) as number;
	const previousViews = (overview.data?.previousViews ?? 0) as number;
	const previousClicks = (overview.data?.previousClicks ?? 0) as number;
	const totalConnections = (overview.data?.totalConnections ?? 0) as number;

	const ctr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;
	const prevCtr =
		previousViews > 0
			? Math.round((previousClicks / previousViews) * 100)
			: 0;

	const viewsTrend = computeTrend(totalViews, previousViews);
	const clicksTrend = computeTrend(totalClicks, previousClicks);
	const ctrTrend = computeTrend(ctr, prevCtr);

	const isAllTime = period === "all";
	const periodLabel =
		period === "7d"
			? "7 days"
			: period === "30d"
				? "30 days"
				: period === "90d"
					? "90 days"
					: "all time";

	const chartLoading = viewsOverTime.isLoading || clicksOverTime.isLoading;

	// Top 5 links for leaderboard
	const top5Links = (topLinks.data ?? []).slice(0, 5);
	const maxClicks = top5Links.length > 0 ? (top5Links[0]?.clicks as number) : 1;

	// Total referrer count for percentage bars
	const totalReferrerCount = (referrers.data ?? []).reduce(
		(sum, r) => sum + (r.count as number),
		0,
	);

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<PageHeader
					title="Analytics"
					description={`Performance overview for the last ${periodLabel}`}
				/>
				<PeriodSelector value={period} onChange={setPeriod} />
			</div>

			{/* Stat cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={Eye}
					label="Page Views"
					value={totalViews}
					isLoading={overview.isLoading}
					trend={!isAllTime && overview.data ? viewsTrend : null}
					subtitle={isAllTime ? "All time" : `Last ${periodLabel}`}
				/>
				<StatCard
					icon={MousePointerClick}
					label="Link Clicks"
					value={totalClicks}
					iconColor="text-green-500"
					iconBg="bg-green-500/10"
					isLoading={overview.isLoading}
					trend={!isAllTime && overview.data ? clicksTrend : null}
					subtitle={isAllTime ? "All time" : `Last ${periodLabel}`}
				/>
				<StatCard
					icon={Percent}
					label="CTR"
					value={`${ctr}%`}
					iconColor="text-violet-500"
					iconBg="bg-violet-500/10"
					isLoading={overview.isLoading}
					trend={!isAllTime && overview.data ? ctrTrend : null}
					subtitle="Click-through rate"
				/>
				<StatCard
					icon={Users}
					label="Connections"
					value={totalConnections}
					iconColor="text-amber-500"
					iconBg="bg-amber-500/10"
					isLoading={overview.isLoading}
					subtitle="Form submissions"
				/>
			</div>

			{/* Time-series chart: Views & Clicks */}
			<Card>
				<CardHeader className="flex-row items-center justify-between">
					<h2>
						<CardTitle className="flex items-center gap-1.5">
							<Eye
								className="h-4 w-4 text-muted-foreground"
								aria-hidden="true"
							/>
							Views &amp; Clicks Over Time
						</CardTitle>
					</h2>
				</CardHeader>
				<CardContent>
					{chartLoading ? (
						<div
							className="flex h-56 items-end gap-1"
							aria-busy="true"
							role="status"
							aria-label="Loading chart data"
						>
							{Array.from({ length: 7 }).map((_, i) => (
								<Skeleton
									key={`sk-${i}`}
									className="flex-1"
									style={{ height: `${20 + Math.random() * 80}%` }}
								/>
							))}
						</div>
					) : chartData.length === 0 ? (
						<div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
							No data for this period
						</div>
					) : (
						<ChartContainer
							config={chartConfig}
							className="h-56 w-full"
							aria-label="Views and clicks over time chart"
							role="img"
						>
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									data={chartData}
									margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
								>
									<defs>
										<linearGradient
											id="viewsGradient"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="0%"
												stopColor="var(--color-views)"
												stopOpacity={0.3}
											/>
											<stop
												offset="100%"
												stopColor="var(--color-views)"
												stopOpacity={0.02}
											/>
										</linearGradient>
										<linearGradient
											id="clicksGradient"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="0%"
												stopColor="var(--color-clicks)"
												stopOpacity={0.3}
											/>
											<stop
												offset="100%"
												stopColor="var(--color-clicks)"
												stopOpacity={0.02}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="currentColor"
										strokeOpacity={0.1}
									/>
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
									<Legend
										verticalAlign="top"
										height={28}
										iconType="circle"
										iconSize={8}
										wrapperStyle={{ fontSize: 11 }}
									/>
									<Area
										type="monotone"
										dataKey="views"
										name="Views"
										stroke="var(--color-views)"
										strokeWidth={2}
										fill="url(#viewsGradient)"
										dot={false}
										activeDot={{ r: 4, strokeWidth: 2 }}
									/>
									<Area
										type="monotone"
										dataKey="clicks"
										name="Clicks"
										stroke="var(--color-clicks)"
										strokeWidth={2}
										fill="url(#clicksGradient)"
										dot={false}
										activeDot={{ r: 4, strokeWidth: 2 }}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			{/* Top 5 Links Leaderboard + Referrer Breakdown */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Top 5 Links */}
				<Card>
					<CardHeader>
						<h2>
							<CardTitle className="flex items-center gap-1.5">
								<Trophy
									className="h-4 w-4 text-amber-500"
									aria-hidden="true"
								/>
								Top 5 Links
							</CardTitle>
						</h2>
					</CardHeader>
					<CardContent>
						{topLinks.isLoading ? (
							<div className="space-y-3">
								{Array.from({ length: 5 }).map((_, i) => (
									<Skeleton key={`tl-${i}`} className="h-12" />
								))}
							</div>
						) : top5Links.length === 0 ? (
							<p className="text-xs text-muted-foreground py-8 text-center">
								No click data yet
							</p>
						) : (
							<div className="space-y-3">
								{top5Links.map((link, i) => {
									const clicks = link.clicks as number;
									const barWidth = maxClicks > 0 ? (clicks / maxClicks) * 100 : 0;
									const medal =
										i === 0
											? "text-amber-400"
											: i === 1
												? "text-zinc-400"
												: i === 2
													? "text-amber-700"
													: "text-muted-foreground";

									return (
										<div
											key={String(link.id ?? i)}
											className="group relative"
										>
											<div className="flex items-center gap-3 py-2">
												<span
													className={`text-sm font-bold w-6 text-center tabular-nums ${medal}`}
												>
													{i + 1}
												</span>
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between gap-2 mb-1">
														<p className="text-xs font-medium truncate">
															{(link.title as string | null) || "Untitled"}
														</p>
														<span className="text-xs font-mono tabular-nums font-semibold shrink-0">
															{clicks.toLocaleString()} clicks
														</span>
													</div>
													{/* Progress bar */}
													<div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
														<div
															className="h-full rounded-full bg-primary/70 transition-all duration-500"
															style={{ width: `${barWidth}%` }}
														/>
													</div>
													<p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
														<ExternalLink className="h-2.5 w-2.5 shrink-0" />
														{extractDomain(
															(link.url as string | null) || null,
														)}
													</p>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Referrer Breakdown */}
				<Card>
					<CardHeader>
						<h2>
							<CardTitle className="flex items-center gap-1.5">
								<ArrowUpRight
									className="h-4 w-4 text-muted-foreground"
									aria-hidden="true"
								/>
								Referrer Sources
							</CardTitle>
						</h2>
					</CardHeader>
					<CardContent>
						{referrers.isLoading ? (
							<div className="space-y-3">
								{Array.from({ length: 5 }).map((_, i) => (
									<Skeleton key={`ref-${i}`} className="h-8" />
								))}
							</div>
						) : !referrers.data?.length ? (
							<p className="text-xs text-muted-foreground py-8 text-center">
								No referrer data yet
							</p>
						) : (
							<div className="space-y-2.5">
								{referrers.data.map((ref, i) => {
									const refCount = ref.count as number;
									const pct =
										totalReferrerCount > 0
											? Math.round((refCount / totalReferrerCount) * 100)
											: 0;

									return (
										<div key={String(ref.referrer ?? i)}>
											<div className="flex items-center justify-between mb-1">
												<div className="flex items-center gap-2 min-w-0">
													<span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">
														{i + 1}.
													</span>
													<span className="truncate text-xs font-medium">
														{(ref.referrer as string | null) || "Direct"}
													</span>
												</div>
												<div className="flex items-center gap-2 shrink-0">
													<span className="text-[10px] text-muted-foreground">
														{pct}%
													</span>
													<span className="text-xs font-mono tabular-nums text-muted-foreground">
														{refCount.toLocaleString()}
													</span>
												</div>
											</div>
											<div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
												<div
													className="h-full rounded-full bg-blue-500/60 transition-all duration-500"
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
			</div>

			{/* Countries */}
			<Card>
				<CardHeader>
					<h2>
						<CardTitle className="flex items-center gap-1.5">
							<Globe
								className="h-4 w-4 text-muted-foreground"
								aria-hidden="true"
							/>
							Visitor Countries
						</CardTitle>
					</h2>
				</CardHeader>
				<CardContent>
					{countries.isLoading ? (
						<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={`co-${i}`} className="h-10" />
							))}
						</div>
					) : !countries.data?.length ? (
						<p className="text-xs text-muted-foreground py-6 text-center">
							No country data yet
						</p>
					) : (
						<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
							{countries.data.map((c, i) => (
								<div
									key={String(c.country ?? i)}
									className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
								>
									<div className="flex items-center gap-2 min-w-0">
										<span className="text-xs text-muted-foreground shrink-0 tabular-nums">
											#{i + 1}
										</span>
										<span className="text-xs font-medium truncate">
											{(c.country as string | null) || "Unknown"}
										</span>
									</div>
									<span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0 ml-2">
										{(c.count as number).toLocaleString()}
									</span>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
