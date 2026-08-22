"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAnyUnsaved } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

/**
 * Honest page state in the top bar: `● Unsaved` (any dirty form, amber) >
 * `n drafts` (unpublished blocks, links to Links) > `● Live`. No fake Publish
 * button — block drafts are published from Links.
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
	if (draftCount > 0) {
		return (
			<Link
				href="/admin/links?filter=drafts"
				className={cn(
					base,
					"border-border text-muted-foreground transition-colors hover:text-foreground",
				)}
			>
				{draftCount} draft{draftCount === 1 ? "" : "s"}
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
