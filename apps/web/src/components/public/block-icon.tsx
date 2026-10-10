"use client";

import { createElement, lazy, type ReactNode, Suspense } from "react";
import { cn } from "@/lib/utils";

/**
 * A block icon resolved on the server (lib/block-icons.ts): a brand glyph's
 * single path, or a lucide icon's element list. Plain JSON, so it crosses the
 * RSC boundary as part of the page payload.
 */
export type ResolvedBlockIcon = { kind: "path"; d: string } | { kind: "lucide"; node: IconNode[] };

/** One lucide SVG element: tag, attributes and (rarely) nested children. */
export type IconNode = [tag: string, attrs: Record<string, string | number>, children?: IconNode[]];

function renderIconNodes(nodes: IconNode[]): ReactNode[] {
	return nodes.map(([tag, attrs, children], i) =>
		createElement(
			tag,
			{ ...attrs, key: (attrs.key as string | undefined) ?? i },
			children?.length ? renderIconNodes(children) : undefined,
		),
	);
}

const DynamicBlockIcon = lazy(() => import("./block-icon-dynamic"));

/**
 * Renders a block's `icon` column: `brand:<slug>` (social brand glyph),
 * `lucide:<name>` or a legacy bare lucide name. Unknown values render nothing.
 *
 * `svg` is the server-resolved glyph: an object draws a static <svg> (no
 * client icon tables, no pop-in), `null` means the server found no such icon.
 * When it is absent (admin preview, icon picker) the lazily loaded
 * `block-icon-dynamic` resolves the name in the browser.
 */
export function BlockIcon({
	icon,
	svg,
	className,
}: {
	icon: string | null;
	svg?: ResolvedBlockIcon | null;
	className?: string;
}) {
	if (!icon || svg === null) return null;

	if (svg) {
		if (svg.kind === "path") {
			return (
				<svg
					viewBox="0 0 24 24"
					fill="currentColor"
					className={cn("h-5 w-5 shrink-0", className)}
					aria-hidden="true"
				>
					<path d={svg.d} />
				</svg>
			);
		}
		return (
			<span className={cn("inline-flex h-5 w-5 shrink-0", className)} aria-hidden="true">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-full w-full"
					aria-hidden="true"
				>
					{renderIconNodes(svg.node)}
				</svg>
			</span>
		);
	}

	return (
		<Suspense
			fallback={
				<span className={cn("inline-flex h-5 w-5 shrink-0", className)} aria-hidden="true" />
			}
		>
			<DynamicBlockIcon icon={icon} className={className} />
		</Suspense>
	);
}
