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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/admin/section-header";
import { NetworkRow } from "@/components/admin/social/network-row";
import { type NetworkDraft, CATEGORY_LABELS } from "@/components/admin/social/social-constants";
import { cn, getAdminThemeColors } from "@/lib/utils";

const URL_PLACEHOLDERS: Record<string, string> = {
	twitter: "https://twitter.com/yourhandle",
	x: "https://x.com/yourhandle",
	instagram: "https://instagram.com/yourhandle",
	facebook: "https://facebook.com/yourpage",
	linkedin: "https://linkedin.com/in/yourhandle",
	github: "https://github.com/yourhandle",
	gitlab: "https://gitlab.com/yourhandle",
	youtube: "https://youtube.com/@yourhandle",
	tiktok: "https://tiktok.com/@yourhandle",
	twitch: "https://twitch.tv/yourhandle",
	discord: "https://discord.gg/yourinvite",
	telegram: "https://t.me/yourhandle",
	whatsapp: "https://wa.me/1234567890",
	reddit: "https://reddit.com/user/yourhandle",
	pinterest: "https://pinterest.com/yourhandle",
	snapchat: "https://snapchat.com/add/yourhandle",
	threads: "https://threads.net/@yourhandle",
	mastodon: "https://mastodon.social/@yourhandle",
	bluesky: "https://bsky.app/profile/yourhandle",
	spotify: "https://open.spotify.com/artist/yourid",
	"apple-music": "https://music.apple.com/artist/yourid",
	soundcloud: "https://soundcloud.com/yourhandle",
	bandcamp: "https://yourhandle.bandcamp.com",
	"buy-me-a-coffee": "https://buymeacoffee.com/yourhandle",
	patreon: "https://patreon.com/yourhandle",
	kofi: "https://ko-fi.com/yourhandle",
	behance: "https://behance.net/yourhandle",
	dribbble: "https://dribbble.com/yourhandle",
	medium: "https://medium.com/@yourhandle",
	substack: "https://yourhandle.substack.com",
	blogger: "https://yourblog.blogspot.com",
	email: "mailto:you@example.com",
	website: "https://yoursite.com",
};

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
	const [pendingSlug, setPendingSlug] = useState<string | null>(null);
	const [pendingUrl, setPendingUrl] = useState("");

	const pendingBrand = useMemo(
		() => (pendingSlug ? (socialBrands.find((b) => b.slug === pendingSlug) ?? null) : null),
		[pendingSlug],
	);

	const pendingUrlValid = useMemo(() => {
		const trimmed = pendingUrl.trim();
		if (!trimmed) return false;
		try {
			const u = new URL(trimmed);
			return u.protocol === "http:" || u.protocol === "https:";
		} catch {
			return false;
		}
	}, [pendingUrl]);

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
		return inactive;
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

	const openAddDialog = (slug: string) => {
		setPendingSlug(slug);
		setPendingUrl("");
	};

	const closeAddDialog = () => {
		setPendingSlug(null);
		setPendingUrl("");
	};

	const handleConfirmAddNetwork = () => {
		if (!pendingSlug || !pendingUrlValid) return;
		const slug = pendingSlug;
		const url = pendingUrl.trim();
		setDrafts((prev) => ({
			...prev,
			[slug]: { ...prev[slug], url, isActive: true },
		}));
		setSearchQuery("");
		closeAddDialog();
		// Flush state, then scroll to new row
		setTimeout(() => {
			document
				.getElementById(`network-${slug}`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 50);
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
				<SectionHeader
					icon={Globe}
					title="Active Social Links"
					count={activeCount}
					variant="primary"
				/>
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
									<div
										key={social.slug}
										id={`network-${social.slug}`}
										className="group relative rounded-xl transition-all"
									>
										<NetworkRow
											social={brand}
											draft={draft}
											onUrlChange={handleUrlChange}
											onToggle={handleToggle}
										/>
										<button
											type="button"
											onClick={() => handleRemoveNetwork(social.slug)}
											className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
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
										onClick={() => openAddDialog(network.slug)}
										className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none group/item"
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
											<p className="text-[10px] text-muted-foreground">
												{CATEGORY_LABELS[network.category] || network.category}
											</p>
										</div>
										<Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
									</button>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={pendingSlug !== null}
				onOpenChange={(open) => {
					if (!open) closeAddDialog();
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-3">
							{pendingBrand &&
								(() => {
									const { bg, fg } = getAdminThemeColors(resolvedTheme);
									const fill = getAccessibleIconFill(pendingBrand.hex, bg, fg);
									const needsRing = isLowLuminance(pendingBrand.hex);
									return (
										<div
											className={cn(
												"flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
												needsRing && "ring-1 ring-border dark:ring-white/20",
											)}
											style={{ backgroundColor: `${pendingBrand.hex}20` }}
										>
											<svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
												<path d={pendingBrand.svgPath} fill={fill} />
											</svg>
										</div>
									);
								})()}
							<span>Add {pendingBrand?.name ?? "Network"}</span>
						</DialogTitle>
						<DialogDescription>
							Enter the URL for your {pendingBrand?.name ?? "profile"}. It will appear on your
							public page.
						</DialogDescription>
					</DialogHeader>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleConfirmAddNetwork();
						}}
						className="space-y-2"
					>
						<Label htmlFor="add-network-url" className="text-xs">
							URL
						</Label>
						<Input
							id="add-network-url"
							type="url"
							autoFocus
							value={pendingUrl}
							onChange={(e) => setPendingUrl(e.target.value)}
							placeholder={pendingSlug ? (URL_PLACEHOLDERS[pendingSlug] ?? "https://") : "https://"}
							aria-invalid={pendingUrl.length > 0 && !pendingUrlValid}
						/>
						{pendingUrl.length > 0 && !pendingUrlValid && (
							<p className="text-xs text-destructive">
								Enter a valid URL starting with http:// or https://
							</p>
						)}

						<DialogFooter className="pt-2">
							<Button type="button" variant="ghost" onClick={closeAddDialog}>
								Cancel
							</Button>
							<Button type="submit" disabled={!pendingUrlValid}>
								<Plus className="mr-1.5 h-3.5 w-3.5" />
								Add Network
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
