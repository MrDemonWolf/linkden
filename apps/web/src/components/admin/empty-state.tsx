"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<Card>
			<CardContent className="py-12 text-center">
				<Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-xs text-muted-foreground">{description}</p>
				{action && (
					<Button
						variant="outline"
						size="sm"
						className="mt-4"
						onClick={action.onClick}
					>
						{action.label}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
