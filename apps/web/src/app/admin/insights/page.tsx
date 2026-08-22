"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Blocks,
	Eye,
	Link2,
	type LucideIcon,
	Mail,
	Megaphone,
	MousePointerClick,
	Percent,
	X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CountriesList } from "@/components/admin/analytics/countries-list";
import { ReferrersList } from "@/components/admin/analytics/referrers-list";
import { ViewsClicksChart } from "@/components/admin/analytics/views-clicks-chart";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { type Period, PeriodSelector } from "@/components/admin/period-selector";
import { StatCard } from "@/components/admin/stat-card";
import { TopLinksList } from "@/components/admin/top-links-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { trpc } from "@/utils/trpc";

// ─── Insights = old Dashboard + Analytics ──────────────────────────────────
// One destination for the numbers. The dashboard's email banner and
// empty-page ladder survive as a dismissible "Next steps" strip.

const DISMISS_KEY = "admin.insights.dismissed";

type NudgeId = "email" | "empty" | "share";

interface Nudge {
	id: NudgeId;
	icon: LucideIcon;
	title: string;
	description: string;
	action: { label: string; href: Route } | { label: string; onClick: () => void };
	tone?: "destructive";
}

const PERIOD_WORD: Record<Period, string> = {
	"7d": "7 days",
	"30d": "30 days",
	"90d": "90 days",
	all: "all time",
};

function computeTrend(current: number, previous: number): { value: number; label: string } {
	if (previous === 0) {
		return { value: current > 0 ? 100 : 0, label: current > 0 ? "+100%" : "Stable" };
	}
	const pct = Math.round(((current - previous) / previous) * 100);
	return { value: pct, label: `${pct > 0 ? "+" : ""}${pct}%` };
}

function readDismissed(): NudgeId[] {
	try {
		const raw = localStorage.getItem(DISMISS_KEY);
		return raw ? (JSON.parse(raw) as NudgeId[]) : [];
	} catch {
		return [];
	}
}

