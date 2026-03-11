"use client";

import { cn } from "@/lib/utils";

export type Period = "7d" | "30d" | "90d";

const PERIODS: { value: Period; label: string }[] = [
	{ value: "7d", label: "7d" },
	{ value: "30d", label: "30d" },
	{ value: "90d", label: "90d" },
];

interface PeriodSelectorProps {
	value: Period;
	onChange: (period: Period) => void;
	className?: string;
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
	return (
		<div className={cn("flex gap-1 rounded-lg bg-muted/50 p-1 w-fit", className)}>
			{PERIODS.map((p) => (
				<button
					key={p.value}
					type="button"
					onClick={() => onChange(p.value)}
					aria-pressed={value === p.value}
					className={cn(
						"rounded-md px-3 py-1.5 text-xs font-medium transition-all",
						value === p.value
							? "bg-white dark:bg-white/15 shadow-sm text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{p.label}
				</button>
			))}
		</div>
	);
}
