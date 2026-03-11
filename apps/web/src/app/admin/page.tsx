"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
	Eye,
	MousePointerClick,
	Mail,
	ArrowUpRight,
	BarChart3,
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
import { Button } from "@/components/ui/button";
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

export default function AdminDashboardPage() {
	const [period, setPeriod] = useState<Period>("7d");

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const unreadCount = useQuery(trpc.forms.unreadCount.queryOptions());
	const viewsOverTime = useQuery(trpc.analytics.viewsOverTime.queryOptions({ period }));
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));

	const stats = [
		{
			label: "Total Views",
			value: overview.data?.totalViews ?? 0,
			icon: Eye,
			color: "text-primary",
			bg: "bg-primary/10",
		},
		{
			label: "Total Clicks",
			value: overview.data?.totalClicks ?? 0,
			icon: MousePointerClick,
			color: "text-green-500",
			bg: "bg-green-500/10",
		},
		{
			label: "Unread Forms",
			value: unreadCount.data?.count ?? 0,
			icon: Mail,
			color: "text-amber-500",
			bg: "bg-amber-500/10",
			href: "/admin/forms" as const,
		},
	];

	const viewsData = (viewsOverTime.data ?? []).map((d) => ({
		...d,
		label: new Date(d.date).toLocaleDateString(undefined, {
			weekday: "short",
		}),
	}));

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			<PageHeader
				title="Dashboard"
				description="Overview of your LinkDen page"
			/>

			{/* Stat cards */}
			<div className="grid gap-4 sm:grid-cols-3">
				{stats.map((stat) => (
					<StatCard
						key={stat.label}
						icon={stat.icon}
						label={stat.label}
						value={stat.value}
						iconColor={stat.color}
						iconBg={stat.bg}
						href={stat.href}
						isLoading={overview.isLoading}
					/>
				))}
			</div>

			{/* Chart + Top Links */}
			<div className="grid gap-4 lg:grid-cols-[1fr_280px]">
				{/* Views chart */}
				<Card>
					<CardHeader className="flex-row items-center justify-between">
						<h2>
							<CardTitle className="flex items-center gap-1.5">
								<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
								Views over time
							</CardTitle>
						</h2>
						<PeriodSelector value={period} onChange={setPeriod} />
					</CardHeader>
					<CardContent>
						{viewsOverTime.isLoading ? (
							<div className="flex h-56 items-end gap-1" aria-busy="true" role="status" aria-label="Loading chart data">
								{Array.from({ length: 7 }).map((_, i) => (
									<Skeleton
										key={`skeleton-${i}`}
										className="flex-1"
										style={{ height: `${20 + Math.random() * 80}%` }}
									/>
								))}
							</div>
						) : viewsData.length === 0 ? (
							<div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
								No views data yet
							</div>
						) : (
							<ChartContainer config={chartConfig} className="h-56 w-full" aria-label="Views over time" role="img">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={viewsData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
										<defs>
											<linearGradient id="dashboardViewsGradient" x1="0" y1="0" x2="0" y2="1">
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
											fill="url(#dashboardViewsGradient)"
											dot={false}
											activeDot={{ r: 4, strokeWidth: 2 }}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</ChartContainer>
						)}
					</CardContent>
				</Card>

				{/* Top Links */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<MousePointerClick className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
							Top Links
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-0">
						{topLinks.isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={`tl-skeleton-${i}`} className="h-8 w-full mb-1" />
							))
						) : !topLinks.data?.length ? (
							<p className="text-xs text-muted-foreground py-4 text-center">No clicks yet</p>
						) : (
							<>
								{topLinks.data.slice(0, 6).map((link, i) => (
									<div key={link.id} className="flex items-center gap-2 py-2 border-b border-border/40 last:border-0">
										<span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
										<p className="truncate flex-1 text-xs">{link.title || "Untitled"}</p>
										<span className="shrink-0 text-xs font-mono tabular-nums text-muted-foreground">
											{link.clicks.toLocaleString()}
										</span>
									</div>
								))}
								<div className="pt-2">
									<Link href="/admin/analytics">
										<Button variant="ghost" size="xs" className="w-full justify-center text-muted-foreground">
											View all
											<ArrowUpRight className="ml-1 h-3 w-3" />
										</Button>
									</Link>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