export default function InsightsPage() {
	const [period, setPeriod] = useState<Period>("30d");
	const { getAnimationProps } = useEntranceAnimation({ baseDelay: 60, stagger: 70 });

	const overview = useQuery(trpc.analytics.overview.queryOptions({ period }));
	const viewsOverTime = useQuery(trpc.analytics.viewsOverTime.queryOptions({ period }));
	const clicksOverTime = useQuery(trpc.analytics.clicksOverTime.queryOptions({ period }));
	const topLinks = useQuery(trpc.analytics.topLinks.queryOptions({ period }));
	const countries = useQuery(trpc.analytics.countries.queryOptions({ period }));
	const referrers = useQuery(trpc.analytics.referrers.queryOptions({ period }));
	// Any block, draft or disabled — decides between "page is empty" and "no visitors yet".
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
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

	const totalViews = overview.data?.totalViews ?? 0;
	const totalClicks = overview.data?.totalClicks ?? 0;
	const previousViews = overview.data?.previousViews ?? 0;
	const previousClicks = overview.data?.previousClicks ?? 0;
	const activeLinks = overview.data?.activeLinks ?? 0;

	const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
	const prevCtr = previousViews > 0 ? (previousClicks / previousViews) * 100 : 0;

	const viewsTrend = overview.data ? computeTrend(totalViews, previousViews) : null;
	const clicksTrend = overview.data ? computeTrend(totalClicks, previousClicks) : null;
	const ctrTrend = overview.data
		? computeTrend(Math.round(ctr * 10), Math.round(prevCtr * 10))
		: null;

	const periodWord = PERIOD_WORD[period];
	const periodLabel = period === "all" ? "All time" : `Last ${periodWord}`;

	// Empty-state ladder: no blocks → build; blocks but no views → share.
	const pageIsEmpty = blocksQuery.isSuccess && blocksQuery.data.length === 0;
	const noVisitors = !pageIsEmpty && overview.isSuccess && totalViews === 0;

	// ponytail: plain useState + effect instead of a storage hook; read once after mount
	// so the server render (no localStorage) matches the first client render.
	const [dismissed, setDismissed] = useState<NudgeId[]>([]);
	useEffect(() => setDismissed(readDismissed()), []);
	const dismiss = (id: NudgeId) => {
		const next = [...dismissed, id];
		setDismissed(next);
		localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
	};

	async function handleShare() {
		try {
			await navigator.clipboard.writeText(window.location.origin);
			toast.success("Link copied");
		} catch {
			toast.error("Couldn't copy link");
		}
	}

	const nudges: Nudge[] = [];
	if (emailMissing) {
		nudges.push({
			id: "email",
			icon: Mail,
			tone: "destructive",
			title: "Email isn't set up",
			description:
				"Password reset, magic links and contact notifications are off until you add a provider key.",
			action: { label: "Set up email", href: "/admin/settings/email" },
		});
	}
	if (pageIsEmpty) {
		nudges.push({
			id: "empty",
			icon: Blocks,
			title: "Your page is empty",
			description: "Add a link, header or image block and publish to start collecting views.",
			action: { label: "Add a block", href: "/admin/links" },
		});
	} else if (noVisitors) {
		nudges.push({
			id: "share",
			icon: Megaphone,
			title: "No visitors yet",
			description: `Nobody has opened your page in the last ${periodWord}. Share the link to get your first views.`,
			action: { label: "Copy page link", onClick: handleShare },
		});
	}
	const visibleNudges = nudges.filter((n) => !dismissed.includes(n.id));

	// Running counter keeps the stagger contiguous even when a card is conditional.
	let step = 0;
	const enter = () => getAnimationProps(step++);

	return (
		<PageShell>
			<div {...enter()}>
				<PageHeader
					title="Insights"
					actions={<PeriodSelector value={period} onChange={setPeriod} />}
				/>
			</div>

			{visibleNudges.length > 0 && (
				<div {...enter()}>
					<Card size="sm">
						<CardContent className="space-y-3">
							<p className="text-micro font-mono uppercase tracking-[0.14em] text-muted-foreground">
								Next steps
							</p>
							<ul className="divide-y divide-border">
								{visibleNudges.map((n) => {
									const Icon = n.icon;
									const destructive = n.tone === "destructive";
									return (
										<li
											key={n.id}
											className="flex flex-col items-start gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
										>
											<div className="flex min-w-0 items-center gap-3">
												<div
													className={
														destructive
															? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
															: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
													}
													aria-hidden="true"
												>
													<Icon className="h-4 w-4" />
												</div>
												<div className="min-w-0">
													<h2 className="text-sm font-semibold">{n.title}</h2>
													<p className="text-xs text-muted-foreground">{n.description}</p>
												</div>
											</div>
											<div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
												{"href" in n.action ? (
													<Button
														variant="outline"
														size="sm"
														render={<Link href={n.action.href} />}
													>
														{n.action.label}
													</Button>
												) : (
													<Button variant="outline" size="sm" onClick={n.action.onClick}>
														{n.action.label}
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													className="ml-auto h-11 w-11 text-muted-foreground sm:ml-0 md:h-8 md:w-8"
													onClick={() => dismiss(n.id)}
													aria-label={`Dismiss: ${n.title}`}
												>
													<X className="h-4 w-4" />
												</Button>
											</div>
										</li>
									);
								})}
							</ul>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Stat cards */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<div {...enter()}>
					<StatCard
						icon={Eye}
						label="Views"
						value={totalViews}
						isLoading={overview.isLoading}
						isError={overview.isError}
						onRetry={() => overview.refetch()}
						trend={viewsTrend}
						subtitle={periodLabel}
					/>
				</div>
				<div {...enter()}>
					<StatCard
						icon={MousePointerClick}
						label="Clicks"
						value={totalClicks}
						isLoading={overview.isLoading}
						isError={overview.isError}
						onRetry={() => overview.refetch()}
						trend={clicksTrend}
						subtitle={periodLabel}
					/>
				</div>
				<div {...enter()}>
					<StatCard
						icon={Percent}
						label="CTR"
						value={`${ctr.toFixed(1)}%`}
						isLoading={overview.isLoading}
						isError={overview.isError}
						onRetry={() => overview.refetch()}
						trend={ctrTrend}
						subtitle="Clicks ÷ Views"
					/>
				</div>
				<div {...enter()}>
					<StatCard
						icon={Link2}
						label="Active Links"
						value={activeLinks}
						isLoading={overview.isLoading}
						isError={overview.isError}
						onRetry={() => overview.refetch()}
						href="/admin/links"
						subtitle="Published & enabled"
					/>
				</div>
			</div>

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
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
				<div {...enter()}>
					<TopLinksList
						items={topLinks.data}
						isLoading={topLinks.isLoading}
						isError={topLinks.isError}
						onRetry={() => topLinks.refetch()}
					/>
				</div>
				<div {...enter()}>
					<CountriesList
						items={countries.data}
						isLoading={countries.isLoading}
						isError={countries.isError}
						onRetry={() => countries.refetch()}
					/>
				</div>
			</div>

			<div {...enter()}>
				<ReferrersList
					items={referrers.data}
					isLoading={referrers.isLoading}
					isError={referrers.isError}
					onRetry={() => referrers.refetch()}
				/>
			</div>

			<p {...enter()} className="pt-2 text-center font-mono text-micro text-muted-foreground">
				ⓘ analytics retained 90 days · stored locally · no third parties
			</p>
		</PageShell>
	);
}
