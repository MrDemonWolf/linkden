"use client";

import { Card, CardContent } from "@/components/ui/card";

interface PageSectionProps {
	id?: string;
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description?: string;
	children: React.ReactNode;
}

export function PageSection({
	id,
	icon: Icon,
	title,
	description,
	children,
}: PageSectionProps) {
	return (
		<section id={id} className="scroll-mt-6" aria-labelledby={id ? `${id}-title` : undefined}>
			<div className="mb-4">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
						<Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
					</div>
					<h2 id={id ? `${id}-title` : undefined} className="text-sm font-semibold tracking-tight">{title}</h2>
				</div>
				{description && (
					<p className="mt-1 ml-9 text-xs text-muted-foreground">
						{description}
					</p>
				)}
			</div>
			<Card className="overflow-hidden">
				<CardContent className="space-y-4 p-5">{children}</CardContent>
			</Card>
		</section>
	);
}
