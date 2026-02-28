"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
	Eye,
	MousePointerClick,
	Mail,
	ExternalLink,
	ArrowUpRight,
	BarChart3,
	Blocks,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
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

const chartConfig: ChartConfig = {
	count: {
		label: "Views",
		color: "var(--primary, #0FACED)",
	},
};

export default function AdminDashboardPage() {
	const overview = useQuery(trpc.analytics.overview.queryOptions({ period: "7d" }));
	const unreadCount = useQuery(trpc.contacts.unreadCount.queryOptions());
	const versionCheck = useQuery(trpc.version.checkUpdate.queryOptions());
	const viewsOverTime = useQuery(
		trpc.analytics.viewsOverTime.queryOptions({ period: "7d" }),
	);

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
			label: "Unread Contacts",
			value: unreadCount.data?.count ?? 0,
			icon: Mail,
			color: "text-orange-500",
			bg: "bg-orange-500/10",
			href: "/admin/contacts" as const,
		},
	];

	const viewsData = (viewsOverTime.data ?? []).map((d) => ({
		...d,
		label: new Date(d.date).toLocaleDateString(undefined, {
			weekday: "short",
		}),
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Dashboard"
				description="Overview of your LinkDen page"
				actions={
					<>
						<Link href="/admin/builder">
							<Button variant="outline" size="sm">
								<Blocks className="mr-1.5 h-3.5 w-3.5" />
								Builder
							</Button>
						</Link>
						<a href="/" target="_blank" rel="noopener noreferrer">
							<Button size="sm">
								<ExternalLink className="mr-1.5 h-3.5 w-3.5" />
								View Page
							</Button>
						</a>
					</>
				}
			/>

			{/* Stat cards */}
			<div className="grid gap-3 sm:grid-cols-3">
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

			{/* Views chart */}
			<Card>
				<CardHeader className="flex-row items-center justify-between">
					<h2>
						<CardTitle className="flex items-center gap-1.5">
							<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
							Views last 7 days
						</CardTitle>
					</h2>
					<Link href="/admin/analytics">
						<Button variant="ghost" size="xs">
							View all
							<ArrowUpRight className="ml-1 h-3 w-3" />
						</Button>
					</Link>
				</CardHeader>
				<CardContent>
					{viewsOverTime.isLoading ? (
						<div className="flex h-32 items-end gap-1" aria-busy="true" role="status" aria-label="Loading chart data">
							{Array.from({ length: 7 }).map((_, i) => (
								<Skeleton
									key={`skeleton-${i}`}
									className="flex-1"
									style={{ height: `${20 + Math.random() * 80}%` }}
								/>
							))}
						</div>
					) : viewsData.length === 0 ? (
						<div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
							No views data yet
						</div>
					) : (
						<ChartContainer config={chartConfig} className="h-32 w-full" aria-label="Views over the last 7 days" role="img">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={viewsData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
									<defs>
										<linearGradient id="dashboardViewsGradient" x1="0" y1="0" x2="0" y2="1">
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

			{/* Version info */}
			<Card size="sm">
				<CardContent className="flex items-center justify-between">
					<div>
						<p className="text-xs text-muted-foreground">Version</p>
						<p className="text-sm font-medium">
							{versionCheck.data?.current ?? "0.1.0"}
						</p>
					</div>
					{versionCheck.data?.hasUpdate ? (
						<a
							href={versionCheck.data.releaseUrl ?? "#"}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Button size="sm" variant="outline">
								Update to {versionCheck.data.latest}
								<ExternalLink className="ml-1.5 h-3 w-3" />
							</Button>
						</a>
					) : (
						<span className="text-xs text-muted-foreground">Up to date</span>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
