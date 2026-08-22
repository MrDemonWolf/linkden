"use client";

import { BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
				<div className="flex items-start gap-3 rounded-lg border border-border p-3">
					<div className="min-w-0 flex-1">
						<Label htmlFor="a-verified" className="text-xs font-medium">
							Show verified badge
						</Label>
						<p className="mt-0.5 text-micro leading-tight text-muted-foreground">
							Displays a blue checkmark next to your name on the public page
						</p>
					</div>
					<Switch
						id="a-verified"
						checked={verifiedBadge}
						onCheckedChange={onVerifiedBadgeChange}
						aria-label="Show verified badge"
					/>
				</div>
			</CardContent>
		</Card>
	);
}
