"use client";

import { PanelRightClose, PanelRightOpen, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { PagePreview } from "@/components/admin/page-preview";
import { usePreviewRegistration } from "@/components/admin/preview-slot";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "admin.preview.collapsed";

/**
 * Shell-owned right column (≥lg) for pages that called `usePreviewSlot`.
 * Sticky under the top bar; one bordered panel on the dot-grid "desk" ground
 * with a "Preview" header row (controls + collapse chevron on the right) and
 * the phone centered under it. Collapse is persisted.
 * xl: the page's panel (block editor) stacks above the phone. lg–xl: the
 * column is a slot — panel OR phone, with a header toggle to peek at the phone.
 * Returns null below lg so the page-owned Sheet is the only editor mounted.
 */
export function PreviewColumn() {
	const reg = usePreviewRegistration();
	const isLg = useMediaQuery("(min-width: 1024px)", true);
	const isXl = useMediaQuery("(min-width: 1280px)", true);
	const [collapsed, setCollapsed] = useState(false);
	const [peek, setPeek] = useState(false);
	const [alt, setAlt] = useState(false);

	useEffect(() => {
		setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
	}, []);
	const toggleCollapsed = () => {
		setCollapsed((c) => {
			localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
			return !c;
		});
	};

	if (!reg || !isLg) return null;

	// lg–xl slot: the panel takes the phone's place unless the user peeks.
	const panelOnly = !!reg.panel && !isXl && !peek;
	const showPhone = !panelOnly;
	const showPanel = !!reg.panel && (isXl || !peek);
	const showAlt = showPhone && alt && !!reg.altView;
	// At xl, when the phone is the first thing in the panel, its own toolbar row
	// is the header (label + mode/copy/open + these controls). Otherwise the
	// column draws the header itself (unscaled at lg) and the phone toolbar
	// drops its label.
	const phoneIsHeader = isXl && showPhone && !showAlt && !showPanel;

	const controls = (
		<>
			{reg.altView && showPhone && (
				<Button variant="outline" size="sm" aria-pressed={alt} onClick={() => setAlt((a) => !a)}>
					{alt ? "Phone" : reg.altView.label}
				</Button>
			)}
			{reg.panel && !isXl && (
				<Button variant="ghost" size="sm" onClick={() => setPeek((p) => !p)}>
					<Smartphone className="h-3.5 w-3.5" />
					{peek ? "Back to editor" : "Show preview"}
				</Button>
			)}
			<Tooltip content="Hide preview" side="left">
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleCollapsed}
					aria-label="Hide preview"
					className="text-muted-foreground"
				>
					<PanelRightClose className="h-4 w-4" />
				</Button>
			</Tooltip>
		</>
	);

	// One aside for both states so the width animates (220ms); the content that
	// mounts on each side fades in over 120ms.
	return (
		<aside
			aria-label="Preview"
			className={cn(
				"sticky top-[calc(52px+1.5rem)] max-h-[calc(100dvh-52px-3rem)] shrink-0 overflow-x-hidden overflow-y-auto transition-[width] duration-220 ease-out",
				collapsed ? "w-10" : "w-[300px] xl:w-[372px]",
			)}
		>
			{collapsed ? (
				<Tooltip content="Show preview" side="left">
					<button
						type="button"
						onClick={toggleCollapsed}
						className="flex h-28 w-10 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground animate-in fade-in-0 duration-120"
						aria-label="Show preview"
					>
						<PanelRightOpen className="h-4 w-4" />
						<Smartphone className="h-4 w-4" />
					</button>
				</Tooltip>
			) : (
				<div className="rounded-2xl border border-border bg-surface-2/60 bg-[radial-gradient(var(--canvas-dot)_1px,transparent_1px)] bg-[size:12px_12px] p-4 animate-in fade-in-0 duration-120">
					{!phoneIsHeader && (
						<div className="flex min-h-8 items-center justify-between gap-2">
							<span className="text-small font-medium text-foreground">Preview</span>
							<div className="flex shrink-0 items-center gap-1">{controls}</div>
						</div>
					)}

					{showPanel && <div className="mt-4">{reg.panel}</div>}

					{showAlt && reg.altView && <div className="mt-4">{reg.altView.node}</div>}

					{showPhone && !showAlt && (
						// One render, scaled down to fit the 300px column at lg.
						<div
							className={cn(
								!phoneIsHeader && "mt-4",
								"lg:max-xl:origin-top-left lg:max-xl:scale-[0.78]",
							)}
						>
							<PagePreview
								overrides={reg.overrides}
								mode={reg.mode}
								onModeChange={reg.onModeChange}
								headerLabel={phoneIsHeader ? undefined : null}
								headerEnd={phoneIsHeader ? controls : undefined}
							/>
						</div>
					)}
				</div>
			)}
		</aside>
	);
}
