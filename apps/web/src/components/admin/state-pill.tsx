"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAnyUnsaved } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

/**
 * Honest page state in the top bar: `● Unsaved` (any dirty form, amber) >
 * `n unpublished` (never-published blocks, links to Links) > `● Live`. No fake
 * Publish button — new blocks are published from Links. Edits to an already
 * published block are live the moment they save, so they never count here.
 * `Live` is only claimed once `blocks.list` has loaded: a neutral placeholder
 * holds the slot while it loads, and nothing is shown if it failed.
 */
export function StatePill({ className }: { className?: string }) {
	const unsaved = useAnyUnsaved();
	const blocksQuery = useQuery(trpc.blocks.list.queryOptions());
	const draftCount = (blocksQuery.data ?? []).filter((b) => b.status === "draft").length;

	const base = cn(
		"inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-micro font-medium whitespace-nowrap",
		className,
	);

	if (unsaved) {
		return (
			<span
				role="status"
				className={cn(base, "border-warning/40 bg-warning/10 text-warning shadow-glow")}
			>
				<span aria-hidden className="h-1.5 w-1.5 animate-pulse-once rounded-full bg-warning" />
				Unsaved
			</span>
		);
	}
	if (!blocksQuery.data) {
		// Loading: hold the pill's footprint without announcing a state. Errored
		// (no cached data): say nothing rather than a "Live" we can't vouch for.
		if (blocksQuery.isError) return null;
		return (
			<span
				aria-hidden
				className={cn(
					base,
					"w-14 animate-pulse border-border bg-muted/40 motion-reduce:animate-none",
				)}
			/>
		);
	}
	if (draftCount > 0) {
		return (
			<Link
				href="/admin/links?filter=drafts"
				className={cn(
					base,
					"border-border text-muted-foreground transition-colors hover:text-foreground",
					// The only interactive variant: keep the 28px pill but grow the hit
					// area to 44px below md (WCAG 2.5.8) with a pseudo-element.
					"relative after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] md:after:hidden",
				)}
			>
				{draftCount} unpublished
			</Link>
		);
	}
	return (
		<span role="status" className={cn(base, "border-success/30 text-success")}>
			<span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
			Live
		</span>
	);
}
