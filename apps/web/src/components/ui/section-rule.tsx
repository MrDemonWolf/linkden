import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Section title with the Signal dash and a hairline that runs to the edge.
 * Shared structural motif for public section headers and admin group labels.
 * Colors come from CSS vars so it works inside the public `.ld-page` (which
 * sets --ld-* vars) and the admin (semantic tokens) alike via `className`.
 */
export function SectionRule({
	children,
	as: Tag = "h2",
	className,
	ruleClassName,
}: {
	children: ReactNode;
	as?: "h1" | "h2" | "h3" | "h4" | "p" | "div";
	className?: string;
	ruleClassName?: string;
}) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			<span aria-hidden className="h-0.5 w-4 shrink-0 rounded-full bg-[image:var(--signal)]" />
			<Tag className="shrink-0 font-display font-semibold tracking-tight">{children}</Tag>
			<span aria-hidden className={cn("h-px min-w-4 flex-1 bg-[color:var(--rule)]", ruleClassName)} />
		</div>
	);
}
