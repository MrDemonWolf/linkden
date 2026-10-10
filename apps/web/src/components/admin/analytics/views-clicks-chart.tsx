"use client";

import { Eye } from "lucide-react";
import { useMemo } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { QueryError } from "@/components/admin/dashboard/query-error";
import type { Period } from "@/components/admin/period-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTimeZone } from "./admin-time-zone";
import { buildDailySeries, type SeriesPoint, todayKey } from "./daily-series";

const areaChartConfig: ChartConfig = {
	views: { label: "Views", color: "var(--primary, #00ACED)" },
	clicks: { label: "Clicks", color: "var(--data-up)" },
};

// Fixed skeleton bar heights — avoids Math.random() in render (hydration mismatch + reflow churn).
const SKELETON_BAR_HEIGHTS = [48, 72, 40, 84, 56, 68, 44];

const PERIOD_DAYS: Record<Period, number | undefined> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
	all: undefined,
};

interface ViewsClicksChartProps {
	views: SeriesPoint[] | undefined;
	clicks: SeriesPoint[] | undefined;
	/** The queried period, so days before the first visit are zero-filled too. */
	period?: Period;
	isLoading?: boolean;
	isError?: boolean;
	onRetry?: () => void;
	title?: string;
	height?: number;
}

export function ViewsClicksChart({
	views,
	clicks,
	period,
	isLoading,
	isError,
	onRetry,
	title = "Views & Clicks",
	height = 240,
}: ViewsClicksChartProps) {
	// Buckets are days in the admin's timezone, so "today" has to be too.
	const timeZone = useAdminTimeZone();
	const data = useMemo(
		() =>
			buildDailySeries(views, clicks, {
				days: period ? PERIOD_DAYS[period] : undefined,
				today: todayKey(timeZone),
			}),
		[views, clicks, period, timeZone],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<h2 className="flex items-center gap-1.5">
						<Eye className="h-4 w-4 text-primary" aria-hidden="true" />
						{title}
					</h2>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isError ? (
					<div className="flex items-center justify-center" style={{ height }}>
						<QueryError onRetry={onRetry} message="Couldn't load chart data" />
					</div>
				) : isLoading ? (
					<div
						className="flex items-end gap-1"
						style={{ height }}
						aria-busy="true"
						role="status"
						aria-label="Loading chart data"
					>
						{SKELETON_BAR_HEIGHTS.map((h, i) => (
							<Skeleton key={`vc-sk-${i}`} className="flex-1" style={{ height: `${h}%` }} />
						))}
					</div>
				) : data.length === 0 ? (
					<div
						className="flex items-center justify-center text-xs text-muted-foreground"
						style={{ height }}
					>
						No data for this period
					</div>
				) : (
					<>
						{/* Text alternative: the tooltip is pointer-only, so the daily
						    numbers are also a (visually hidden) table. */}
						<table className="sr-only">
							<caption>
								{title}: daily views and clicks, {data[0]?.fullLabel} to{" "}
								{data[data.length - 1]?.fullLabel}
							</caption>
							<thead>
								<tr>
									<th scope="col">Date</th>
									<th scope="col">Views</th>
									<th scope="col">Clicks</th>
								</tr>
							</thead>
							<tbody>
								{data.map((d) => (
									<tr key={d.date}>
										<th scope="row">{d.fullLabel}</th>
										<td>{d.views}</td>
										<td>{d.clicks}</td>
									</tr>
								))}
							</tbody>
						</table>
						<ChartContainer config={areaChartConfig} className="w-full" style={{ height }}>
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
									<defs>
										<linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="var(--color-views)" stopOpacity={0.35} />
											<stop offset="100%" stopColor="var(--color-views)" stopOpacity={0.02} />
										</linearGradient>
										<linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="var(--color-clicks)" stopOpacity={0.3} />
											<stop offset="100%" stopColor="var(--color-clicks)" stopOpacity={0.02} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
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
									{/* Line icons pick up each series' dash, so the legend
								    doesn't rely on colour alone. */}
									<Legend
										verticalAlign="top"
										height={28}
										iconType="plainline"
										iconSize={16}
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
										strokeDasharray="4 3"
										fill="url(#clicksGradient)"
										dot={false}
										activeDot={{ r: 4, strokeWidth: 2 }}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</ChartContainer>
					</>
				)}
			</CardContent>
		</Card>
	);
}
