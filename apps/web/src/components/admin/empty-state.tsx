"use client";

import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	/** Pass `href` to render the action as a link, `onClick` for a button. */
	action?: { label: string; onClick: () => void } | { label: string; href: Route };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
	return (
		<Card>
			<CardContent className="py-16 text-center">
				<div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
					<div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5" />
					<Icon className="relative h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
				</div>
				<p className="text-sm font-semibold">{title}</p>
				<p className="mx-auto mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
					{description}
				</p>
				{action &&
					("href" in action ? (
						<Button
							variant="outline"
							size="sm"
							className="mt-5"
							render={<Link href={action.href} />}
						>
							{action.label}
						</Button>
					) : (
						<Button variant="outline" size="sm" className="mt-5" onClick={action.onClick}>
							{action.label}
						</Button>
					))}
			</CardContent>
		</Card>
	);
}
