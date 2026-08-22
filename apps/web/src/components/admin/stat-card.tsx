"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowUpRight, RotateCw, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
	icon: LucideIcon;
	label: string;
	value: number | string;
	href?: string;
	isLoading?: boolean;
	isError?: boolean;
	onRetry?: () => void;
	trend?: { value: number; label: string } | null;
	subtitle?: string;
}

export function StatCard({
	icon: Icon,
	label,
	value,
	href,
	isLoading,
	isError,
	onRetry,
	trend,
	subtitle,
}: StatCardProps) {
	return (
		<Card size="sm" className="group relative overflow-hidden">
			{/* Every stat tints with primary — the per-card rainbow carried no meaning. */}
			<div
				className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
				aria-hidden="true"
			/>
			<CardContent className="relative flex items-center gap-3">
				<div
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10"
					aria-hidden="true"
				>
					<Icon className="h-4 w-4 text-primary" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-micro uppercase tracking-[0.14em] text-muted-foreground font-mono">
						{label}
					</p>
					{/* Error is checked before loading/value so a failed (re)fetch surfaces
					    Retry in place of the metric — never a stale number or a spinner. */}
					{isError ? (
						<div className="mt-1 flex items-center gap-2">
							<span className="inline-flex items-center gap-1 text-xs text-destructive">
								<AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
								Failed to load
							</span>
							{onRetry && (
								<Button
									size="sm"
									variant="outline"
									onClick={onRetry}
									className="h-6 gap-1 px-2 text-micro"
								>
									<RotateCw className="h-3 w-3" />
									Retry
								</Button>
							)}
						</div>
					) : isLoading ? (
						<Skeleton className="mt-1 h-5 w-12" />
					) : (
						<div className="flex items-center gap-2">
							<p className="text-2xl font-semibold font-mono leading-tight tabular-nums">
								{typeof value === "number" ? value.toLocaleString() : value}
							</p>
							{trend != null && (
								<span
									className={cn(
										"inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-micro font-medium",
										trend.value > 0 && "bg-success/15 text-success",
										trend.value < 0 && "bg-destructive/15 text-destructive",
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
					{subtitle && !isLoading && !isError && (
						<p className="text-micro text-muted-foreground mt-0.5">{subtitle}</p>
					)}
				</div>
				{href && !isError && (
					<Link
						href={href as never}
						className="relative ml-auto rounded-md p-1 transition-colors hover:bg-muted"
						aria-label={`Go to ${label}`}
					>
						<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
					</Link>
				)}
			</CardContent>
		</Card>
	);
}
