"use client";

import { Popover } from "@base-ui/react/popover";
import { socialBrands } from "@linkden/ui/social-brands";
import { ChevronDown, Search } from "lucide-react";
import { DynamicIcon, dynamicIconImports, type IconName } from "lucide-react/dynamic";
import { useMemo, useRef, useState } from "react";
import { BlockIcon } from "@/components/public/block-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Every lucide glyph name, kebab-case, loaded on demand through DynamicIcon. */
const LUCIDE_NAMES = Object.keys(dynamicIconImports) as IconName[];

/** Cap the rendered grid so a blank search doesn't mount 1,500 lazy icons. */
const MAX_RESULTS = 60;

type Tab = "icons" | "brands";

function humanize(name: string) {
	return name.replace(/-/g, " ");
}

/**
 * Roving focus for the icon grids (ARIA toolbar pattern): one Tab stop (the
 * selected icon, else the first), Arrow keys move between cells, Home/End
 * jump. Up/Down use the rendered column count, since the grid is auto-fill.
 */
function moveGridFocus(e: React.KeyboardEvent<HTMLDivElement>) {
	const cells = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
	const current = cells.indexOf(document.activeElement as HTMLButtonElement);
	if (current < 0 || cells.length === 0) return;
	const firstTop = cells[0]?.offsetTop;
	const columns = Math.max(1, cells.filter((c) => c.offsetTop === firstTop).length);
	let next = current;
	switch (e.key) {
		case "ArrowRight":
			next = Math.min(cells.length - 1, current + 1);
			break;
		case "ArrowLeft":
			next = Math.max(0, current - 1);
			break;
		case "ArrowDown":
			next = Math.min(cells.length - 1, current + columns);
			break;
		case "ArrowUp":
			next = Math.max(0, current - columns);
			break;
		case "Home":
			next = 0;
			break;
		case "End":
			next = cells.length - 1;
			break;
		default:
			return;
	}
	e.preventDefault();
	cells[next]?.focus();
}

/** Tab stop index for roving focus: the selected cell, else the first one. */
function rovingTabIndex(index: number, selected: boolean, hasSelection: boolean) {
	return (hasSelection ? selected : index === 0) ? 0 : -1;
}

/** Label shown on the trigger for the current `icon` column value. */
function describeIcon(value: string): string | null {
	if (!value) return null;
	if (value.startsWith("brand:")) {
		const slug = value.slice("brand:".length);
		return socialBrands.find((b) => b.slug === slug)?.name ?? slug;
	}
	return humanize(value.startsWith("lucide:") ? value.slice("lucide:".length) : value);
}

/**
 * Picks a block icon and writes it in the canonical `lucide:<name>` /
 * `brand:<slug>` format the validators accept. The trigger renders the live
 * `BlockIcon` so what the admin sees is exactly what the public page draws.
 */
