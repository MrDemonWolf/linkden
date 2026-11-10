"use client";

import { PanelRightClose, PanelRightOpen, Eye } from "lucide-react";
import { isValidElement, useEffect, useState } from "react";
import { PagePreview } from "@/components/admin/page-preview";
import { usePreviewRegistration } from "@/components/admin/preview-slot";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "admin.preview.collapsed";

/**
 * Shell-owned right column (≥lg) for pages that called `usePreviewSlot`.
 * Sticky under the top bar; one bordered panel on a quiet preview canvas
 * with a "Preview" header row (controls + collapse chevron on the right) and
 * the page preview centered under it. Collapse is persisted.
 * xl: the page's panel (block editor) stacks above the page preview. lg–xl: the
 * column is a slot — panel OR page preview, with a header toggle to peek at the page preview.
 * The panel stays mounted (hidden) while peeking or collapsed: it owns the
 * block editor's in-progress fields, and unmounting it would discard them.
 * Returns null below lg so the page-owned Sheet is the only editor mounted.
 */
export function PreviewColumn() {
	const reg = usePreviewRegistration();
	const isLg = useMediaQuery("(min-width: 1024px)", true);
	const isXl = useMediaQuery("(min-width: 1280px)", true);
	const [collapsed, setCollapsed] = useState(false);
	// Peek belongs to one panel (the editor is keyed by block id): opening another
	// block ends it, and so does closing the editor — reopening the same block
	// must show the editor, not the page preview.
	const panelKey = reg?.panel
		? isValidElement(reg.panel) && reg.panel.key != null
			? reg.panel.key
			: "panel"
		: null;
	const [peekFor, setPeekFor] = useState<string | null>(null);
	if (panelKey === null && peekFor !== null) setPeekFor(null);
	const peek = panelKey !== null && peekFor === panelKey;
	const [alt, setAlt] = useState(false);

	useEffect(() => {
		// Storage can throw (site data blocked); this column sits in the layout,
		// where a throw would take down the whole console.
		try {
			setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
		} catch {}
	}, []);
	const toggleCollapsed = () => {
		setCollapsed((c) => {
			try {
				localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
			} catch {}
			return !c;
		});
	};

	if (!reg || !isLg) return null;

	// lg–xl slot: the panel takes the page preview's place unless the user peeks.
	const panelOnly = !!reg.panel && !isXl && !peek;
	const showPreview = !panelOnly;
	const showPanel = !!reg.panel && (isXl || !peek);
	const showAlt = showPreview && alt && !!reg.altView;
	const controls = (
		<>
			{reg.altView && showPreview && (
				<Button variant="outline" size="sm" aria-pressed={alt} onClick={() => setAlt((a) => !a)}>
					{alt ? "Page" : reg.altView.label}
				</Button>
			)}
			{reg.panel && !isXl && (
				<Button variant="ghost" size="sm" onClick={() => setPeekFor(peek ? null : panelKey)}>
					<Eye className="h-3.5 w-3.5" />
					{peek ? "Back to editor" : "Show preview"}
				</Button>
			)}
			<TooltipHint content="Hide preview" side="left">
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleCollapsed}
					aria-label="Hide preview"
					className="text-muted-foreground"
				>
					<PanelRightClose className="h-4 w-4" />
				</Button>
			</TooltipHint>
		</>
	);

	// One aside for both states so the width animates (220ms); the content that
	// mounts on each side fades in over 120ms.
	return (
		<aside
			aria-label="Preview"
			className={cn(
				"sticky top-[calc(64px+1.5rem)] max-h-[calc(100dvh-64px-3rem)] shrink-0 overflow-x-hidden overflow-y-auto transition-[width] duration-220 ease-out",
				collapsed
					? "w-10 pointer-coarse:w-11"
					: reg.size === "wide"
						? "w-[425px]"
						: "w-[300px] xl:w-[372px]",
			)}
		>
			{collapsed && (
				<TooltipHint content="Show preview" side="left">
					<button
						type="button"
						onClick={toggleCollapsed}
						className="flex h-28 w-10 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground pointer-coarse:w-11"
						aria-label="Show preview"
					>
						<PanelRightOpen className="h-4 w-4" />
						<Eye className="h-4 w-4" />
					</button>
				</TooltipHint>
			)}
			{/* Always rendered (hidden while collapsed) so the panel below keeps its
			    place in the tree — and with it the editor's unsaved state. */}
			<div
				className={cn(
					"overflow-hidden rounded-2xl border border-border bg-card",
					collapsed && "hidden",
				)}
			>
				<div className="flex min-h-14 items-center justify-between gap-2 border-b border-border px-4 py-2">
					<span className="text-small font-medium text-foreground">Preview</span>
					<div className="flex shrink-0 items-center gap-1">{controls}</div>
				</div>
				<div className="space-y-4 bg-muted/30 p-4">
					{reg.panel && <div className={cn(!showPanel && "hidden")}>{reg.panel}</div>}

					{!collapsed && showAlt && reg.altView && <div>{reg.altView.node}</div>}

					{!collapsed && showPreview && !showAlt && (
						<div>
							{reg.preview ?? (
								<PagePreview
									overrides={reg.overrides}
									mode={reg.mode}
									onModeChange={reg.onModeChange}
									headerLabel={null}
								/>
							)}
						</div>
					)}
				</div>
			</div>
		</aside>
	);
}
