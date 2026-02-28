"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
}

export function StatCard({
	icon: Icon,
	label,
	value,
	iconColor = "text-primary",
	iconBg = "bg-primary/10",
	href,
	isLoading,
}: StatCardProps) {
	return (
		<Card size="sm" className="group relative overflow-hidden">
			{/* Gradient accent bar */}
			<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
			<CardContent className="flex items-center gap-3">
				<div
					className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconBg)}
					aria-hidden="true"
				>
					<Icon className={cn("h-4 w-4", iconColor)} />
				</div>
				<div className="min-w-0">
					<p className="text-[11px] text-muted-foreground">{label}</p>
					{isLoading ? (
						<Skeleton className="mt-1 h-5 w-12" />
					) : (
						<p className="text-lg font-semibold leading-tight tabular-nums">
							{typeof value === "number" ? value.toLocaleString() : value}
						</p>
					)}
				</div>
				{href && (
					<Link
						href={href as "/admin/contacts"}
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
