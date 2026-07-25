"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye, Link2, MousePointerClick, Percent } from "lucide-react";
import { useState } from "react";
import { CountriesList } from "@/components/admin/analytics/countries-list";
import { ReferrersList } from "@/components/admin/analytics/referrers-list";
import { TopLinksList } from "@/components/admin/top-links-list";
import { ViewsClicksChart } from "@/components/admin/analytics/views-clicks-chart";
import { PageHeader } from "@/components/admin/page-header";
import { type Period, PeriodSelector } from "@/components/admin/period-selector";
import { StatCard } from "@/components/admin/stat-card";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { trpc } from "@/utils/trpc";

function computeTrend(current: number, previous: number): { value: number; label: string } {
	if (previous === 0) {
		return {
			value: current > 0 ? 100 : 0,
			label: current > 0 ? "+100%" : "Stable",
		};
	}
	const pct = Math.round(((current - previous) / previous) * 100);
	return { value: pct, label: `${pct > 0 ? "+" : ""}${pct}%` };
}

export default function AnalyticsPage() {
	const [period, setPeriod] = useState<Period>("30d");
	const { getAnimationProps } = useEntranceAnimation({
		baseDelay: 60,
		stagger: 70,
	});

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const viewsOverTime = useQuery(trpc.analytics.viewsOverTime.queryOptions({ period }));
	const clicksOverTime = useQuery(trpc.analytics.clicksOverTime.queryOptions({ period }));
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	const countries = useQuery(trpc.analytics.countries.queryOptions({ period }));
	const referrers = useQuery(trpc.analytics.referrers.queryOptions({ period }));

	const totalViews = (overview.data?.totalViews ?? 0) as number;
	const totalClicks = (overview.data?.totalClicks ?? 0) as number;
	const previousViews = (overview.data?.previousViews ?? 0) as number;
	const previousClicks = (overview.data?.previousClicks ?? 0) as number;
	const activeLinks = (overview.data?.activeLinks ?? 0) as number;

	const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
	const prevCtr = previousViews > 0 ? (previousClicks / previousViews) * 100 : 0;

	const viewsTrend = overview.data ? computeTrend(totalViews, previousViews) : null;
	const clicksTrend = overview.data ? computeTrend(totalClicks, previousClicks) : null;
	const ctrTrend = overview.data
		? computeTrend(Math.round(ctr * 10), Math.round(prevCtr * 10))
		: null;

	const periodLabel = period === "all" ? "All time" : `Last ${period.replace("d", "")} days`;

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			<div {...getAnimationProps(0)}>
				<PageHeader
					kicker="ENGAGE"
					title="Analytics"
					description="Page traffic, link performance, and visitor insights."
					actions={<PeriodSelector value={period} onChange={setPeriod} />}
				/>
			</div>

			{/* Stat cards */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<div {...getAnimationProps(1)}>
					<StatCard
						icon={Eye}
						label="Views"
						value={totalViews}
						gradient="from-primary/10 via-primary/5 to-transparent"
						isLoading={overview.isLoading}
						isError={overview.isError}
						onRetry={() => overview.refetch()}
						trend={viewsTrend}
						subtitle={periodLabel}
					/>
				</div>
				<div {...getAnimationProps(2)}>
					<StatCard
						icon={MousePointerClick}
						label="Clicks"
						value={totalClicks}
						iconColor="text-emerald-400"
						iconBg="bg-emerald-500/10"
						gradient="from-emerald-500/10 via-emerald-500/5 to-transparent"
						isLoading={overview.isLoading}
						isError={overview.isError}
						onRetry={() => overview.refetch()}
						trend={clicksTrend}
						subtitle={periodLabel}
					/>
				</div>
				<div {...getAnimationProps(3)}>
					<StatCard
						icon={Percent}
						label="CTR"
						value={`${ctr.toFixed(1)}%`}
						iconColor="text-violet-400"
						iconBg="bg-violet-500/10"
						gradient="from-violet-500/10 via-violet-500/5 to-transparent"
						isLoading={overview.isLoading}
						isError={overview.isError}
						onRetry={() => overview.refetch()}
						trend={ctrTrend}
						subtitle="Clicks ÷ Views"
					/>
				</div>
				<div {...getAnimationProps(4)}>
					<StatCard
						icon={Link2}
						label="Active Links"
						value={activeLinks}
						iconColor="text-amber-400"
						iconBg="bg-amber-500/10"
						gradient="from-amber-500/10 via-amber-500/5 to-transparent"
						isLoading={overview.isLoading}
						isError={overview.isError}
						onRetry={() => overview.refetch()}
						href="/admin/builder"
						subtitle="Published & enabled"
					/>
				</div>
			</div>

			{/* Views vs Clicks chart */}
			<div {...getAnimationProps(5)}>
				<ViewsClicksChart
					views={viewsOverTime.data}
					clicks={clicksOverTime.data}
					isLoading={viewsOverTime.isLoading || clicksOverTime.isLoading}
					isError={viewsOverTime.isError || clicksOverTime.isError}
					onRetry={() => {
						viewsOverTime.refetch();
						clicksOverTime.refetch();
					}}
					title="Views vs Clicks"
				/>
			</div>

			{/* Top Links + Countries */}
			<div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
				<div {...getAnimationProps(6)}>
					<TopLinksList
						items={topLinks.data}
						isLoading={topLinks.isLoading}
						isError={topLinks.isError}
						onRetry={() => topLinks.refetch()}
					/>
				</div>
				<div {...getAnimationProps(7)}>
					<CountriesList
						items={countries.data}
						isLoading={countries.isLoading}
						isError={countries.isError}
						onRetry={() => countries.refetch()}
					/>
				</div>
			</div>

			{/* Referrers */}
			<div {...getAnimationProps(8)}>
				<ReferrersList
					items={referrers.data}
					isLoading={referrers.isLoading}
					isError={referrers.isError}
					onRetry={() => referrers.refetch()}
				/>
			</div>

			{/* Retention note */}
			<p
				{...getAnimationProps(9)}
				className="text-center text-[11px] text-muted-foreground font-mono pt-2"
			>
				ⓘ analytics retained 90 days · stored locally · no third parties
			</p>
		</div>
	);
}
