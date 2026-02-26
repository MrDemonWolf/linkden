"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Globe, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { trpc } from "@/utils/trpc";
import { socialBrands, socialBrandMap } from "@linkden/ui/social-brands";
import { getAccessibleIconFill, isLowLuminance } from "@linkden/ui/color-contrast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NetworkDraft {
	url: string;
	isActive: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
	social: "Social Media",
	messaging: "Messaging",
	developer: "Developer",
	business: "Business",
	content: "Content",
	music: "Music & Audio",
	gaming: "Gaming",
};

const ALL_CATEGORIES = ["all", ...Object.keys(CATEGORY_LABELS)];

// --- URL template helpers ---

function getPrefix(template: string): string {
	const idx = template.indexOf("{}");
	if (idx === -1) return "";
	return template.slice(0, idx);
}

function getSuffix(template: string): string {
	const idx = template.indexOf("{}");
	if (idx === -1) return "";
	return template.slice(idx + 2);
}

function isFullUrlTemplate(template: string): boolean {
	return template === "{}";
}

function extractUsername(fullUrl: string, template: string): string {
	if (!fullUrl || isFullUrlTemplate(template)) return fullUrl;
	const prefix = getPrefix(template);
	const suffix = getSuffix(template);
	let username = fullUrl;
	if (prefix && username.startsWith(prefix)) {
		username = username.slice(prefix.length);
	}
	if (suffix && username.endsWith(suffix)) {
		username = username.slice(0, -suffix.length);
	}
	return username;
}

function buildUrl(username: string, template: string): string {
	if (!username || isFullUrlTemplate(template)) return username;
	return template.replace("{}", username);
}

type SocialBrand = (typeof socialBrands)[number];
type SocialItem = SocialBrand & NetworkDraft;

function NetworkRow({
	social,
	draft,
	onUrlChange,
	onToggle,
}: {
	social: SocialBrand;
	draft: NetworkDraft;
	onUrlChange: (slug: string, url: string) => void;
	onToggle: (slug: string) => void;
}) {
	const { resolvedTheme } = useTheme();
	const template = social.urlTemplate;
	const fullUrlMode = isFullUrlTemplate(template);
	const prefix = fullUrlMode ? "" : getPrefix(template);
	const suffix = fullUrlMode ? "" : getSuffix(template);
	const displayValue = fullUrlMode
		? draft.url
		: extractUsername(draft.url, template);

	const adminBg = resolvedTheme === "dark" ? "#09090b" : "#ffffff";
	const adminFg = resolvedTheme === "dark" ? "#fafafa" : "#09090b";
	const fillColor = draft.isActive
		? getAccessibleIconFill(social.hex, adminBg, adminFg)
		: "#9ca3af";
	const needsRing = isLowLuminance(social.hex);

	const toggleDescriptionId = `toggle-desc-${social.slug}`;

	return (
		<div
			role="listitem"
			className={cn(
				"flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
				draft.isActive
					? "border-l-2 border-l-primary bg-primary/5"
					: "border-l-2 border-l-transparent hover:bg-muted/50",
			)}
		>
			{/* SVG Icon */}
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
					needsRing && draft.isActive && "ring-1 ring-border dark:ring-white/20 bg-white/5",
				)}
			>
				<svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
					<path
						d={social.svgPath}
						fill={fillColor}
					/>
				</svg>
			</div>

			{/* Name */}
			<label htmlFor={`input-${social.slug}`} className="w-28 shrink-0 truncate text-xs font-medium text-foreground cursor-pointer">
				{social.name}
			</label>

			{/* URL input */}
			<div className="min-w-0 flex-1">
				{fullUrlMode ? (
					<Input
						id={`input-${social.slug}`}
						value={draft.url}
						onChange={(e) =>
							onUrlChange(social.slug, e.target.value)
						}
						placeholder="https://..."
						className="h-8 text-xs"
						aria-label={`URL for ${social.name}`}
					/>
				) : (
					<div className="flex items-center rounded-lg border border-input bg-transparent backdrop-blur-sm h-8 overflow-hidden focus-within:ring-1 focus-within:ring-ring">
						{prefix && (
							<span className="shrink-0 select-none bg-muted px-2 text-[11px] text-muted-foreground border-r border-input h-full flex items-center">
								{prefix}
							</span>
						)}
						<input
							id={`input-${social.slug}`}
							value={displayValue}
							onChange={(e) =>
								onUrlChange(
									social.slug,
									buildUrl(e.target.value, template),
								)
							}
							placeholder="username"
							className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
							aria-label={`URL for ${social.name}`}
						/>
						{suffix && (
							<span className="shrink-0 select-none bg-muted px-2 text-[11px] text-muted-foreground border-l border-input h-full flex items-center">
								{suffix}
							</span>
						)}
					</div>
				)}
			</div>

			{/* Toggle */}
			<button
				type="button"
				disabled={!draft.url}
				onClick={() => onToggle(social.slug)}
				className={cn(
					"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
					draft.isActive ? "bg-primary" : "bg-muted",
					!draft.url && "opacity-50 cursor-not-allowed",
				)}
				role="switch"
				aria-checked={draft.isActive}
				aria-label={`Toggle ${social.name}`}
				aria-describedby={!draft.url ? toggleDescriptionId : undefined}
			>
				<span
					className={cn(
						"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
						draft.isActive
							? "translate-x-[18px]"
							: "translate-x-[3px]",
					)}
				/>
			</button>
			{!draft.url && (
				<span id={toggleDescriptionId} className="sr-only">Enter a URL to enable</span>
			)}
		</div>
	);
}

