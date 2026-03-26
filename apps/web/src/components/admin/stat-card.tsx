"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
	icon: LucideIcon;
	label: string;
	value: number | string;
	iconColor?: string;
	iconBg?: string;
	href?: string;
	isLoading?: boolean;
	trend?: { value: number; label: string } | null;
	subtitle?: string;
}

export function StatCard({
	icon: Icon,
	label,
	value,
	iconColor = "text-primary",
	iconBg = "bg-primary/10",
	href,
	isLoading,
	trend,
	subtitle,
}: StatCardProps) {
	return (
		<Card size="sm" className="group relative overflow-hidden">
			<CardContent className="flex items-center gap-3">
				<div
					className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconBg)}
					aria-hidden="true"
				>
					<Icon className={cn("h-4 w-4", iconColor)} />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-[11px] text-muted-foreground">{label}</p>
					{isLoading ? (
						<Skeleton className="mt-1 h-5 w-12" />
					) : (
						<div className="flex items-center gap-2">
							<p className="text-2xl font-semibold font-mono leading-tight tabular-nums">
								{typeof value === "number" ? value.toLocaleString() : value}
							</p>
							{trend != null && (
								<span
									className={cn(
										"inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
										trend.value > 0 && "bg-green-500/10 text-green-500",
										trend.value < 0 && "bg-red-500/10 text-red-500",
										trend.value === 0 && "bg-muted text-muted-foreground",
									)}
								>
									{trend.value > 0 ? (
										<TrendingUp className="h-2.5 w-2.5" />
									) : trend.value < 0 ? (
										<TrendingDown className="h-2.5 w-2.5" />
									) : null}
									{trend.value > 0 ? "+" : ""}
									{trend.value}%
								</span>
							)}
						</div>
					)}
					{subtitle && !isLoading && (
						<p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
					)}
				</div>
				{href && (
					<Link
						href={href as never}
						className="ml-auto rounded-md p-1 transition-colors hover:bg-muted"
						aria-label={`Go to ${label}`}
					>
						<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
					</Link>
				)}
			</CardContent>
		</Card>
	);
}
