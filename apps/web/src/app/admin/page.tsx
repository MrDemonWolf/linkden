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
	Link2,
	Percent,
	Plus,
	Download,
	Clock,
	ExternalLink,
} from "lucide-react";
import {
	BarChart,
	Bar,
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
		label: "Clicks",
		color: "var(--primary, #0FACED)",
	},
};

function computeTrend(current: number, previous: number): { value: number; label: string } {
	if (previous === 0) {
		return { value: current > 0 ? 100 : 0, label: current > 0 ? "+100%" : "Stable" };
	}
	const pct = Math.round(((current - previous) / previous) * 100);
	return { value: pct, label: `${pct > 0 ? "+" : ""}${pct}%` };
}

function formatRelativeTime(dateStr: string | Date): string {
	const now = new Date();
	const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHrs = Math.floor(diffMins / 60);
	if (diffHrs < 24) return `${diffHrs}h ago`;
	const diffDays = Math.floor(diffHrs / 24);
	return `${diffDays}d ago`;
}

function extractDomain(url: string | null): string {
	if (!url) return "—";
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return url;
	}
}

export default function AdminDashboardPage() {
	const [period, setPeriod] = useState<Period>("7d");

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const unreadCount = useQuery(trpc.forms.unreadCount.queryOptions());
	const clicksOverTime = useQuery(trpc.analytics.clicksOverTime.queryOptions({ period }));
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	const recentForms = useQuery(trpc.forms.list.queryOptions({ limit: 5, offset: 0 }));

	const exportData = useQuery({
		...trpc.backup.export.queryOptions(),
		enabled: false,
	});

	const handleExport = async () => {
		try {
			const result = await exportData.refetch();
			if (result.data) {
				const blob = new Blob([JSON.stringify(result.data, null, 2)], {
					type: "application/json",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `linkden-backup-${new Date().toISOString().slice(0, 10)}.json`;
				a.click();
				URL.revokeObjectURL(url);
			}
		} catch {
			// silent
		}
	};

	const totalViews = (overview.data?.totalViews ?? 0) as number;
	const totalClicks = (overview.data?.totalClicks ?? 0) as number;
	const previousViews = (overview.data?.previousViews ?? 0) as number;
	const previousClicks = (overview.data?.previousClicks ?? 0) as number;
	const activeLinks = (overview.data?.activeLinks ?? 0) as number;

	const ctr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;
	const prevCtr = previousViews > 0 ? Math.round((previousClicks / previousViews) * 100) : 0;

	const clicksTrend = computeTrend(totalClicks, previousClicks);
	const ctrTrend = computeTrend(ctr, prevCtr);

	const clicksData = (clicksOverTime.data ?? []).map((d) => ({
		...d,
		label: new Date((d.date as string) || new Date()).toLocaleDateString(undefined, {
			weekday: "short",
		}),
	}));

	const submissions = recentForms.data ?? [];

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			<PageHeader
				title="Overview"
				description="Welcome back, here's what's happening today."
				actions={
					<>
						<Button variant="ghost" size="sm" onClick={handleExport} disabled={exportData.isFetching}>
							<Download className="mr-1.5 h-3.5 w-3.5" />
							Export Data
						</Button>
						<Link href="/admin/builder">
							<Button size="sm">
								<Plus className="mr-1.5 h-3.5 w-3.5" />
								Create New
							</Button>
						</Link>
					</>
				}
			/>

			{/* Stat cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={MousePointerClick}
					label="Total Clicks"
					value={totalClicks}
					iconColor="text-green-500"
					iconBg="bg-green-500/10"
					href="/admin/analytics"
					isLoading={overview.isLoading}
					trend={overview.data ? clicksTrend : null}
				/>
				<StatCard
					icon={Link2}
					label="Active Links"
					value={activeLinks}
					iconColor="text-primary"
					iconBg="bg-primary/10"
					href="/admin/builder"
					isLoading={overview.isLoading}
					subtitle="Published & enabled"
				/>
				<StatCard
					icon={Percent}
					label="CTR Average"
					value={`${ctr}%`}
					iconColor="text-violet-500"
					iconBg="bg-violet-500/10"
					isLoading={overview.isLoading}
					trend={overview.data ? ctrTrend : null}
				/>
				<StatCard
					icon={Mail}
					label="Unread Forms"
					value={unreadCount.data?.count ?? 0}
					iconColor="text-amber-500"
					iconBg="bg-amber-500/10"
					href="/admin/forms"
					isLoading={unreadCount.isLoading}
				/>
			</div>

			{/* Chart + Recent Events */}
			<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
				{/* Clicks chart */}
				<Card>
					<CardHeader className="flex-row items-center justify-between">
						<h2>
							<CardTitle className="flex items-center gap-1.5">
								<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
								Link Performance
							</CardTitle>
						</h2>
						<PeriodSelector value={period} onChange={setPeriod} />
					</CardHeader>
					<CardContent>
						{clicksOverTime.isLoading ? (
							<div className="flex h-56 items-end gap-1" aria-busy="true" role="status" aria-label="Loading chart data">
								{Array.from({ length: 7 }).map((_, i) => (
									<Skeleton
										key={`skeleton-${i}`}
										className="flex-1"
										style={{ height: `${20 + Math.random() * 80}%` }}
									/>
								))}
							</div>
						) : clicksData.length === 0 ? (
							<div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
								No clicks data yet
							</div>
						) : (
							<ChartContainer config={chartConfig} className="h-56 w-full" aria-label="Link performance" role="img">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={clicksData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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
										<Bar
											dataKey="count"
											fill="var(--color-count)"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						)}
					</CardContent>
				</Card>

				{/* Recent Events */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
							Recent Events
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-0">
						{recentForms.isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={`ev-skeleton-${i}`} className="h-12 w-full mb-1" />
							))
						) : submissions.length === 0 ? (
							<p className="text-xs text-muted-foreground py-4 text-center">No recent activity</p>
						) : (
							<>
								{submissions.map((sub) => (
									<div key={sub.id} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 mt-0.5">
											<Mail className="h-3 w-3 text-amber-500" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-xs font-medium truncate">
												{sub.blockTitle || "Contact Form"}
											</p>
											<p className="text-[11px] text-muted-foreground truncate">
												{sub.name} &mdash; {sub.subject || sub.message?.slice(0, 40) || "New submission"}
											</p>
										</div>
										<span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
											{formatRelativeTime(sub.createdAt)}
										</span>
									</div>
								))}
								<div className="pt-2">
									<Link href="/admin/forms">
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

			{/* Top Performing Links */}
			<Card>
				<CardHeader className="flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-1.5">
						<Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Top Performing Links
					</CardTitle>
					<Link href="/admin/analytics">
						<Button variant="ghost" size="xs" className="text-muted-foreground">
							View all
							<ArrowUpRight className="ml-1 h-3 w-3" />
						</Button>
					</Link>
				</CardHeader>
				<CardContent>
					{topLinks.isLoading ? (
						Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={`tbl-skeleton-${i}`} className="h-10 w-full mb-1" />
						))
					) : !topLinks.data?.length ? (
						<p className="text-xs text-muted-foreground py-4 text-center">No clicks yet</p>
					) : (
						<table className="w-full">
							<thead>
								<tr className="border-b border-border/40">
									<th className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2 text-left w-8">#</th>
									<th className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2 text-left">Link Title</th>
									<th className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2 text-left hidden sm:table-cell">Destination</th>
									<th className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2 text-right w-20">Clicks</th>
								</tr>
							</thead>
							<tbody>
								{topLinks.data.map((link, i) => (
									<tr key={String(link.id ?? i)} className="border-b border-border/20 last:border-0">
										<td className="py-2.5 text-xs text-muted-foreground">{i + 1}</td>
										<td className="py-2.5">
											<p className="text-xs font-medium truncate max-w-[200px]">{(link.title as string | null) || "Untitled"}</p>
										</td>
										<td className="py-2.5 hidden sm:table-cell">
											<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
												<ExternalLink className="h-2.5 w-2.5" />
												{extractDomain((link.url as string) || "")}
											</span>
										</td>
										<td className="py-2.5 text-right">
											<span className="text-xs font-mono tabular-nums font-medium">
												{(link.clicks as number).toLocaleString()}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
