"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Globe, Save } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { socialBrands, socialBrandMap } from "@linkden/ui/social-brands";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NetworkDraft {
	url: string;
	isActive: boolean;
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

	// Build the merged + sorted + filtered list
	const displayList = useMemo(() => {
		const list = socialBrands.map((brand) => {
			const draft = drafts[brand.slug] ?? { url: "", isActive: false };
			return { ...brand, ...draft };
		});

		// Sort: active with URL first, then active without URL, then inactive
		list.sort((a, b) => {
			const aScore = a.isActive ? (a.url ? 0 : 1) : 2;
			const bScore = b.isActive ? (b.url ? 0 : 1) : 2;
			if (aScore !== bScore) return aScore - bScore;
			return a.name.localeCompare(b.name);
		});

		// Filter by search
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			return list.filter(
				(s) =>
					s.isActive ||
					s.name.toLowerCase().includes(q) ||
					s.slug.toLowerCase().includes(q) ||
					s.category.toLowerCase().includes(q),
			);
		}

		return list;
	}, [drafts, searchQuery]);

	// Detect changes vs DB
	const hasChanges = useMemo(() => {
		// Build a map of DB state
		const dbMap = new Map(dbRows.map((r) => [r.slug, r]));

		for (const brand of socialBrands) {
			const draft = drafts[brand.slug];
			if (!draft) continue;
			const db = dbMap.get(brand.slug);

			if (draft.isActive && draft.url) {
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
			[slug]: {
				url,
				isActive: url.trim().length > 0,
			},
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

			const shouldExist = draft.isActive && draft.url;

			if (shouldExist) {
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
			setInitialized(false);
			qc.invalidateQueries({
				queryKey: trpc.social.list.queryOptions().queryKey,
			});
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
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Social Networks</h1>
					<p className="text-xs text-muted-foreground">
						Add your profile URLs — networks with URLs are automatically shown
						on your page ({activeCount} active)
					</p>
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

			{/* List */}
			{displayList.length === 0 ? (
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
				<div className="space-y-px rounded-lg border overflow-hidden">
					{displayList.map((social) => {
						const draft = drafts[social.slug] ?? {
							url: "",
							isActive: false,
						};

						return (
							<div
								key={social.slug}
								className={cn(
									"flex items-center gap-3 bg-card px-3 py-2.5 transition-colors",
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
									<Input
										value={draft.url}
										onChange={(e) =>
											handleUrlChange(social.slug, e.target.value)
										}
										placeholder={`https://${social.slug}.com/username`}
										className="h-8 text-xs"
									/>
								</div>

								{/* Toggle */}
								<button
									type="button"
									onClick={() => handleToggle(social.slug)}
									className={cn(
										"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
										draft.isActive ? "bg-primary" : "bg-muted",
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
					})}
				</div>
			)}

			{/* Bottom save bar (sticky) */}
			{hasChanges && (
				<div className="sticky bottom-4 flex justify-end">
					<Button
						onClick={handleSaveAll}
						disabled={updateBulk.isPending}
						className="shadow-lg"
					>
						<Save className="mr-1.5 h-4 w-4" />
						{updateBulk.isPending ? "Saving..." : "Save All Changes"}
					</Button>
				</div>
			)}
		</div>
	);
}
