"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type Period = "7d" | "30d" | "90d" | "all";

const PERIODS: { value: Period; label: string }[] = [
	{ value: "7d", label: "7d" },
	{ value: "30d", label: "30d" },
	{ value: "90d", label: "90d" },
	{ value: "all", label: "All" },
];

interface PeriodSelectorProps {
	value: Period;
	onChange: (period: Period) => void;
	className?: string;
}

/**
 * Segmented period picker on the shared `ToggleGroup`. Base UI's `multiple`
 * defaults to `false`, which is the single-select ("type=single") behaviour —
 * pressing the active segment would otherwise clear the group, so an empty
 * `next` is ignored and the control always keeps exactly one value.
 *
 * Sizing/focus/disabled states all come from `toggleVariants`; only the track
 * and the pressed surface are set here.
 */
export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
	return (
		<ToggleGroup
			value={[value]}
			onValueChange={(next) => {
				const picked = next[0];
				if (picked) onChange(picked as Period);
			}}
			spacing={1}
			aria-label="Time period"
			className={cn("rounded-lg bg-muted/50 p-1", className)}
		>
			{PERIODS.map((p) => (
				<ToggleGroupItem
					key={p.value}
					value={p.value}
					className="min-h-11 min-w-11 px-3 text-muted-foreground md:min-h-8 md:min-w-8 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm hover:aria-pressed:bg-card"
				>
					{p.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
