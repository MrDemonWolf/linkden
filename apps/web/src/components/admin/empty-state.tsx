"use client";

import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	/** Pass `href` to render the action as a link, `onClick` for a button. */
	action?: { label: string; onClick: () => void } | { label: string; href: Route };
}

/**
 * Admin empty state. The layout, spacing and typography come from the shared
 * `Empty` primitives; the `Card` wrapper is kept so the block sits on the same
 * matte surface as everything else on an admin page (the primitive's own
 * dashed-border treatment would read as a drop target here).
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
	return (
		<Card>
			<CardContent>
				<Empty className="py-12">
					<EmptyHeader>
						<EmptyMedia className="relative mb-0 size-14">
							<div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5" />
							<Icon className="relative size-7 text-muted-foreground/50" aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle className="font-semibold">{title}</EmptyTitle>
						<EmptyDescription className="max-w-xs">{description}</EmptyDescription>
					</EmptyHeader>
					{action && (
						<EmptyContent>
							{"href" in action ? (
								<Button
									variant="outline"
									size="sm"
									nativeButton={false}
									render={<Link href={action.href} />}
								>
									{action.label}
								</Button>
							) : (
								<Button variant="outline" size="sm" onClick={action.onClick}>
									{action.label}
								</Button>
							)}
						</EmptyContent>
					)}
				</Empty>
			</CardContent>
		</Card>
	);
}
