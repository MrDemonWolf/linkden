"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Globe, Save } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { socialBrands, socialBrandMap } from "@linkden/ui/social-brands";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// --- URL template helpers ---

/** Get the prefix portion before `{}` in a url template */
function getPrefix(template: string): string {
	const idx = template.indexOf("{}");
	if (idx === -1) return "";
	return template.slice(0, idx);
}

/** Get the suffix portion after `{}` in a url template */
function getSuffix(template: string): string {
	const idx = template.indexOf("{}");
	if (idx === -1) return "";
	return template.slice(idx + 2);
}

/** Whether a template is just `{}` (full URL input, no prefix) */
function isFullUrlTemplate(template: string): boolean {
	return template === "{}";
}

/** Extract the username from a stored full URL using the template */
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

/** Construct a full URL from a username and template */
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
	const template = social.urlTemplate;
	const fullUrlMode = isFullUrlTemplate(template);
	const prefix = fullUrlMode ? "" : getPrefix(template);
	const suffix = fullUrlMode ? "" : getSuffix(template);
	const displayValue = fullUrlMode
		? draft.url
		: extractUsername(draft.url, template);

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors border-b border-white/5 last:border-b-0",
				draft.isActive && "bg-primary/5",
			)}
		>
			{/* SVG Icon */}
			<div className="flex h-8 w-8 shrink-0 items-center justify-center">
				<svg viewBox="0 0 24 24" className="h-5 w-5">
					<path
						d={social.svgPath}
						fill={draft.isActive ? social.hex : "#9ca3af"}
					/>
				</svg>
			</div>

			{/* Name */}
			<span className="w-28 shrink-0 truncate text-xs font-medium">
				{social.name}
			</span>

			{/* URL input */}
			<div className="min-w-0 flex-1">
				{fullUrlMode ? (
					<Input
						value={draft.url}
						onChange={(e) =>
							onUrlChange(social.slug, e.target.value)
						}
						placeholder="https://..."
						className="h-8 text-xs"
					/>
				) : (
					<div className="flex items-center rounded-lg border border-input bg-transparent backdrop-blur-sm h-8 overflow-hidden focus-within:ring-1 focus-within:ring-ring">
						{prefix && (
							<span className="shrink-0 select-none bg-muted px-2 text-[11px] text-muted-foreground border-r border-input h-full flex items-center">
								{prefix}
							</span>
						)}
						<input
							value={displayValue}
							onChange={(e) =>
								onUrlChange(
									social.slug,
									buildUrl(e.target.value, template),
								)
							}
							placeholder="username"
							className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
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
				title={!draft.url ? "Enter a URL to enable" : undefined}
				onClick={() => onToggle(social.slug)}
				className={cn(
					"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
					draft.isActive ? "bg-blue-600" : "bg-muted",
					!draft.url && "opacity-50 cursor-not-allowed",
				)}
				role="switch"
				aria-checked={draft.isActive}
				aria-label={`Toggle ${social.name}`}
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
		</div>
	);
}

export default function SocialPage() {
	const qc = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [drafts, setDrafts] = useState<Record<string, NetworkDraft>>({});
	const [initialized, setInitialized] = useState(false);

	// DB query only returns configured rows (slug + url + isActive)
	const socialsQuery = useQuery(trpc.social.list.queryOptions());
	const updateBulk = useMutation(trpc.social.updateBulk.mutationOptions());

	const dbRows = socialsQuery.data ?? [];

	// Initialize drafts: merge catalog with DB data
	useEffect(() => {
		if (!initialized && !socialsQuery.isLoading) {
			const initial: Record<string, NetworkDraft> = {};
			// Start with all catalog entries as inactive
			for (const brand of socialBrands) {
				initial[brand.slug] = { url: "", isActive: false };
			}
			// Overlay DB data
			for (const row of dbRows) {
				if (initial[row.slug] !== undefined) {
					initial[row.slug] = { url: row.url, isActive: row.isActive };
				}
			}
			setDrafts(initial);
			setInitialized(true);
		}
	}, [dbRows, socialsQuery.isLoading, initialized]);

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

	// Inactive networks grouped by category (filtered by search)
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

		// Group by category
		const groups: Record<string, SocialItem[]> = {};
		for (const item of inactive) {
			if (!groups[item.category]) groups[item.category] = [];
			groups[item.category].push(item);
		}

		// Sort items within each group
		for (const key of Object.keys(groups)) {
			groups[key].sort((a, b) => a.name.localeCompare(b.name));
		}

		// Return as ordered entries
		const categoryOrder = Object.keys(CATEGORY_LABELS);
		return categoryOrder
			.filter((cat) => groups[cat]?.length)
			.map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat] || cat, items: groups[cat] }));
	}, [allItems, activeNetworks, searchQuery]);

	// Detect changes vs DB
	const hasChanges = useMemo(() => {
		const dbMap = new Map(dbRows.map((r) => [r.slug, r]));

		for (const brand of socialBrands) {
			const draft = drafts[brand.slug];
			if (!draft) continue;
			const db = dbMap.get(brand.slug);

			if (draft.url) {
				// Should have a DB row
				if (!db || db.url !== draft.url || db.isActive !== draft.isActive) {
					return true;
				}
			} else {
				// Should NOT have a DB row
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
				// Remove from DB
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

	const activeCount = Object.values(drafts).filter(
		(d) => d.isActive && d.url,
	).length;

	return (
		<div className="space-y-6">
			{/* Sticky header */}
			<div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/15 dark:border-white/10 pb-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-lg font-semibold">Social Networks</h1>
						<p className="text-xs text-muted-foreground">
							{activeCount} active
						</p>
					</div>
					{hasChanges && (
						<Button
							size="sm"
							onClick={handleSaveAll}
							disabled={updateBulk.isPending}
						>
							<Save className="mr-1.5 h-3.5 w-3.5" />
							{updateBulk.isPending ? "Saving..." : "Save All Changes"}
						</Button>
					)}
				</div>

				{/* Search */}
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search networks..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
					/>
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
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Active Networks</CardTitle>
					</CardHeader>
					<CardContent className="p-0 px-3 pb-3">
						{activeNetworks.map((social) => {
							const draft = drafts[social.slug] ?? { url: "", isActive: false };
							const brand = socialBrands.find((b) => b.slug === social.slug)!;
							return (
								<NetworkRow
									key={social.slug}
									social={brand}
									draft={draft}
									onUrlChange={handleUrlChange}
									onToggle={handleToggle}
								/>
							);
						})}
					</CardContent>
				</Card>
			)}

			{/* Category group cards */}
			{categoryGroups.length === 0 && activeNetworks.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Globe className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
						<p className="text-sm font-medium">No networks found</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Try a different search term
						</p>
					</CardContent>
				</Card>
			) : (
				categoryGroups.map((group) => (
					<Card key={group.category}>
						<CardHeader>
							<CardTitle className="text-sm">{group.label}</CardTitle>
						</CardHeader>
						<CardContent className="p-0 px-3 pb-3">
							{group.items.map((social) => {
								const draft = drafts[social.slug] ?? { url: "", isActive: false };
								const brand = socialBrands.find((b) => b.slug === social.slug)!;
								return (
									<NetworkRow
										key={social.slug}
										social={brand}
										draft={draft}
										onUrlChange={handleUrlChange}
										onToggle={handleToggle}
									/>
								);
							})}
						</CardContent>
					</Card>
				))
			)}
		</div>
	);
}
