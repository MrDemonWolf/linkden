"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
	Eye,
	MousePointerClick,
	Users,
	ArrowUpRight,
	BarChart3,
	Percent,
	Clock,
	ExternalLink,
	Plus,
	Share2,
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
import { authClient } from "@/lib/auth-client";
import { relativeTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PeriodSelector, type Period } from "@/components/admin/period-selector";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

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

function extractDomain(url: string | null): string {
	if (!url) return "\u2014";
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return url;
	}
}

function getGreeting(hour: number): string {
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}

export default function AdminDashboardPage() {
	const [period, setPeriod] = useState<Period>("7d");
	const { data: session } = authClient.useSession();
	const { getAnimationProps } = useEntranceAnimation({ baseDelay: 60, stagger: 70 });

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const unreadCount = useQuery(trpc.forms.unreadCount.queryOptions());
	const clicksOverTime = useQuery(trpc.analytics.clicksOverTime.queryOptions({ period }));
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	const recentClicks = useQuery(trpc.analytics.recentClicks.queryOptions());
	const timezoneQuery = useQuery(trpc.settings.get.queryOptions({ key: "timezone" }));

	const timezone = timezoneQuery.data?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;

	const { greeting, firstName, formattedDate } = useMemo(() => {
		const now = new Date();
		const name = session?.user?.name ?? "";
		const first = name.split(" ")[0] || "there";
		try {
			const hour = new Date(
				now.toLocaleString("en-US", { timeZone: timezone }),
			).getHours();
			const date = now.toLocaleDateString("en-US", {
				timeZone: timezone,
				weekday: "short",
				month: "short",
				day: "numeric",
			});
			return { greeting: getGreeting(hour), firstName: first, formattedDate: date };
		} catch {
			// Invalid timezone from DB — fall back to browser default
			const hour = now.getHours();
			const date = now.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			});
			return { greeting: getGreeting(hour), firstName: first, formattedDate: date };
		}
	}, [session, timezone]);

	const totalViews = (overview.data?.totalViews ?? 0) as number;
	const totalClicks = (overview.data?.totalClicks ?? 0) as number;
	const previousViews = (overview.data?.previousViews ?? 0) as number;
	const previousClicks = (overview.data?.previousClicks ?? 0) as number;

	const ctr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;
	const prevCtr = previousViews > 0 ? Math.round((previousClicks / previousViews) * 100) : 0;

	const viewsTrend = computeTrend(totalViews, previousViews);
	const clicksTrend = computeTrend(totalClicks, previousClicks);
	const ctrTrend = computeTrend(ctr, prevCtr);

	const periodLabel =
		period === "7d" ? "7" : period === "30d" ? "30" : "90";

	const clicksData = (clicksOverTime.data ?? []).map((d) => ({
		...d,
		label: new Date((d.date as string) || new Date()).toLocaleDateString(undefined, {
			weekday: "short",
		}),
	}));

	const clicks = recentClicks.data ?? [];

	const statCards = [
		{
			icon: Eye,
			label: "Page Views",
			value: totalViews,
			gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
			iconColor: "text-blue-400",
			iconGlow: "shadow-blue-500/20",
			borderAccent: "border-blue-500/20",
			isLoading: overview.isLoading,
			trend: overview.data ? viewsTrend : null,
			subtitle: `Last ${periodLabel} days`,
			href: "/admin/analytics",
		},
		{
			icon: MousePointerClick,
			label: "Link Clicks",
			value: totalClicks,
			gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
			iconColor: "text-emerald-400",
			iconGlow: "shadow-emerald-500/20",
			borderAccent: "border-emerald-500/20",
			isLoading: overview.isLoading,
			trend: overview.data ? clicksTrend : null,
			subtitle: `Last ${periodLabel} days`,
			href: "/admin/analytics",
		},
		{
			icon: Percent,
			label: "CTR",
			value: `${ctr}%`,
			gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
			iconColor: "text-violet-400",
			iconGlow: "shadow-violet-500/20",
			borderAccent: "border-violet-500/20",
			isLoading: overview.isLoading,
			trend: overview.data ? ctrTrend : null,
			subtitle: `Last ${periodLabel} days`,
		},
		{
			icon: Users,
			label: "Connections",
			value: unreadCount.data?.count ?? 0,
			gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
			iconColor: "text-amber-400",
			iconGlow: "shadow-amber-500/20",
			borderAccent: "border-amber-500/20",
			isLoading: unreadCount.isLoading,
			subtitle: "Unread submissions",
			href: "/admin/forms",
		},
	];

	return (
		<div className="space-y-6">
			{/* Greeting header */}
			<div {...getAnimationProps(0)} className="pb-2 md:pb-4 flex items-center gap-3 flex-wrap">
				<h1 className="text-2xl font-bold tracking-tight">
					<span className="text-base font-medium text-muted-foreground">{greeting}, </span>
					{firstName}
				</h1>
				<span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
					{formattedDate}
				</span>
			</div>

			{/* Quick Actions */}
			<div {...getAnimationProps(1)}>
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
				<div className="flex flex-wrap gap-3">
					<Link href="/admin/builder">
						<Button
							variant="outline"
							className="gap-2 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 transition-all"
						>
							<Plus className="h-4 w-4" />
							Add Block
						</Button>
					</Link>
					<Link href="/" target="_blank" rel="noopener noreferrer">
						<Button
							variant="outline"
							className="gap-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 transition-all"
						>
							<ExternalLink className="h-4 w-4" />
							View Page
						</Button>
					</Link>
					<Button
						variant="outline"
						className="gap-2 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/50 text-violet-400 hover:text-violet-300 transition-all"
						onClick={() => {
							navigator.clipboard.writeText(window.location.origin);
						}}
					>
						<Share2 className="h-4 w-4" />
						Share Link
					</Button>
				</div>
			</div>

			{/* Stat Cards */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				{statCards.map((card, index) => {
					const Icon = card.icon;
					return (
						<div key={card.label} {...getAnimationProps(index + 2)}>
							<Card
								size="sm"
								className={`group relative overflow-hidden border ${card.borderAccent} backdrop-blur-sm`}
							>
								{/* Gradient background overlay */}
								<div
									className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`}
									aria-hidden="true"
								/>
								<CardContent className="relative flex items-center gap-3">
									<div
										className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/50 shadow-lg ${card.iconGlow}`}
										aria-hidden="true"
									>
										<Icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-[11px] text-muted-foreground font-medium">{card.label}</p>
										{card.isLoading ? (
											<Skeleton className="mt-1 h-6 w-14" />
										) : (
											<div className="flex items-center gap-2">
												<p className="text-2xl font-bold font-mono leading-tight tabular-nums tracking-tight">
													{typeof card.value === "number" ? card.value.toLocaleString() : card.value}
												</p>
												{card.trend != null && (
													<span
														className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
															card.trend.value > 0
																? "bg-emerald-500/15 text-emerald-400"
																: card.trend.value < 0
																	? "bg-red-500/15 text-red-400"
																	: "bg-muted text-muted-foreground"
														}`}
													>
														{card.trend.value > 0 ? "+" : ""}
														{card.trend.value}%
													</span>
												)}
											</div>
										)}
										{card.subtitle && !card.isLoading && (
											<p className="text-[10px] text-muted-foreground mt-0.5">{card.subtitle}</p>
										)}
									</div>
									{card.href && (
										<Link
											href={card.href as never}
											className="ml-auto rounded-md p-1.5 transition-all hover:bg-white/5"
											aria-label={`Go to ${card.label}`}
										>
											<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
										</Link>
									)}
								</CardContent>
							</Card>
						</div>
					);
				})}
			</div>

			{/* Chart + Recent Link Clicks */}
			<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
				{/* Clicks chart */}
				<div {...getAnimationProps(6)}>
					<Card>
						<CardHeader className="flex-row items-center justify-between">
							<h2>
								<CardTitle className="flex items-center gap-1.5">
									<BarChart3 className="h-4 w-4 text-blue-400" aria-hidden="true" />
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
				</div>

				{/* Recent Link Clicks */}
				<div {...getAnimationProps(7)}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<Clock className="h-4 w-4 text-blue-400" aria-hidden="true" />
								Recent Clicks
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-0">
							{recentClicks.isLoading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<Skeleton key={`ev-skeleton-${i}`} className="h-12 w-full mb-1" />
								))
							) : clicks.length === 0 ? (
								<p className="text-xs text-muted-foreground py-4 text-center">No recent clicks</p>
							) : (
								<>
									{clicks.map((click) => (
										<div key={String(click.id)} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
											<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 mt-0.5">
												<MousePointerClick className="h-3 w-3 text-emerald-400" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-xs font-medium truncate">
													{(click.title as string | null) || "Untitled"}
												</p>
												<p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
													<ExternalLink className="h-2.5 w-2.5 shrink-0" />
													{extractDomain((click.url as string | null))}
													{click.country ? ` \u00b7 ${click.country}` : ""}
												</p>
											</div>
											<span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
												{relativeTime(click.createdAt)}
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

			{/* Top Performing Links */}
			<div {...getAnimationProps(8)}>
				<Card>
					<CardHeader className="flex-row items-center justify-between">
						<CardTitle className="flex items-center gap-1.5">
							<Eye className="h-4 w-4 text-blue-400" aria-hidden="true" />
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
		</div>
	);
}