export default function SocialPage() {
	const qc = useQueryClient();
	const { resolvedTheme } = useTheme();
	const [searchQuery, setSearchQuery] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [activeCategory, setActiveCategory] = useState("all");
	const [drafts, setDrafts] = useState<Record<string, NetworkDraft>>({});
	const [initialized, setInitialized] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const searchRef = useRef<HTMLDivElement>(null);

	// DB query only returns configured rows (slug + url + isActive)
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

	// Inactive networks grouped by category (filtered by search and category tab)
	const categoryGroups = useMemo(() => {
		const activeSlugs = new Set(activeNetworks.map((s) => s.slug));
		let inactive = allItems.filter((s) => !activeSlugs.has(s.slug));

		// Filter by search
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			inactive = inactive.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.slug.toLowerCase().includes(q) ||
					s.category.toLowerCase().includes(q),
			);
		}

		// Filter by category tab
		if (activeCategory !== "all") {
			inactive = inactive.filter((s) => s.category === activeCategory);
		}

		// Group by category
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
		setSearchQuery("");
		setShowSuggestions(false);
		setHighlightedIndex(-1);
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

	const activeCount = Object.values(drafts).filter(
		(d) => d.isActive && d.url,
	).length;

	const suggestionsListboxId = "social-search-suggestions";

	return (
		<div className="space-y-6">
			{/* Sticky header */}
			<div
				className="sticky top-0 z-10 mt-1 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 px-4 py-3 space-y-3"
				role="banner"
				aria-label="Social Networks"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<h1 className="text-lg font-semibold text-foreground">Social Networks</h1>
						<span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
							{activeCount} active
						</span>
					</div>
					<Button
						size="sm"
						onClick={handleSaveAll}
						disabled={!hasChanges || updateBulk.isPending}
					>
						<Save className="mr-1.5 h-3.5 w-3.5" />
						{updateBulk.isPending ? "Saving..." : "Save All Changes"}
					</Button>
				</div>

				{/* Search combobox */}
				<div className="relative" ref={searchRef}>
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
					{/* Suggestions dropdown */}
					{showSuggestions && searchSuggestions.length > 0 && (
						<div id={suggestionsListboxId} className="absolute inset-x-0 top-full mt-1 z-20 rounded-lg border border-border bg-card shadow-xl overflow-hidden" role="listbox">
							{searchSuggestions.map((brand, index) => {
								const needsRing = isLowLuminance(brand.hex);
								const sugBg = resolvedTheme === "dark" ? "#09090b" : "#ffffff";
								const sugFg = resolvedTheme === "dark" ? "#fafafa" : "#09090b";
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
											"flex w-full items-center gap-3 px-3 py-2.5 text-xs transition-colors",
											index === highlightedIndex
												? "bg-accent text-accent-foreground"
												: "hover:bg-accent/50",
										)}
									>
										<div
											className={cn(
												"flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
												needsRing && "ring-1 ring-border dark:ring-white/20",
											)}
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

				{/* Horizontal pill category tabs */}
				<Tabs value={activeCategory} onValueChange={setActiveCategory}>
					<TabsList variant="pills" aria-label="Filter by category">
						{ALL_CATEGORIES.map((cat) => (
							<TabsTrigger key={cat} value={cat}>
								{cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
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
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm text-foreground">
							<Globe className="h-4 w-4 text-primary" />
							<h2 className="text-sm font-semibold">Active Networks</h2>
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0 px-3 pb-3" role="list" aria-label="Active social networks">
						<div className="space-y-1">
							{activeNetworks.map((social) => {
								const draft = drafts[social.slug] ?? { url: "", isActive: false };
								const brand = socialBrands.find((b) => b.slug === social.slug)!;
								return (
									<div key={social.slug} id={`network-${social.slug}`} className="rounded-lg transition-all">
										<NetworkRow
											social={brand}
											draft={draft}
											onUrlChange={handleUrlChange}
											onToggle={handleToggle}
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
				<Card>
					<CardContent className="py-12 text-center">
						<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<Globe className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium text-foreground">No networks found</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Try a different search term or category
						</p>
					</CardContent>
				</Card>
			) : (
				categoryGroups.map((group) => (
					<Card key={group.category}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm text-foreground">
								<span className="h-2 w-2 rounded-full bg-primary/60" aria-hidden="true" />
								<h2 className="text-sm font-semibold">{group.label}</h2>
							</CardTitle>
						</CardHeader>
						<CardContent
							className="p-0 px-3 pb-3"
							role="list"
							aria-label={`${group.label} networks`}
						>
							<div className="space-y-1">
								{group.items.map((social) => {
									const draft = drafts[social.slug] ?? { url: "", isActive: false };
									const brand = socialBrands.find((b) => b.slug === social.slug)!;
									return (
										<div key={social.slug} id={`network-${social.slug}`} className="rounded-lg transition-all">
											<NetworkRow
												social={brand}
												draft={draft}
												onUrlChange={handleUrlChange}
												onToggle={handleToggle}
											/>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				))
			)}
		</div>
	);
}