export function IconPicker({
	id,
	value,
	onChange,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [tab, setTab] = useState<Tab>(value.startsWith("brand:") ? "brands" : "icons");
	const searchRef = useRef<HTMLInputElement>(null);

	const q = query.trim().toLowerCase();

	const lucideMatches = useMemo(() => {
		if (!q) return LUCIDE_NAMES.slice(0, MAX_RESULTS);
		const out: IconName[] = [];
		for (const name of LUCIDE_NAMES) {
			if (name.includes(q)) {
				out.push(name);
				if (out.length >= MAX_RESULTS) break;
			}
		}
		return out;
	}, [q]);

	const brandMatches = useMemo(() => {
		if (!q) return socialBrands;
		return socialBrands.filter((b) => b.slug.includes(q) || b.name.toLowerCase().includes(q));
	}, [q]);

	const pick = (next: string) => {
		onChange(next);
		setOpen(false);
	};

	const label = describeIcon(value);
	const lucideHasSelection = lucideMatches.some((n) => value === `lucide:${n}` || value === n);
	const brandHasSelection = brandMatches.some((b) => value === `brand:${b.slug}`);
	// Announced to screen readers as the search narrows the grid; sighted users
	// see the grid itself change, so this line stays visually subtle.
	const resultSummary =
		tab === "icons"
			? lucideMatches.length === 0
				? `No icons match “${query}”.`
				: lucideMatches.length >= MAX_RESULTS
					? `Showing the first ${MAX_RESULTS} icons — keep typing to narrow it down.`
					: `${lucideMatches.length} icon${lucideMatches.length === 1 ? "" : "s"} match.`
			: brandMatches.length === 0
				? `No brands match “${query}”.`
				: `${brandMatches.length} brand${brandMatches.length === 1 ? "" : "s"} match.`;

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger
				id={id}
				className={cn(
					"dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-offset-background",
					"flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border bg-transparent px-2.5 text-left text-base backdrop-blur-sm transition-colors outline-none",
					"focus-visible:ring-2 focus-visible:ring-offset-2 md:h-8 md:text-sm",
				)}
			>
				<span className="flex h-5 w-5 shrink-0 items-center justify-center text-foreground">
					{value ? (
						<BlockIcon icon={value} />
					) : (
						<span className="h-4 w-4 rounded-sm border border-dashed border-muted-foreground/50" />
					)}
				</span>
				<span
					className={cn("min-w-0 flex-1 truncate capitalize", !label && "text-muted-foreground")}
				>
					{label ?? "Choose an icon"}
				</span>
				<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Positioner
					side="bottom"
					align="start"
					sideOffset={4}
					collisionPadding={8}
					className="z-50 outline-none"
				>
					<Popover.Popup
						initialFocus={searchRef}
						aria-label="Icon picker"
						className={cn(
							"flex max-h-[var(--available-height)] w-[min(22rem,calc(100vw-1rem))] flex-col gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",
							"data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 duration-150",
						)}
					>
						<div className="relative">
							<Search
								className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								ref={searchRef}
								type="search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search icons"
								aria-label="Search icons"
								autoComplete="off"
								className="pl-8"
							/>
						</div>

						<Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
							<TabsList variant="pills" aria-label="Icon source">
								<TabsTrigger value="icons" className="min-h-11 md:min-h-8">
									Icons
								</TabsTrigger>
								<TabsTrigger value="brands" className="min-h-11 md:min-h-8">
									Brands
								</TabsTrigger>
							</TabsList>
						</Tabs>

						<p role="status" className="text-micro text-muted-foreground">
							{resultSummary}
						</p>

						{/* The cap lives on the ScrollArea's viewport, not its root: the
						    root's height is content-derived here, so a `max-h-*` there would
						    clip without ever scrolling. `min-h-0 flex-1` still lets the box
						    shrink below the cap when the popup itself runs out of room. */}
						<ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-64">
							{tab === "icons" ? (
								lucideMatches.length === 0 ? null : (
									<div
										role="toolbar"
										aria-label="Icons"
										onKeyDown={moveGridFocus}
										className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1 pr-2.5"
									>
										{lucideMatches.map((name, index) => {
											const next = `lucide:${name}`;
											const selected = value === next || value === name;
											return (
												<button
													key={name}
													type="button"
													tabIndex={rovingTabIndex(index, selected, lucideHasSelection)}
													onClick={() => pick(next)}
													aria-label={humanize(name)}
													aria-pressed={selected}
													title={humanize(name)}
													className={cn(
														"flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
														"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
														selected
															? "border-primary bg-primary/15 text-primary"
															: "border-transparent text-foreground hover:bg-muted",
													)}
												>
													<DynamicIcon name={name} className="h-5 w-5" strokeWidth={2} />
												</button>
											);
										})}
									</div>
								)
							) : brandMatches.length === 0 ? null : (
								<div
									role="toolbar"
									aria-label="Brands"
									onKeyDown={moveGridFocus}
									className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1 pr-2.5"
								>
									{brandMatches.map((brand, index) => {
										const next = `brand:${brand.slug}`;
										const selected = value === next;
										return (
											<button
												key={brand.slug}
												type="button"
												tabIndex={rovingTabIndex(index, selected, brandHasSelection)}
												onClick={() => pick(next)}
												aria-label={brand.name}
												aria-pressed={selected}
												title={brand.name}
												className={cn(
													"flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
													"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
													selected
														? "border-primary bg-primary/15 text-primary"
														: "border-transparent text-foreground hover:bg-muted",
												)}
											>
												<svg
													viewBox="0 0 24 24"
													fill="currentColor"
													className="h-5 w-5"
													aria-hidden="true"
												>
													<path d={brand.svgPath} />
												</svg>
											</button>
										);
									})}
								</div>
							)}
						</ScrollArea>

						{/* Footer actions ride the shared Button so their height, focus ring
						    and disabled state match every other control in the panel. */}
						<div className="flex items-center justify-between gap-2 border-t border-border pt-2">
							<Button
								variant="ghost"
								onClick={() => pick("")}
								disabled={!value}
								className="text-muted-foreground"
							>
								None
							</Button>
							<Popover.Close render={<Button variant="ghost" className="text-muted-foreground" />}>
								Done
							</Popover.Close>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
