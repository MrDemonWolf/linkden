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
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
			color: "text-blue-500",
			bg: "bg-blue-500/10",
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

	// Calculate max for bar chart
	const viewsData = viewsOverTime.data ?? [];
	const maxViews = Math.max(...viewsData.map((d) => d.count), 1);

	return (
		<div className="space-y-6">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Dashboard</h1>
					<p className="text-xs text-muted-foreground">
						Overview of your LinkDen page
					</p>
				</div>
				<div className="flex gap-2">
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
				</div>
			</div>

			{/* Stat cards */}
			<div className="grid gap-3 sm:grid-cols-3">
				{stats.map((stat) => (
					<Card key={stat.label} size="sm">
						<CardContent className="flex items-center gap-3">
							<div
								className={`flex h-9 w-9 shrink-0 items-center justify-center ${stat.bg}`}
							>
								<stat.icon className={`h-4 w-4 ${stat.color}`} />
							</div>
							<div className="min-w-0">
								<p className="text-xs text-muted-foreground">{stat.label}</p>
								{overview.isLoading ? (
									<Skeleton className="mt-1 h-5 w-12" />
								) : (
									<p className="text-lg font-semibold leading-tight">
										{stat.value.toLocaleString()}
									</p>
								)}
							</div>
							{stat.href && (
								<Link href={stat.href} className="ml-auto">
									<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
								</Link>
							)}
						</CardContent>
					</Card>
				))}
			</div>

			{/* Views chart */}
			<Card>
				<CardHeader className="flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-1.5">
						<BarChart3 className="h-4 w-4 text-muted-foreground" />
						Views last 7 days
					</CardTitle>
					<Link href="/admin/analytics">
						<Button variant="ghost" size="xs">
							View all
							<ArrowUpRight className="ml-1 h-3 w-3" />
						</Button>
					</Link>
				</CardHeader>
				<CardContent>
					{viewsOverTime.isLoading ? (
						<div className="flex h-32 items-end gap-1">
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
						<div className="flex h-32 items-end gap-1">
							{viewsData.map((d) => {
								const height = Math.max((d.count / maxViews) * 100, 4);
								return (
									<div
										key={d.date}
										className="group relative flex flex-1 flex-col items-center"
									>
										<div className="absolute -top-5 hidden text-[10px] font-medium text-foreground group-hover:block">
											{d.count}
										</div>
										<div
											className="w-full bg-primary/80 transition-colors hover:bg-primary"
											style={{ height: `${height}%` }}
										/>
										<span className="mt-1 text-[9px] text-muted-foreground">
											{new Date(d.date).toLocaleDateString(undefined, {
												weekday: "short",
											})}
										</span>
									</div>
								);
							})}
						</div>
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
