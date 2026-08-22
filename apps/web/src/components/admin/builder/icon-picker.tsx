"use client";

import { Popover } from "@base-ui/react/popover";
import { socialBrands } from "@linkden/ui/social-brands";
import { ChevronDown, Search } from "lucide-react";
import { DynamicIcon, dynamicIconImports, type IconName } from "lucide-react/dynamic";
import { useMemo, useRef, useState } from "react";
import { BlockIcon } from "@/components/public/block-icon";
import { Input } from "@/components/ui/input";
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

						<div className="min-h-0 flex-1 overflow-y-auto">
							{tab === "icons" ? (
								lucideMatches.length === 0 ? (
									<p className="px-1 py-4 text-center text-small text-muted-foreground">
										No icons match “{query}”.
									</p>
								) : (
									<div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
										{lucideMatches.map((name) => {
											const next = `lucide:${name}`;
											const selected = value === next || value === name;
											return (
												<button
													key={name}
													type="button"
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
							) : brandMatches.length === 0 ? (
								<p className="px-1 py-4 text-center text-small text-muted-foreground">
									No brands match “{query}”.
								</p>
							) : (
								<div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
									{brandMatches.map((brand) => {
										const next = `brand:${brand.slug}`;
										const selected = value === next;
										return (
											<button
												key={brand.slug}
												type="button"
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
						</div>

						{tab === "icons" && lucideMatches.length >= MAX_RESULTS && (
							<p className="text-micro text-muted-foreground">
								Showing the first {MAX_RESULTS} — keep typing to narrow it down.
							</p>
						)}

						<div className="flex items-center justify-between gap-2 border-t border-border pt-2">
							<button
								type="button"
								onClick={() => pick("")}
								disabled={!value}
								className="min-h-11 rounded-lg px-3 text-small font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 md:min-h-8"
							>
								None
							</button>
							<Popover.Close className="min-h-11 rounded-lg px-3 text-small font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:min-h-8">
								Done
							</Popover.Close>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
