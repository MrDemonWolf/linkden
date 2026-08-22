"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ArrowUpRight,
	Blocks,
	Eye,
	Mail,
	Megaphone,
	MousePointerClick,
	Plus,
	Share2,
	Sparkles,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ViewsClicksChart } from "@/components/admin/analytics/views-clicks-chart";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { type Period, PeriodSelector } from "@/components/admin/period-selector";
import { StatCard } from "@/components/admin/stat-card";
import { TopLinksList } from "@/components/admin/top-links-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

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

const PERIOD_WORD: Record<Period, string> = {
	"7d": "7 days",
	"30d": "30 days",
	"90d": "90 days",
	all: "all time",
};

export default function AdminDashboardPage() {
	const [period, setPeriod] = useState<Period>("7d");
	const { data: session } = authClient.useSession();
	const { getAnimationProps } = useEntranceAnimation({ baseDelay: 60, stagger: 70 });

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const viewsOverTime = useQuery(trpc.analytics.viewsOverTime.queryOptions({ period }));
	const clicksOverTime = useQuery(trpc.analytics.clicksOverTime.queryOptions({ period }));
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	// Any block, draft or disabled — decides between "page is empty" and "no visitors yet".
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const timezoneQuery = useQuery(trpc.settings.get.queryOptions({ key: "timezone" }));
	const emailKeyQuery = useQuery(trpc.settings.get.queryOptions({ key: "email_api_key" }));
	const emailFromQuery = useQuery(trpc.settings.get.queryOptions({ key: "email_from" }));
	const deliveryQuery = useQuery(trpc.settings.get.queryOptions({ key: "contact_delivery" }));
	// Secrets come back masked, so any non-empty value means a key is stored.
	// Auth mail (reset, magic link) only needs the API key; contact-form delivery
	// by email also needs a verified sender address.
	const deliveryNeedsSender =
		deliveryQuery.data?.value === "email" || deliveryQuery.data?.value === "both";
	const emailMissing =
		(emailKeyQuery.isSuccess && !emailKeyQuery.data?.value) ||
		(deliveryNeedsSender && emailFromQuery.isSuccess && !emailFromQuery.data?.value);

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

	const totalViews = overview.data?.totalViews ?? 0;
	const totalClicks = overview.data?.totalClicks ?? 0;
	const previousViews = overview.data?.previousViews ?? 0;
	const previousClicks = overview.data?.previousClicks ?? 0;
	const totalConnections = overview.data?.totalConnections ?? 0;

	const viewsTrend = computeTrend(totalViews, previousViews);
	const clicksTrend = computeTrend(totalClicks, previousClicks);

	const periodWord = PERIOD_WORD[period];
	const periodSubtitle = period === "all" ? "All time" : `Last ${periodWord}`;

	const calloutText = useMemo(() => {
		if (overview.isLoading) return "Loading recent activity…";
		const trendBit =
			previousViews === 0
				? totalViews > 0
					? " · first views in this window"
					: ""
				: ` · ${viewsTrend.label} vs previous`;
		return `Your page got ${totalViews.toLocaleString()} ${totalViews === 1 ? "view" : "views"} in the last ${periodWord}${trendBit}`;
	}, [overview.isLoading, periodWord, totalViews, previousViews, viewsTrend]);

	const statCards = [
		{
			icon: Eye,
			label: "Views",
			value: totalViews,
			trend: overview.data ? viewsTrend : null,
		},
		{
			icon: MousePointerClick,
			label: "Clicks",
			value: totalClicks,
			trend: overview.data ? clicksTrend : null,
		},
		{
			icon: Users,
			label: "New contacts",
			value: totalConnections,
			trend: null,
			href: "/admin/connections",
		},
	];

	// Empty-state ladder: no blocks → build; blocks but no views → share; else the numbers.
	const pageIsEmpty = blocksQuery.isSuccess && blocksQuery.data.length === 0;
	const noVisitors = !pageIsEmpty && overview.isSuccess && totalViews === 0;

	async function handleShare() {
		try {
			await navigator.clipboard.writeText(window.location.origin);
			toast.success("Link copied");
		} catch {
			toast.error("Couldn't copy link");
		}
	}

	// Running counter keeps the stagger contiguous even when a card is conditional.
	let step = 0;
	const enter = () => getAnimationProps(step++);

	return (
		<PageShell>
			{/* Greeting + period selector */}
			<div {...enter()}>
				<PageHeader
					title={
						<>
							<span className="text-sm font-medium text-muted-foreground">{greeting}</span>
							{firstName ? (
								<>
									<span className="text-sm font-medium text-muted-foreground">, </span>
									{firstName}
								</>
							) : (
								<Skeleton className="ml-2 inline-block h-5 w-24 align-middle" />
							)}
						</>
					}
					badge={
						<span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
							{formattedDate}
						</span>
					}
					actions={
						<>
							<PeriodSelector value={period} onChange={setPeriod} />
							{/* Base UI Button has no asChild; `render` swaps the element for a Link. */}
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary hover:text-primary transition-all"
								render={<Link href="/" target="_blank" rel="noopener noreferrer" />}
							>
								View public
								<ArrowUpRight className="h-3.5 w-3.5" />
							</Button>
						</>
					}
				/>
			</div>

			{/* Callout banner */}
			<div {...enter()}>
				<Card size="sm" className="relative overflow-hidden border border-primary/20 bg-primary/5">
					<div
						className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pointer-events-none"
						aria-hidden="true"
					/>
					<CardContent className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center">
						<div className="flex min-w-0 items-center gap-3">
							<div
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-lg shadow-primary/20"
								aria-hidden="true"
							>
								<Sparkles className="h-4 w-4" />
							</div>
							<p className="min-w-0 text-sm text-foreground/90">{calloutText}</p>
						</div>
						<div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
							<Button
								variant="outline"
								size="sm"
								className="w-full flex-1 gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary hover:text-primary sm:w-auto sm:flex-none"
								render={<Link href="/admin/builder" />}
							>
								<Plus className="h-3.5 w-3.5" />
								Add block
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="w-full flex-1 gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary hover:text-primary sm:w-auto sm:flex-none"
								onClick={handleShare}
							>
								<Share2 className="h-3.5 w-3.5" />
								Share
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Email not configured — password reset / magic links / contact mail are silently off */}
			{emailMissing && (
				<div {...enter()}>
					<Card size="sm" className="border border-destructive/30 bg-destructive/5">
						<CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
							<div className="flex min-w-0 items-center gap-3">
								<div
									className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
									aria-hidden="true"
								>
									<Mail className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<h2 className="text-sm font-semibold">Email isn&apos;t set up</h2>
									<p className="text-sm text-muted-foreground">
										Password reset, magic links and contact notifications are off until you add a
										provider key.
									</p>
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="sm:ml-auto"
								render={<Link href="/admin/settings?tab=email" />}
							>
								Set up email
							</Button>
						</CardContent>
					</Card>
				</div>
			)}

			{pageIsEmpty ? (
				<div {...enter()}>
					<EmptyState
						icon={Blocks}
						title="Your page is empty"
						description="Add a link, header or image block and publish to start collecting views."
						action={{ label: "Open builder", href: "/admin/builder" }}
					/>
				</div>
			) : (
				<>
					{/* Stat cards */}
					<div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
						{statCards.map((card) => (
							<div key={card.label} {...enter()}>
								<StatCard
									icon={card.icon}
									label={card.label}
									value={card.value}
									href={card.href}
									isLoading={overview.isLoading}
									isError={overview.isError}
									onRetry={() => overview.refetch()}
									trend={card.trend}
									subtitle={periodSubtitle}
								/>
							</div>
						))}
					</div>

					{noVisitors ? (
						<div {...enter()}>
							<EmptyState
								icon={Megaphone}
								title="No visitors yet"
								description={`Nobody has opened your page in the last ${periodWord}. Share the link to get your first views.`}
								action={{ label: "Copy page link", onClick: handleShare }}
							/>
						</div>
					) : (
						<>
							<div {...enter()}>
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
									height={224}
								/>
							</div>

							<div {...enter()}>
								<TopLinksList
									title="Top links"
									items={topLinks.data}
									isLoading={topLinks.isLoading}
									isError={topLinks.isError}
									onRetry={() => topLinks.refetch()}
								/>
							</div>

							<div {...enter()} className="flex justify-end">
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5"
									render={<Link href="/admin/analytics" />}
								>
									See full analytics
									<ArrowUpRight className="h-3.5 w-3.5" />
								</Button>
							</div>
						</>
					)}
				</>
			)}
		</PageShell>
	);
}
