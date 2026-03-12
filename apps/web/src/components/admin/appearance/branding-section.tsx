"use client";

import { BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function VerifiedBadgeSection({
	verifiedBadge,
	onVerifiedBadgeChange,
}: {
	verifiedBadge: boolean;
	onVerifiedBadgeChange: (value: boolean) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<BadgeCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Verified Badge
					</CardTitle>
				</h2>
			</CardHeader>
			<CardContent>
				<label
					htmlFor="a-verified"
					className="flex items-start gap-3 cursor-pointer group"
				>
					<div className="min-w-0 flex-1">
						<span className="text-xs font-medium group-hover:text-foreground transition-colors">
							Show verified badge
						</span>
						<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
							Displays a blue checkmark next to your name
						</p>
					</div>
					<button
						id="a-verified"
						type="button"
						role="switch"
						aria-checked={verifiedBadge}
						aria-label="Show verified badge"
						onClick={() => onVerifiedBadgeChange(!verifiedBadge)}
						className={cn(
							"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
							verifiedBadge ? "bg-primary" : "bg-muted",
						)}
					>
						<span
							className={cn(
								"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
								verifiedBadge ? "translate-x-[18px]" : "translate-x-[3px]",
							)}
						/>
					</button>
				</label>
			</CardContent>
		</Card>
	);
}
