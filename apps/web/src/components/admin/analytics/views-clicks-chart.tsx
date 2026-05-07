"use client";

import { useMemo } from "react";
import { Eye } from "lucide-react";
import {
	AreaChart,
	Area,
	Legend,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const areaChartConfig: ChartConfig = {
	views: { label: "Views", color: "var(--primary, #0FACED)" },
	clicks: { label: "Clicks", color: "#22c55e" },
};

interface SeriesPoint {
	date: string;
	count: number;
}

interface ViewsClicksChartProps {
	views: SeriesPoint[] | undefined;
	clicks: SeriesPoint[] | undefined;
	isLoading?: boolean;
	title?: string;
	height?: number;
}

export function ViewsClicksChart({
	views,
	clicks,
	isLoading,
	title = "Views & Clicks",
	height = 240,
}: ViewsClicksChartProps) {
	const data = useMemo(() => {
		const viewsMap = new Map<string, number>();
		const clicksMap = new Map<string, number>();
		for (const d of views ?? []) viewsMap.set(d.date, d.count);
		for (const d of clicks ?? []) clicksMap.set(d.date, d.count);
		const allDates = new Set([...viewsMap.keys(), ...clicksMap.keys()]);
		return [...allDates].sort().map((date) => ({
			date,
			label: new Date(date).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
			}),
			views: viewsMap.get(date) ?? 0,
			clicks: clicksMap.get(date) ?? 0,
		}));
	}, [views, clicks]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-1.5">
					<Eye className="h-4 w-4 text-primary" aria-hidden="true" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div
						className="flex items-end gap-1"
						style={{ height }}
						aria-busy="true"
						role="status"
						aria-label="Loading chart data"
					>
						{Array.from({ length: 7 }).map((_, i) => (
							<Skeleton
								key={`vc-sk-${i}`}
								className="flex-1"
								style={{ height: `${20 + Math.random() * 80}%` }}
							/>
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
					<ChartContainer
						config={areaChartConfig}
						className="w-full"
						style={{ height }}
						aria-label="Views and clicks over time chart"
						role="img"
					>
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
								<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
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
	);
}
