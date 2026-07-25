"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ArrowUpRight,
	BarChart3,
	Clock,
	ExternalLink,
	Eye,
	Globe,
	Link2,
	MousePointerClick,
	Plus,
	Share2,
	Sparkles,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { TopLinksList } from "@/components/admin/top-links-list";
import { type Period, PeriodSelector } from "@/components/admin/period-selector";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { authClient } from "@/lib/auth-client";
import { extractDomain, relativeTime } from "@/lib/format";
import { trpc } from "@/utils/trpc";

const barChartConfig: ChartConfig = {
	count: {
		label: "Clicks",
		color: "var(--data-up)",
	},
};

const areaChartConfig: ChartConfig = {
	views: {
		label: "Views",
		color: "var(--primary, #00ACED)",
	},
	clicks: {
		label: "Clicks",
		color: "var(--data-up)",
	},
};

// Fixed skeleton bar heights — avoids Math.random() in render (hydration mismatch + reflow churn).
const SKELETON_BAR_HEIGHTS = [48, 72, 40, 84, 56, 68, 44];

function computeTrend(current: number, previous: number): { value: number; label: string } {
	if (previous === 0) {
		return { value: current > 0 ? 100 : 0, label: current > 0 ? "+100%" : "Stable" };
	}
	const pct = Math.round(((current - previous) / previous) * 100);
	return { value: pct, label: `${pct > 0 ? "+" : ""}${pct}%` };
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
	const clicksOverTime = useQuery(trpc.analytics.clicksOverTime.queryOptions({ period }));
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	const recentClicks = useQuery(trpc.analytics.recentClicks.queryOptions());
	const viewsOverTime = useQuery(trpc.analytics.viewsOverTime.queryOptions({ period }));
	const referrers = useQuery(trpc.analytics.referrers.queryOptions({ period }));
	const countries = useQuery(trpc.analytics.countries.queryOptions({ period }));
	const timezoneQuery = useQuery(trpc.settings.get.queryOptions({ key: "timezone" }));

	const timezone = timezoneQuery.data?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;

	const { greeting, firstName, formattedDate } = useMemo(() => {
		const now = new Date();
		const name = session?.user?.name ?? "";
		const first = name.split(" ")[0] || "there";
		try {
			const hour = new Date(now.toLocaleString("en-US", { timeZone: timezone })).getHours();
			const date = now.toLocaleDateString("en-US", {
				timeZone: timezone,
				weekday: "short",
				month: "short",
				day: "numeric",
			});
			return { greeting: getGreeting(hour), firstName: first, formattedDate: date };
		} catch {
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
	const activeLinks = (overview.data?.activeLinks ?? 0) as number;
	const totalConnections = (overview.data?.totalConnections ?? 0) as number;

	const viewsTrend = computeTrend(totalViews, previousViews);
	const clicksTrend = computeTrend(totalClicks, previousClicks);

	const periodLabel =
		period === "7d" ? "7" : period === "30d" ? "30" : period === "90d" ? "90" : "all";

	const clicksData = (clicksOverTime.data ?? []).map((d) => ({
		...d,
		label: new Date((d.date as string) || new Date()).toLocaleDateString(undefined, {
			weekday: "short",
		}),
	}));

	const clicks = recentClicks.data ?? [];

	const areaChartData = useMemo(() => {
		const viewsMap = new Map<string, number>();
		const clicksMap = new Map<string, number>();
		for (const d of viewsOverTime.data ?? []) {
			viewsMap.set(d.date as string, d.count as number);
		}
		for (const d of clicksOverTime.data ?? []) {
			clicksMap.set(d.date as string, d.count as number);
		}
		const allDates = new Set([...viewsMap.keys(), ...clicksMap.keys()]);
		return [...allDates].sort().map((date) => ({
			date,
			label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
			views: viewsMap.get(date) ?? 0,
			clicks: clicksMap.get(date) ?? 0,
		}));
	}, [viewsOverTime.data, clicksOverTime.data]);

	const totalReferrerCount = (referrers.data ?? []).reduce(
		(sum, r) => sum + (r.count as number),
		0,
	);

	const calloutText = useMemo(() => {
		if (overview.isLoading) return "Loading recent activity…";
		const periodWord =
			period === "7d"
				? "7 days"
				: period === "30d"
					? "30 days"
					: period === "90d"
						? "90 days"
						: "all time";
		const trendBit =
			previousViews === 0
				? totalViews > 0
					? " · first views in this window"
					: ""
				: ` · ${viewsTrend.label} vs previous`;
		return `Your page got ${totalViews.toLocaleString()} ${totalViews === 1 ? "view" : "views"} in the last ${periodWord}${trendBit}`;
	}, [overview.isLoading, period, totalViews, previousViews, viewsTrend]);

	const periodSubtitle = `Last ${periodLabel}${periodLabel === "all" ? "" : " days"}`;

	const statCards: {
		icon: typeof Eye;
		label: string;
		value: number;
		iconColor: string;
		iconBg: string;
		gradient: string;
		trend: { value: number; label: string } | null;
		subtitle: string;
		href?: string;
	}[] = [
		{
			icon: Eye,
			label: "Views",
			value: totalViews,
			iconColor: "text-primary",
			iconBg: "bg-primary/10",
			gradient: "from-primary/10 via-primary/5 to-transparent",
			trend: overview.data ? viewsTrend : null,
			subtitle: periodSubtitle,
		},
		{
			icon: MousePointerClick,
			label: "Clicks",
			value: totalClicks,
			iconColor: "text-emerald-400",
			iconBg: "bg-emerald-500/10",
			gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
			trend: overview.data ? clicksTrend : null,
			subtitle: periodSubtitle,
		},
		{
			icon: Link2,
			label: "Active Links",
			value: activeLinks,
			iconColor: "text-sky-400",
			iconBg: "bg-sky-500/10",
			gradient: "from-sky-500/10 via-sky-500/5 to-transparent",
			trend: null,
			subtitle: "Published & enabled",
			href: "/admin/builder",
		},
		{
			icon: Users,
			label: "New Contacts",
			value: totalConnections,
			iconColor: "text-amber-400",
			iconBg: "bg-amber-500/10",
			gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
			trend: null,
			subtitle: periodSubtitle,
			href: "/admin/connections",
		},
	];

	async function handleShare() {
		try {
			await navigator.clipboard.writeText(window.location.origin);
			toast.success("Link copied");
		} catch {
			toast.error("Couldn't copy link");
		}
	}

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			{/* Greeting + period selector */}
			<div {...getAnimationProps(0)} className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3 flex-wrap">
					<h1 className="text-2xl font-bold tracking-tight">
						<span className="text-base font-medium text-muted-foreground">{greeting}, </span>
						{firstName}
					</h1>
					<span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
						{formattedDate}
					</span>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<PeriodSelector value={period} onChange={setPeriod} />
					<Link href="/" target="_blank" rel="noopener noreferrer">
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 transition-all"
						>
							View public
							<ArrowUpRight className="h-3.5 w-3.5" />
						</Button>
					</Link>
				</div>
			</div>

			{/* Callout banner */}
			<div {...getAnimationProps(1)}>
				<Card
					size="sm"
					className="relative overflow-hidden border border-blue-500/20 bg-blue-500/5"
				>
					<div
						className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent pointer-events-none"
						aria-hidden="true"
					/>
					<CardContent className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center">
						<div className="flex min-w-0 items-center gap-3">
							<div
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/20"
								aria-hidden="true"
							>
								<Sparkles className="h-4 w-4" />
							</div>
							<p className="min-w-0 text-sm text-foreground/90">{calloutText}</p>
						</div>
						<div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
							<Link href="/admin/builder" className="flex-1 sm:flex-none">
								<Button
									variant="outline"
									size="sm"
									className="w-full gap-1.5 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 sm:w-auto"
								>
									<Plus className="h-3.5 w-3.5" />
									Add block
								</Button>
							</Link>
							<Button
								variant="outline"
								size="sm"
								className="w-full flex-1 gap-1.5 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/50 text-violet-400 hover:text-violet-300 sm:w-auto sm:flex-none"
								onClick={handleShare}
							>
								<Share2 className="h-3.5 w-3.5" />
								Share
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Stat Cards */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				{statCards.map((card, index) => (
					<div key={card.label} {...getAnimationProps(index + 2)}>
						<StatCard
							icon={card.icon}
							label={card.label}
							value={card.value}
							iconColor={card.iconColor}
							iconBg={card.iconBg}
							gradient={card.gradient}
							href={card.href}
							isLoading={overview.isLoading}
							isError={overview.isError}
							onRetry={() => overview.refetch()}
							trend={card.trend}
							subtitle={card.subtitle}
						/>
					</div>
				))}
			</div>

			{/* Views vs Clicks — full row */}
			<div {...getAnimationProps(6)}>
				<Card>
					<CardHeader className="flex-row items-center justify-between">
						<CardTitle className="flex items-center gap-1.5">
							<Eye className="h-4 w-4 text-blue-400" aria-hidden="true" />
							Views vs Clicks
						</CardTitle>
						<span className="text-[10px] uppercase tracking-wider text-muted-foreground">
							Last {periodLabel}
							{periodLabel === "all" ? "" : " days"}
						</span>
					</CardHeader>
					<CardContent>
						{viewsOverTime.isError || clicksOverTime.isError ? (
							<div className="flex h-56 items-center justify-center">
								<QueryError
									message="Couldn't load chart data"
									onRetry={() => {
										viewsOverTime.refetch();
										clicksOverTime.refetch();
									}}
								/>
							</div>
						) : viewsOverTime.isLoading || clicksOverTime.isLoading ? (
							<div
								className="flex h-56 items-end gap-1"
								aria-busy="true"
								role="status"
								aria-label="Loading chart data"
							>
								{SKELETON_BAR_HEIGHTS.map((h, i) => (
									<Skeleton key={`vc-sk-${i}`} className="flex-1" style={{ height: `${h}%` }} />
								))}
							</div>
						) : areaChartData.length === 0 ? (
							<div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
								No data for this period
							</div>
						) : (
							<ChartContainer
								config={areaChartConfig}
								className="h-56 w-full"
								aria-label="Views and clicks over time"
								role="img"
							>
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart
										data={areaChartData}
										margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
									>
										<defs>
											<linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="var(--color-views)" stopOpacity={0.3} />
												<stop offset="100%" stopColor="var(--color-views)" stopOpacity={0.02} />
											</linearGradient>
											<linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="var(--color-clicks)" stopOpacity={0.3} />
												<stop offset="100%" stopColor="var(--color-clicks)" stopOpacity={0.02} />
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
											tick={{ fontSize: 11 }}
											interval="preserveStartEnd"
											minTickGap={24}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											tick={{ fontSize: 10 }}
											allowDecimals={false}
										/>
										<Tooltip content={<ChartTooltipContent labelFormatter={(label) => label} />} />
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
			</div>

			{/* Clicks per day + Top Links — 1.2fr / 1fr */}
			<div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
				<div {...getAnimationProps(7)}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<BarChart3 className="h-4 w-4 text-blue-400" aria-hidden="true" />
								Clicks per day
							</CardTitle>
						</CardHeader>
						<CardContent>
							{clicksOverTime.isError ? (
								<div className="flex h-48 items-center justify-center">
									<QueryError
										message="Couldn't load clicks data"
										onRetry={() => clicksOverTime.refetch()}
									/>
								</div>
							) : clicksOverTime.isLoading ? (
								<div
									className="flex h-48 items-end gap-1"
									aria-busy="true"
									role="status"
									aria-label="Loading chart data"
								>
									{SKELETON_BAR_HEIGHTS.map((h, i) => (
										<Skeleton key={`cpd-sk-${i}`} className="flex-1" style={{ height: `${h}%` }} />
									))}
								</div>
							) : clicksData.length === 0 ? (
								<div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
									No clicks data yet
								</div>
							) : (
								<ChartContainer
									config={barChartConfig}
									className="h-48 w-full"
									aria-label="Clicks per day"
									role="img"
								>
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={clicksData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="currentColor"
												strokeOpacity={0.1}
											/>
											<XAxis
												dataKey="label"
												tickLine={false}
												axisLine={false}
												tick={{ fontSize: 11 }}
												interval="preserveStartEnd"
												minTickGap={24}
											/>
											<YAxis
												tickLine={false}
												axisLine={false}
												tick={{ fontSize: 10 }}
												allowDecimals={false}
											/>
											<Tooltip
												content={<ChartTooltipContent labelFormatter={(label) => label} />}
											/>
											<Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
										</BarChart>
									</ResponsiveContainer>
								</ChartContainer>
							)}
						</CardContent>
					</Card>
				</div>

				<div {...getAnimationProps(8)}>
					<TopLinksList
						className="h-full"
						title="Top links"
						items={topLinks.data?.map((l) => ({
							id: l.id,
							title: (l.title as string | null) ?? null,
							url: (l.url as string | null) ?? null,
							clicks: (l.clicks as number) ?? 0,
						}))}
						isLoading={topLinks.isLoading}
						isError={topLinks.isError}
						onRetry={() => topLinks.refetch()}
					/>
				</div>
			</div>

			{/* Countries · Referrers · Recent clicks — 3 cols */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div {...getAnimationProps(9)}>
					<Card className="h-full">
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<Globe className="h-4 w-4 text-blue-400" aria-hidden="true" />
								Countries
							</CardTitle>
						</CardHeader>
						<CardContent>
							{countries.isError ? (
								<QueryError onRetry={() => countries.refetch()} />
							) : countries.isLoading ? (
								<div className="space-y-2">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={`co-sk-${i}`} className="h-6 w-full" />
									))}
								</div>
							) : !countries.data?.length ? (
								<p className="text-xs text-muted-foreground py-6 text-center">
									No country data yet
								</p>
							) : (
								<div className="divide-y divide-dashed divide-border/60">
									{countries.data.slice(0, 6).map((c, i) => (
										<div
											key={String(c.country ?? i)}
											className="flex items-center justify-between py-1.5 text-xs"
										>
											<span className="truncate font-medium">
												{(c.country as string | null) || "Unknown"}
											</span>
											<span className="font-mono tabular-nums text-muted-foreground">
												{(c.count as number).toLocaleString()}
											</span>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div {...getAnimationProps(10)}>
					<Card className="h-full">
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<ArrowUpRight className="h-4 w-4 text-blue-400" aria-hidden="true" />
								Referrers
							</CardTitle>
						</CardHeader>
						<CardContent>
							{referrers.isError ? (
								<QueryError onRetry={() => referrers.refetch()} />
							) : referrers.isLoading ? (
								<div className="space-y-2">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={`ref-sk-${i}`} className="h-6 w-full" />
									))}
								</div>
							) : !referrers.data?.length ? (
								<p className="text-xs text-muted-foreground py-6 text-center">
									No referrer data yet
								</p>
							) : (
								<div className="space-y-2">
									{referrers.data.slice(0, 6).map((ref, i) => {
										const refCount = ref.count as number;
										const pct =
											totalReferrerCount > 0
												? Math.round((refCount / totalReferrerCount) * 100)
												: 0;
										return (
											<div key={String(ref.referrer ?? i)}>
												<div className="flex items-center justify-between text-xs mb-1">
													<span className="truncate font-mono">
														{(ref.referrer as string | null) || "Direct"}
													</span>
													<span className="font-mono tabular-nums text-muted-foreground">
														{refCount.toLocaleString()}
													</span>
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

				<div {...getAnimationProps(11)}>
					<Card className="h-full">
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<Clock className="h-4 w-4 text-blue-400" aria-hidden="true" />
								Recent clicks
							</CardTitle>
						</CardHeader>
						<CardContent>
							{recentClicks.isError ? (
								<QueryError onRetry={() => recentClicks.refetch()} />
							) : recentClicks.isLoading ? (
								<div className="space-y-2">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={`rc-sk-${i}`} className="h-8 w-full" />
									))}
								</div>
							) : clicks.length === 0 ? (
								<p className="text-xs text-muted-foreground py-6 text-center">No recent clicks</p>
							) : (
								<div className="divide-y divide-dashed divide-border/60">
									{clicks.slice(0, 6).map((click) => (
										<div
											key={String(click.id)}
											className="flex items-center justify-between gap-2 py-2 text-xs"
										>
											<div className="min-w-0 flex-1">
												<p className="font-medium truncate">
													{(click.title as string | null) || "Untitled"}
												</p>
												<p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
													<ExternalLink className="h-2.5 w-2.5 shrink-0" />
													{extractDomain(click.url as string | null)}
													{click.country ? ` · ${click.country}` : ""}
												</p>
											</div>
											<span className="text-[10px] text-muted-foreground shrink-0 font-mono">
												{relativeTime(click.createdAt)}
											</span>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
