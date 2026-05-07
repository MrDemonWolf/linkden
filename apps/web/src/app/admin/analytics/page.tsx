"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, MousePointerClick, Percent, Link2 } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { PeriodSelector, type Period } from "@/components/admin/period-selector";
import { ViewsClicksChart } from "@/components/admin/analytics/views-clicks-chart";
import { TopLinksList } from "@/components/admin/analytics/top-links-list";
import { CountriesList } from "@/components/admin/analytics/countries-list";
import { ReferrersList } from "@/components/admin/analytics/referrers-list";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

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
			<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
				<div {...getAnimationProps(1)}>
					<StatCard
						icon={Eye}
						label="Total Views"
						value={totalViews}
						isLoading={overview.isLoading}
						trend={viewsTrend}
						subtitle={periodLabel}
					/>
				</div>
				<div {...getAnimationProps(2)}>
					<StatCard
						icon={MousePointerClick}
						label="Total Clicks"
						value={totalClicks}
						iconColor="text-emerald-400"
						iconBg="bg-emerald-500/10"
						isLoading={overview.isLoading}
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
						isLoading={overview.isLoading}
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
						isLoading={overview.isLoading}
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
					title="Views vs Clicks"
				/>
			</div>

			{/* Top Links + Countries */}
			<div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
				<div {...getAnimationProps(6)}>
					<TopLinksList items={topLinks.data} isLoading={topLinks.isLoading} />
				</div>
				<div {...getAnimationProps(7)}>
					<CountriesList items={countries.data} isLoading={countries.isLoading} />
				</div>
			</div>

			{/* Referrers */}
			<div {...getAnimationProps(8)}>
				<ReferrersList items={referrers.data} isLoading={referrers.isLoading} />
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
