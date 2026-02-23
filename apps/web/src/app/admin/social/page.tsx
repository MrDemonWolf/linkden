"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Filter, Globe, Save } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "active";

interface NetworkDraft {
	url: string;
	isActive: boolean;
}

export default function SocialPage() {
	const qc = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [filter, setFilter] = useState<FilterMode>("all");
	const [drafts, setDrafts] = useState<Record<string, NetworkDraft>>({});
	const [initialized, setInitialized] = useState(false);

	const socialsQuery = useQuery(trpc.social.list.queryOptions());
	const updateBulk = useMutation(trpc.social.updateBulk.mutationOptions());

	const socials = socialsQuery.data ?? [];

	// Initialize drafts from server data
	useEffect(() => {
		if (socials.length > 0 && !initialized) {
			const initial: Record<string, NetworkDraft> = {};
			for (const s of socials) {
				initial[s.slug] = { url: s.url ?? "", isActive: s.isActive };
			}
			setDrafts(initial);
			setInitialized(true);
		}
	}, [socials, initialized]);

	const filtered = socials.filter((s) => {
		const draft = drafts[s.slug];
		const matchesSearch =
			searchQuery === "" ||
			s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.slug.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesFilter =
			filter === "all" ||
			(filter === "active" && (draft?.isActive ?? s.isActive));
		return matchesSearch && matchesFilter;
	});

	// Detect changes
	const hasChanges = useMemo(() => {
		for (const s of socials) {
			const draft = drafts[s.slug];
			if (!draft) continue;
			if (draft.url !== (s.url ?? "") || draft.isActive !== s.isActive) {
				return true;
			}
		}
		return false;
	}, [socials, drafts]);

	const handleUrlChange = (slug: string, url: string) => {
		setDrafts((prev) => ({
			...prev,
			[slug]: {
				url,
				// Auto-activate when URL is entered, auto-deactivate when cleared
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
		const changes: Array<{ slug: string; url: string; isActive: boolean }> = [];
		for (const s of socials) {
			const draft = drafts[s.slug];
			if (!draft) continue;
			if (draft.url !== (s.url ?? "") || draft.isActive !== s.isActive) {
				changes.push({
					slug: s.slug,
					url: draft.url,
					isActive: draft.isActive,
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
			toast.success(`${changes.length} network${changes.length > 1 ? "s" : ""} updated`);
		} catch {
			toast.error("Failed to save changes");
		}
	};

	const activeCount = Object.values(drafts).filter((d) => d.isActive).length;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Social Networks</h1>
					<p className="text-xs text-muted-foreground">
						Add your profile URLs — networks with URLs are automatically shown on your page
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

			{/* Controls */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search networks..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
					/>
				</div>
				<div className="flex items-center gap-1">
					<Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
					<Button
						variant={filter === "all" ? "default" : "outline"}
						size="xs"
						onClick={() => setFilter("all")}
					>
						All ({socials.length})
					</Button>
					<Button
						variant={filter === "active" ? "default" : "outline"}
						size="xs"
						onClick={() => setFilter("active")}
					>
						Active ({activeCount})
					</Button>
				</div>
			</div>

			{/* List */}
			{socialsQuery.isError ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Globe className="mx-auto mb-3 h-8 w-8 text-destructive/40" />
						<p className="text-sm font-medium">Failed to load social networks</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Make sure the database schema is up to date
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-3"
							onClick={() => socialsQuery.refetch()}
						>
							Retry
						</Button>
					</CardContent>
				</Card>
			) : socialsQuery.isLoading ? (
				<div className="space-y-1">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={`sk-${i}`} className="h-12" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Globe className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
						<p className="text-sm font-medium">No networks found</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{searchQuery
								? "Try a different search term"
								: "No social networks available"}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-px rounded-lg border overflow-hidden">
					{filtered.map((social) => {
						const draft = drafts[social.slug] ?? {
							url: social.url ?? "",
							isActive: social.isActive,
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

								{/* URL input (always visible) */}
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
