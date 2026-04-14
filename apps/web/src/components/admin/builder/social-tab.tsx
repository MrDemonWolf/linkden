"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Undo2, Globe, Search, Plus, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { trpc } from "@/utils/trpc";
import { socialBrands } from "@linkden/ui/social-brands";
import { getAccessibleIconFill, isLowLuminance } from "@linkden/ui/color-contrast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/admin/section-header";
import { NetworkRow } from "@/components/admin/social/network-row";
import {
	type NetworkDraft,
	CATEGORY_LABELS,
} from "@/components/admin/social/social-constants";
import { cn, getAdminThemeColors } from "@/lib/utils";

interface SocialTabProps {
	onDirtyChange: (dirty: boolean) => void;
}

export function SocialTab({ onDirtyChange }: SocialTabProps) {
	const qc = useQueryClient();
	const { resolvedTheme } = useTheme();

	const socialsQuery = useQuery(trpc.social.list.queryOptions());
	const updateBulk = useMutation(trpc.social.updateBulk.mutationOptions());

	const [drafts, setDrafts] = useState<Record<string, NetworkDraft>>({});
	const [socialInitialized, setSocialInitialized] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const dbRows = socialsQuery.data ?? [];

	useEffect(() => {
		if (!socialInitialized && !socialsQuery.isLoading) {
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
			setSocialInitialized(true);
		}
	}, [dbRows, socialsQuery.isLoading, socialInitialized]);

	const allItems = useMemo(() => {
		return socialBrands.map((brand) => {
			const draft = drafts[brand.slug] ?? { url: "", isActive: false };
			return { ...brand, ...draft };
		});
	}, [drafts]);

	const activeNetworks = useMemo(() => {
		const list = allItems.filter((s) => s.isActive && s.url);
		list.sort((a, b) => a.name.localeCompare(b.name));
		return list;
	}, [allItems]);

	const availableNetworks = useMemo(() => {
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

		inactive.sort((a, b) => a.name.localeCompare(b.name));
		return inactive.slice(0, 20);
	}, [allItems, activeNetworks, searchQuery]);

	const socialDirty = useMemo(() => {
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

	useEffect(() => {
		onDirtyChange(socialDirty);
	}, [socialDirty, onDirtyChange]);

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

	const handleActivateNetwork = (slug: string) => {
		setDrafts((prev) => ({
			...prev,
			[slug]: { ...prev[slug], isActive: true },
		}));
		setSearchQuery("");
	};

	const handleRemoveNetwork = (slug: string) => {
		setDrafts((prev) => ({
			...prev,
			[slug]: { url: "", isActive: false },
		}));
	};

	const handleDiscardSocial = () => {
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
	};

	const handleSaveSocial = async () => {
		const dbMap = new Map(dbRows.map((r) => [r.slug, r]));
		const changes: Array<{ slug: string; url: string; isActive: boolean }> = [];

		for (const brand of socialBrands) {
			const draft = drafts[brand.slug];
			if (!draft) continue;
			const db = dbMap.get(brand.slug);

			if (draft.url) {
				if (!db || db.url !== draft.url || db.isActive !== draft.isActive) {
					changes.push({ slug: brand.slug, url: draft.url, isActive: draft.isActive });
				}
			} else if (db) {
				changes.push({ slug: brand.slug, url: "", isActive: false });
			}
		}

		if (changes.length === 0) return;

		try {
			await updateBulk.mutateAsync(changes);
			await qc.invalidateQueries({ queryKey: trpc.social.list.queryOptions().queryKey });
			setSocialInitialized(false);
			toast.success(`${changes.length} network${changes.length > 1 ? "s" : ""} updated`);
		} catch {
			toast.error("Failed to save social links");
		}
	};

	const activeCount = activeNetworks.length;

	return (
		<div className="space-y-4">
			{/* Active Social Links */}
			<Card className="border-t-2 border-t-primary bg-gradient-to-b from-primary/5 to-transparent">
				<SectionHeader icon={Globe} title="Active Social Links" count={activeCount} variant="primary" />
				<CardContent className="space-y-3">
					{activeNetworks.length === 0 ? (
						<div className="py-8 text-center">
							<Globe className="mx-auto h-8 w-8 text-muted-foreground/40" />
							<p className="mt-2 text-xs text-muted-foreground">No social links yet</p>
							<p className="mt-1 text-[11px] text-muted-foreground">
								Search below to add your first social network
							</p>
						</div>
					) : (
						<div className="space-y-2.5" role="list" aria-label="Active social networks">
							{activeNetworks.map((social) => {
								const draft = drafts[social.slug] ?? { url: "", isActive: false };
								const brand = socialBrands.find((b) => b.slug === social.slug)!;
								return (
									<div key={social.slug} id={`network-${social.slug}`} className="group relative rounded-xl transition-all">
										<NetworkRow
											social={brand}
											draft={draft}
											onUrlChange={handleUrlChange}
											onToggle={handleToggle}
										/>
										<button
											type="button"
											onClick={() => handleRemoveNetwork(social.slug)}
											className="absolute -right-1 -top-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-opacity"
											aria-label={`Remove ${social.name}`}
										>
											<Trash2 className="h-3 w-3" />
										</button>
									</div>
								);
							})}
						</div>
					)}

					{socialDirty && (
						<div className="flex gap-2 pt-2 border-t border-border/30">
							<Button variant="ghost" size="sm" onClick={handleDiscardSocial} className="flex-1">
								<Undo2 className="mr-1.5 h-3.5 w-3.5" />
								Discard
							</Button>
							<Button
								size="sm"
								onClick={handleSaveSocial}
								disabled={updateBulk.isPending}
								className="flex-1 shadow-lg shadow-primary/25"
							>
								<Save className="mr-1.5 h-3.5 w-3.5" />
								{updateBulk.isPending ? "Saving..." : "Save Social Links"}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Add Social Network */}
			<Card>
				<SectionHeader icon={Plus} title="Add Social Network" variant="muted" />
				<CardContent className="space-y-3">
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search networks..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-8"
							aria-label="Search social networks to add"
						/>
					</div>

					{availableNetworks.length === 0 ? (
						<p className="py-4 text-center text-xs text-muted-foreground">
							{searchQuery ? "No matching networks found" : "All networks are active"}
						</p>
					) : (
						<div className="grid gap-1.5 max-h-[400px] overflow-y-auto pr-1">
							{availableNetworks.map((network) => {
								const { bg, fg } = getAdminThemeColors(resolvedTheme);
								const fill = getAccessibleIconFill(network.hex, bg, fg);
								const needsRing = isLowLuminance(network.hex);
								return (
									<button
										key={network.slug}
										type="button"
										onClick={() => handleActivateNetwork(network.slug)}
										className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50 group/item"
									>
										<div
											className={cn(
												"flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
												needsRing && "ring-1 ring-border dark:ring-white/20",
											)}
											style={{ backgroundColor: `${network.hex}15` }}
										>
											<svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
												<path d={network.svgPath} fill={fill} />
											</svg>
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-xs font-medium truncate">{network.name}</p>
											<p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[network.category] || network.category}</p>
										</div>
										<Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
									</button>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
