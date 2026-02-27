"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Search,
	Globe,
	Save,
	Sparkles,
	ExternalLink,
	CircleDot,
	Filter,
} from "lucide-react";
import { useTheme } from "next-themes";
import { trpc } from "@/utils/trpc";
import { socialBrands, socialBrandMap } from "@linkden/ui/social-brands";
import { getAccessibleIconFill, isLowLuminance } from "@linkden/ui/color-contrast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn, getAdminThemeColors } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { NetworkRow } from "@/components/admin/social/network-row";
import { SectionHeader } from "@/components/admin/section-header";
import {
	type NetworkDraft,
	CATEGORY_LABELS,
	ALL_CATEGORIES,
	CATEGORY_ICONS,
} from "@/components/admin/social/social-constants";

type SocialBrand = (typeof socialBrands)[number];
type SocialItem = SocialBrand & NetworkDraft;

export default function SocialPage() {
	const qc = useQueryClient();
	const { resolvedTheme } = useTheme();
	const [searchQuery, setSearchQuery] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [activeCategory, setActiveCategory] = useState("all");
	const [drafts, setDrafts] = useState<Record<string, NetworkDraft>>({});
	const [initialized, setInitialized] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const [hasAnimated, setHasAnimated] = useState(false);
	const [selectedAnnouncement, setSelectedAnnouncement] = useState("");
	const searchRef = useRef<HTMLDivElement>(null);

	const socialsQuery = useQuery(trpc.social.list.queryOptions());
	const updateBulk = useMutation(trpc.social.updateBulk.mutationOptions());

	const dbRows = socialsQuery.data ?? [];

	// Initialize drafts: merge catalog with DB data
	useEffect(() => {
		if (!initialized && !socialsQuery.isLoading) {
			const initial: Record<string, NetworkDraft> = {};
			for (const brand of socialBrands) {
				initial[brand.slug] = { url: "", isActive: false };
			}
			for (const row of dbRows) {
				if (initial[row.slug] !== undefined) {
					initial[row.slug] = { url: row.url, isActive: row.isActive };
				}
			}
			setDrafts(initial);
			setInitialized(true);
		}
	}, [dbRows, socialsQuery.isLoading, initialized]);

	// Mark animations as done after initial render
	useEffect(() => {
		if (initialized && !hasAnimated) {
			const timer = setTimeout(() => setHasAnimated(true), 1200);
			return () => clearTimeout(timer);
		}
	}, [initialized, hasAnimated]);

	// Close suggestions when clicking outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
				setShowSuggestions(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// Build the merged list
	const allItems = useMemo(() => {
		return socialBrands.map((brand) => {
			const draft = drafts[brand.slug] ?? { url: "", isActive: false };
			return { ...brand, ...draft };
		});
	}, [drafts]);

	// Active networks (active + has URL)
	const activeNetworks = useMemo(() => {
		const list = allItems.filter((s) => s.isActive && s.url);
		list.sort((a, b) => a.name.localeCompare(b.name));
		return list;
	}, [allItems]);

	// Search suggestions for combobox
	const searchSuggestions = useMemo(() => {
		if (!searchQuery) return [];
		const q = searchQuery.toLowerCase();
		return socialBrands
			.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.slug.toLowerCase().includes(q) ||
					s.category.toLowerCase().includes(q),
			)
			.slice(0, 8);
	}, [searchQuery]);

	// Category counts for tab badges
	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: socialBrands.length };
		for (const brand of socialBrands) {
			counts[brand.category] = (counts[brand.category] || 0) + 1;
		}
		return counts;
	}, []);

	// Inactive networks grouped by category (filtered by search and category tab)
	const categoryGroups = useMemo(() => {
		const activeSlugs = new Set(activeNetworks.map((s) => s.slug));
		let inactive = allItems.filter((s) => !activeSlugs.has(s.slug));

		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			inactive = inactive.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.slug.toLowerCase().includes(q) ||
					s.category.toLowerCase().includes(q),
			);
		}

		if (activeCategory !== "all") {
			inactive = inactive.filter((s) => s.category === activeCategory);
		}

		const groups: Record<string, SocialItem[]> = {};
		for (const item of inactive) {
			if (!groups[item.category]) groups[item.category] = [];
			groups[item.category].push(item);
		}

		for (const key of Object.keys(groups)) {
			groups[key].sort((a, b) => a.name.localeCompare(b.name));
		}

		const categoryOrder = Object.keys(CATEGORY_LABELS);
		return categoryOrder
			.filter((cat) => groups[cat]?.length)
			.map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat] || cat, items: groups[cat] }));
	}, [allItems, activeNetworks, searchQuery, activeCategory]);

	// Detect changes vs DB
	const hasChanges = useMemo(() => {
		const dbMap = new Map(dbRows.map((r) => [r.slug, r]));

		for (const brand of socialBrands) {
			const draft = drafts[brand.slug];
			if (!draft) continue;
			const db = dbMap.get(brand.slug);

			if (draft.url) {
				if (!db || db.url !== draft.url || db.isActive !== draft.isActive) {
					return true;
				}
			} else {
				if (db) return true;
			}
		}
		return false;
	}, [dbRows, drafts]);

	const handleUrlChange = (slug: string, url: string) => {
		setDrafts((prev) => ({
			...prev,
			[slug]: { ...prev[slug], url },
		}));
	};

	const handleToggle = (slug: string) => {
		setDrafts((prev) => {
			const current = prev[slug];
			if (!current) return prev;
			return {
				...prev,
				[slug]: { ...current, isActive: !current.isActive },
			};
		});
	};

	const handleSaveAll = async () => {
		const dbMap = new Map(dbRows.map((r) => [r.slug, r]));
		const changes: Array<{ slug: string; url: string; isActive: boolean }> = [];

		for (const brand of socialBrands) {
			const draft = drafts[brand.slug];
			if (!draft) continue;
			const db = dbMap.get(brand.slug);

			if (draft.url) {
				if (!db || db.url !== draft.url || db.isActive !== draft.isActive) {
					changes.push({
						slug: brand.slug,
						url: draft.url,
						isActive: draft.isActive,
					});
				}
			} else if (db) {
				changes.push({
					slug: brand.slug,
					url: "",
					isActive: false,
				});
			}
		}

		if (changes.length === 0) return;

		try {
			await updateBulk.mutateAsync(changes);
			await qc.invalidateQueries({
				queryKey: trpc.social.list.queryOptions().queryKey,
			});
			setInitialized(false);
			toast.success(
				`${changes.length} network${changes.length > 1 ? "s" : ""} updated`,
			);
		} catch {
			toast.error("Failed to save changes");
		}
	};

	const handleSuggestionClick = useCallback((slug: string) => {
		const brand = socialBrands.find((b) => b.slug === slug);
		setSearchQuery("");
		setShowSuggestions(false);
		setHighlightedIndex(-1);
		setSelectedAnnouncement(brand ? `Scrolled to ${brand.name}` : "");
		setTimeout(() => {
			const el = document.getElementById(`network-${slug}`);
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
				el.classList.add("ring-2", "ring-primary/50");
				setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 2000);
			}
		}, 100);
	}, []);

	const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (!showSuggestions || searchSuggestions.length === 0) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setHighlightedIndex((prev) =>
					prev < searchSuggestions.length - 1 ? prev + 1 : 0,
				);
				break;
			case "ArrowUp":
				e.preventDefault();
				setHighlightedIndex((prev) =>
					prev > 0 ? prev - 1 : searchSuggestions.length - 1,
				);
				break;
			case "Enter":
				e.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < searchSuggestions.length) {
					handleSuggestionClick(searchSuggestions[highlightedIndex].slug);
				}
				break;
			case "Escape":
				e.preventDefault();
				setShowSuggestions(false);
				setHighlightedIndex(-1);
				break;
		}
	}, [showSuggestions, searchSuggestions, highlightedIndex, handleSuggestionClick]);

	useUnsavedChanges(hasChanges);

	const activeCount = Object.values(drafts).filter(
		(d) => d.isActive && d.url,
	).length;

	const suggestionsListboxId = "social-search-suggestions";

	// Track running row index for staggered animations
	let rowAnimIndex = 0;

	return (
		<div className="space-y-6">
			{/* Sticky header */}
			<div
				className={cn(
					"sticky top-12 md:top-0 z-10 md:rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 px-3 sm:px-4 py-3 space-y-3",
					!hasAnimated && "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both",
				)}
				style={!hasAnimated ? { animationDelay: "100ms" } : undefined}
				role="banner"
				aria-label="Social Networks"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 min-w-0">
						<h1 className="text-base sm:text-lg font-semibold text-foreground truncate">Social Networks</h1>
						<Badge variant="outline" className="gap-1 border-primary/30 text-primary">
							<CircleDot className="h-3 w-3" aria-hidden="true" />
							{activeCount} active
						</Badge>
					</div>
					<Button
						size="sm"
						variant={hasChanges ? "default" : "outline"}
						onClick={handleSaveAll}
						disabled={!hasChanges || updateBulk.isPending}
						className={cn(
							"transition-all duration-300",
							hasChanges && !updateBulk.isPending && "shadow-lg shadow-primary/25 ring-2 ring-primary/20",
						)}
					>
						<Save className="mr-1.5 h-3.5 w-3.5" />
						<span className="hidden sm:inline">{updateBulk.isPending ? "Saving..." : "Save All Changes"}</span>
						<span className="sm:hidden">{updateBulk.isPending ? "..." : "Save"}</span>
					</Button>
				</div>

				{/* Search + Filter row */}
				<div className="flex items-center gap-2">
					<div className="relative flex-1" ref={searchRef}>
						<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search networks..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setShowSuggestions(true);
								setHighlightedIndex(-1);
							}}
							onFocus={() => searchQuery && setShowSuggestions(true)}
							onKeyDown={handleSearchKeyDown}
							className="pl-8"
							role="combobox"
							aria-label="Search social networks"
							aria-expanded={showSuggestions && searchSuggestions.length > 0}
							aria-haspopup="listbox"
							aria-controls={suggestionsListboxId}
							aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${searchSuggestions[highlightedIndex]?.slug}` : undefined}
						/>
						{/* Live region for suggestion count */}
						<div className="sr-only" aria-live="polite" aria-atomic="true">
							{showSuggestions && searchSuggestions.length > 0
								? `${searchSuggestions.length} suggestion${searchSuggestions.length !== 1 ? "s" : ""} available`
								: searchQuery && showSuggestions
									? "No suggestions"
									: ""}
						</div>
						{/* Live region for suggestion selection */}
						<div className="sr-only" aria-live="assertive" aria-atomic="true">
							{selectedAnnouncement}
						</div>
						{/* Suggestions dropdown */}
						{showSuggestions && searchSuggestions.length > 0 && (
							<div
								id={suggestionsListboxId}
								className="absolute inset-x-0 top-full mt-1 z-20 rounded-xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-2xl shadow-xl overflow-hidden"
								role="listbox"
							>
								{searchSuggestions.map((brand, index) => {
									const needsRing = isLowLuminance(brand.hex);
									const { bg: sugBg, fg: sugFg } = getAdminThemeColors(resolvedTheme);
									const sugFill = getAccessibleIconFill(brand.hex, sugBg, sugFg);
									return (
										<button
											key={brand.slug}
											id={`suggestion-${brand.slug}`}
											type="button"
											role="option"
											aria-selected={index === highlightedIndex}
											onClick={() => handleSuggestionClick(brand.slug)}
											onMouseEnter={() => setHighlightedIndex(index)}
											className={cn(
												"flex w-full items-center gap-3 px-3 py-2.5 text-xs transition-colors border-l-2",
												index === highlightedIndex
													? "bg-accent text-accent-foreground border-l-primary"
													: "border-l-transparent hover:bg-accent/50",
											)}
										>
											<div
												className={cn(
													"flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
													needsRing && "ring-1 ring-border dark:ring-white/20",
												)}
												style={{ backgroundColor: `${brand.hex}15` }}
											>
												<svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
													<path d={brand.svgPath} fill={sugFill} />
												</svg>
											</div>
											<span className="font-medium text-foreground">{brand.name}</span>
											<span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
												{CATEGORY_LABELS[brand.category] || brand.category}
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Category filter dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								"inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-xs font-medium transition-colors",
								activeCategory !== "all"
									? "border-primary/30 bg-primary/10 text-primary"
									: "border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
							)}
						>
							<Filter className="h-3.5 w-3.5 shrink-0" />
							<span className="hidden sm:inline truncate max-w-[100px]">{activeCategory === "all" ? "Filter" : CATEGORY_LABELS[activeCategory] || activeCategory}</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="min-w-[160px] sm:min-w-[180px]">
							{ALL_CATEGORIES.map((cat) => {
								const CatIcon = cat !== "all" ? CATEGORY_ICONS[cat] : Globe;
								const isActive = activeCategory === cat;
								return (
									<DropdownMenuItem
										key={cat}
										onClick={() => setActiveCategory(cat)}
										className={cn(isActive && "bg-accent text-accent-foreground")}
									>
										{CatIcon && <CatIcon className="h-3.5 w-3.5" aria-hidden="true" />}
										{cat === "all" ? "All Categories" : CATEGORY_LABELS[cat] || cat}
										<span className="ml-auto text-[10px] opacity-60">{categoryCounts[cat] ?? 0}</span>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Error state */}
			{socialsQuery.isError && (
				<Card>
					<CardContent className="py-4 text-center">
						<p className="text-sm text-destructive">
							Failed to load saved networks — changes may not reflect current
							state
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-2"
							onClick={() => socialsQuery.refetch()}
						>
							Retry
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Active Networks card */}
			{activeNetworks.length > 0 && (
				<Card
					className={cn(
						"border-t-2 border-t-primary bg-gradient-to-b from-primary/5 to-transparent",
						!hasAnimated && "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both",
					)}
					style={!hasAnimated ? { animationDelay: "175ms" } : undefined}
				>
					<SectionHeader
						icon={Globe}
						title="Active Networks"
						count={activeNetworks.length}
						variant="primary"
					/>
					<CardContent className="p-0 px-1.5 sm:px-3 pb-3" role="list" aria-label="Active social networks">
						<div className="space-y-2.5">
							{activeNetworks.map((social) => {
								const draft = drafts[social.slug] ?? { url: "", isActive: false };
								const brand = socialBrands.find((b) => b.slug === social.slug)!;
								const delay = !hasAnimated ? rowAnimIndex++ * 40 + 250 : undefined;
								return (
									<div key={social.slug} id={`network-${social.slug}`} className="rounded-xl transition-all">
										<NetworkRow
											social={brand}
											draft={draft}
											onUrlChange={handleUrlChange}
											onToggle={handleToggle}
											animationDelay={delay}
										/>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Category group cards */}
			{categoryGroups.length === 0 && activeNetworks.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="py-16 text-center">
						<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
							<Sparkles className="h-7 w-7 text-primary" />
						</div>
						<p className="text-sm font-medium text-foreground">No networks found</p>
						<p className="mx-auto mt-1.5 max-w-[240px] text-xs text-muted-foreground">
							Try a different search term or category filter to discover social networks
						</p>
					</CardContent>
				</Card>
			) : (
				categoryGroups.map((group, groupIdx) => {
					const CategoryIcon = CATEGORY_ICONS[group.category];
					const cardDelay = !hasAnimated ? (groupIdx + 1) * 75 + 250 : undefined;
					return (
						<Card
							key={group.category}
							className={cn(
								!hasAnimated && "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both",
							)}
							style={cardDelay !== undefined ? { animationDelay: `${cardDelay}ms` } : undefined}
						>
							{CategoryIcon && (
								<SectionHeader
									icon={CategoryIcon}
									title={group.label}
									count={group.items.length}
									variant="muted"
								/>
							)}
							<CardContent
								className="p-0 px-1.5 sm:px-3 pb-3"
								role="list"
								aria-label={`${group.label} networks`}
							>
								<div className="space-y-2">
									{group.items.map((social) => {
										const draft = drafts[social.slug] ?? { url: "", isActive: false };
										const brand = socialBrands.find((b) => b.slug === social.slug)!;
										const delay = !hasAnimated ? rowAnimIndex++ * 40 + 300 : undefined;
										return (
											<div key={social.slug} id={`network-${social.slug}`} className="rounded-xl transition-all">
												<NetworkRow
													social={brand}
													draft={draft}
													onUrlChange={handleUrlChange}
													onToggle={handleToggle}
													animationDelay={delay}
												/>
											</div>
										);
									})}
								</div>
							</CardContent>
						</Card>
					);
				})
			)}
		</div>
	);
}
