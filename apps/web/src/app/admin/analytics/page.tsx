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
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { PeriodSelector, type Period } from "@/components/admin/period-selector";

const chartConfig: ChartConfig = {
	count: {
		label: "Views",
		color: "var(--primary, #0FACED)",
	},
};

export default function AnalyticsPage() {
	const [period, setPeriod] = useState<Period>("7d");

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const viewsOverTime = useQuery(trpc.analytics.viewsOverTime.queryOptions({ period }));
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	const referrers = useQuery(trpc.analytics.referrers.queryOptions({ period }));
	const countries = useQuery(trpc.analytics.countries.queryOptions({ period }));

	const viewsData = (viewsOverTime.data ?? []).map((d) => ({
		...d,
		label: new Date(d.date as string).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		}),
	}));

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			<PageHeader
				title="Analytics"
				description="Track your page performance"
			/>

			{/* Stat cards */}
			<div className="grid gap-4 sm:grid-cols-2">
				<StatCard
					icon={Eye}
					label="Total Views"
					value={(overview.data?.totalViews ?? 0) as number}
					isLoading={overview.isLoading}
				/>
				<StatCard
					icon={MousePointerClick}
					label="Total Clicks"
					value={(overview.data?.totalClicks ?? 0) as number}
					iconColor="text-green-500"
					iconBg="bg-green-500/10"
					isLoading={overview.isLoading}
				/>
			</div>

			{/* Views over time chart */}
			<Card>
				<CardHeader className="flex-row items-center justify-between">
					<h2>
						<CardTitle className="flex items-center gap-1.5">
							<Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
							Views over time
						</CardTitle>
					</h2>
					<PeriodSelector value={period} onChange={setPeriod} />
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
						<ChartContainer config={chartConfig} className="h-40 w-full" aria-label="Views over time chart" role="img">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={viewsData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
									<defs>
										<linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.3} />
											<stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
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
						<h2>
							<CardTitle className="flex items-center gap-1.5">
								<LinkIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
								Top Links
							</CardTitle>
						</h2>
					</CardHeader>
					<CardContent className="min-h-[200px]">
						{topLinks.isLoading ? (
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`tl-${i}`} className="h-6" />
								))}
							</div>
						) : !topLinks.data?.length ? (
							<p className="text-xs text-muted-foreground">No click data yet</p>
						) : (
							<div>
								{topLinks.data.map((link, i) => (
									<div
										key={String(link.id ?? i)}
										className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
									>
										<div className="flex items-center gap-2 min-w-0">
											<span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
											<span className="truncate text-xs">
												{(link.title as string | null) || (link.url as string | null) || "Unknown"}
											</span>
										</div>
										<span className="ml-4 shrink-0 text-xs font-mono tabular-nums text-muted-foreground">
											{link.clicks as number}
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
						<h2>
							<CardTitle className="flex items-center gap-1.5">
								<ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
								Referrers
							</CardTitle>
						</h2>
					</CardHeader>
					<CardContent className="min-h-[200px]">
						{referrers.isLoading ? (
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`ref-${i}`} className="h-6" />
								))}
							</div>
						) : !referrers.data?.length ? (
							<p className="text-xs text-muted-foreground">No referrer data yet</p>
						) : (
							<div>
								{referrers.data.map((ref, i) => (
									<div
										key={String(ref.referrer ?? i)}
										className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
									>
										<div className="flex items-center gap-2 min-w-0">
											<span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
											<span className="truncate text-xs">
												{(ref.referrer as string | null) || "Direct"}
											</span>
										</div>
										<span className="ml-4 shrink-0 text-xs font-mono tabular-nums text-muted-foreground">
											{ref.count as number}
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
						<h2>
							<CardTitle className="flex items-center gap-1.5">
								<Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
								Countries
							</CardTitle>
						</h2>
					</CardHeader>
					<CardContent className="min-h-[200px]">
						{countries.isLoading ? (
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`co-${i}`} className="h-6" />
								))}
							</div>
						) : !countries.data?.length ? (
							<p className="text-xs text-muted-foreground">No country data yet</p>
						) : (
							<div>
								{countries.data.map((c, i) => (
									<div
										key={String(c.country ?? i)}
										className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
									>
										<div className="flex items-center gap-2 min-w-0">
											<span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
											<span className="text-xs">{(c.country as string | null) || "Unknown"}</span>
										</div>
										<span className="text-xs font-mono tabular-nums text-muted-foreground">{c.count as number}</span>
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
