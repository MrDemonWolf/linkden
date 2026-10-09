"use client";

import { getAccessibleIconFill, isLowLuminance } from "@linkden/ui/color-contrast";
import { socialBrands } from "@linkden/ui/social-brands";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Plus, Save, Search, Trash2, Undo2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { SectionHeader } from "@/components/admin/section-header";
import { SkeletonRows } from "@/components/admin/skeleton-rows";
import { NetworkRow } from "@/components/admin/social/network-row";
import { CATEGORY_LABELS, type NetworkDraft } from "@/components/admin/social/social-constants";
import { buildSocialUrl } from "@/components/admin/social/social-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, getAdminThemeColors } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import {
	effectiveDraft,
	memberSlugs,
	missingUrlSlugs,
	NO_SOCIAL_EDITS,
	type SocialEdits,
	socialChanges,
} from "./social-drafts";

const KNOWN_SLUGS = socialBrands.map((b) => b.slug);

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

export interface SocialLive {
	slug: string;
	name: string;
	url: string;
	hex: string;
	svgPath: string;
}

interface SocialTabProps {
	onDirtyChange: (dirty: boolean) => void;
	/** In-progress active networks for the live preview (`overrides.socialNetworks`); null once saved. */
	onLiveChange?: (networks: SocialLive[] | null) => void;
}

export function SocialTab({ onDirtyChange, onLiveChange }: SocialTabProps) {
	const qc = useQueryClient();
	const { resolvedTheme } = useTheme();

	const socialsQuery = useQuery(trpc.social.list.queryOptions());
	const updateBulk = useMutation(trpc.social.updateBulk.mutationOptions());

	// Unsaved work only, layered over the saved rows (see social-drafts.ts):
	// nothing is seeded from `social.list`, so a failed or late load can't be
	// mistaken for "the admin cleared everything".
	const [edits, setEdits] = useState<SocialEdits>(NO_SOCIAL_EDITS);
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

	const loaded = socialsQuery.isSuccess;
	const dbRows = useMemo(() => socialsQuery.data ?? [], [socialsQuery.data]);

	const draftFor = (slug: string): NetworkDraft => effectiveDraft(slug, dbRows, edits);

	// Listed by membership (saved or added, not removed), never by state:
	// switching a network off or clearing its URL keeps its row in place.
	const listedNetworks = useMemo(() => {
		const members = new Set(memberSlugs(KNOWN_SLUGS, dbRows, edits));
		const list = socialBrands
			.filter((brand) => members.has(brand.slug))
			.map((brand) => ({ ...brand, ...effectiveDraft(brand.slug, dbRows, edits) }));
		list.sort((a, b) => a.name.localeCompare(b.name));
		return list;
	}, [dbRows, edits]);

	const availableNetworks = useMemo(() => {
		const listedSlugs = new Set(listedNetworks.map((s) => s.slug));
		let available = socialBrands.filter((s) => !listedSlugs.has(s.slug));

		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			available = available.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.slug.toLowerCase().includes(q) ||
					s.category.toLowerCase().includes(q),
			);
		}

		return [...available].sort((a, b) => a.name.localeCompare(b.name));
	}, [listedNetworks, searchQuery]);

	const changes = useMemo(
		() => (loaded ? socialChanges(KNOWN_SLUGS, dbRows, edits) : []),
		[loaded, dbRows, edits],
	);
	const missingUrls = useMemo(
		() => (loaded ? missingUrlSlugs(KNOWN_SLUGS, dbRows, edits) : []),
		[loaded, dbRows, edits],
	);
	const socialDirty = changes.length > 0 || missingUrls.length > 0;

	useEffect(() => {
		onDirtyChange(socialDirty);
	}, [socialDirty, onDirtyChange]);

	// Only while dirty, so the saved page keeps its live (addedAt) order;
	// unsaved edits preview alphabetically, the same order as the list below.
	useEffect(() => {
		onLiveChange?.(
			socialDirty
				? listedNetworks
						.filter((s) => s.isActive && s.url)
						.map(({ slug, name, url, hex, svgPath }) => ({
							slug,
							name,
							url,
							hex,
							svgPath,
						}))
				: null,
		);
		return () => onLiveChange?.(null);
	}, [socialDirty, listedNetworks, onLiveChange]);

	const setDraft = (slug: string, update: (current: NetworkDraft) => NetworkDraft) => {
		setEdits((prev) => ({
			...prev,
			drafts: { ...prev.drafts, [slug]: update(effectiveDraft(slug, dbRows, prev)) },
		}));
	};

	const handleUrlChange = (slug: string, url: string) => {
		setDraft(slug, (current) => ({ ...current, url }));
	};

	const handleToggle = (slug: string) => {
		setDraft(slug, (current) => ({ ...current, isActive: !current.isActive }));
	};

	const openAddDialog = (slug: string) => {
		setPendingSlug(slug);
		// Re-adding a network removed this session brings its URL back.
		setPendingUrl(draftFor(slug).url);
	};

	const closeAddDialog = () => {
		setPendingSlug(null);
		setPendingUrl("");
	};

	const handleConfirmAddNetwork = () => {
		if (!pendingSlug || !pendingUrlValid) return;
		const slug = pendingSlug;
		// Canonical form, e.g. https://www.instagram.com/ada/ → https://instagram.com/ada.
		const template = socialBrands.find((b) => b.slug === slug)?.urlTemplate;
		const url = template ? buildSocialUrl(pendingUrl, template) : pendingUrl.trim();
		const saved = dbRows.some((r) => r.slug === slug);
		setEdits((prev) => {
			const added = new Set(prev.added);
			const removed = new Set(prev.removed);
			removed.delete(slug);
			if (!saved) added.add(slug);
			return {
				drafts: { ...prev.drafts, [slug]: { url, isActive: true } },
				added,
				removed,
			};
		});
		setSearchQuery("");
		closeAddDialog();
		// Flush state, then scroll to new row
		setTimeout(() => {
			document.getElementById(`network-${slug}`)?.scrollIntoView({
				behavior: prefersReducedMotion() ? "auto" : "smooth",
				block: "center",
			});
		}, 50);
	};

	const handleRemoveNetwork = (slug: string) => {
		setEdits((prev) => {
			const added = new Set(prev.added);
			const removed = new Set(prev.removed);
			// An unsaved addition just goes away; a saved row is staged for deletion.
			if (!added.delete(slug)) removed.add(slug);
			return { ...prev, added, removed };
		});
	};

	const handleDiscardSocial = () => {
		setEdits(NO_SOCIAL_EDITS);
	};

	const handleSaveSocial = async () => {
		if (!loaded) return;
		if (missingUrls.length > 0) {
			const name = socialBrands.find((b) => b.slug === missingUrls[0])?.name ?? missingUrls[0];
			toast.error(`Enter a URL for ${name}, or remove it`);
			return;
		}
		if (changes.length === 0) return;

		try {
			await updateBulk.mutateAsync(changes);
			await qc.invalidateQueries({ queryKey: trpc.social.list.queryOptions().queryKey });
			setEdits(NO_SOCIAL_EDITS);
			toast.success(`${changes.length} network${changes.length > 1 ? "s" : ""} updated`);
		} catch {
			toast.error("Failed to save social links");
		}
	};

	const listedCount = listedNetworks.length;

	// Never show an editor (or a Save) over data that didn't load: an empty
	// list here would look like "no links yet".
	if (!loaded) {
		return (
			<Card>
				<SectionHeader icon={Globe} title="Active Social Links" variant="primary" />
				<CardContent>
					{socialsQuery.isError ? (
						<QueryError
							message="Couldn't load your social links"
							onRetry={() => socialsQuery.refetch()}
						/>
					) : (
						<SkeletonRows count={3} />
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Active Social Links */}
			<Card className="border-t-2 border-t-primary bg-gradient-to-b from-primary/5 to-transparent">
				<SectionHeader
					icon={Globe}
					title="Active Social Links"
					count={listedCount}
					variant="primary"
				/>
				<CardContent className="space-y-3">
					{listedNetworks.length === 0 ? (
						<div className="py-8 text-center">
							<Globe className="mx-auto h-8 w-8 text-muted-foreground/40" />
							<p className="mt-2 text-xs text-muted-foreground">No social links yet</p>
							<p className="mt-1 text-micro text-muted-foreground">
								Search below to add your first social network
							</p>
						</div>
					) : (
						<ul className="space-y-2.5" aria-label="Active social networks">
							{listedNetworks.map((social) => {
								const draft = draftFor(social.slug);
								const brand = socialBrands.find((b) => b.slug === social.slug)!;
								return (
									<li
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
										{!draft.url && (
											<p className="px-2 pt-1 text-micro text-destructive sm:px-4">
												Enter a URL, or remove {social.name}.
											</p>
										)}
										<button
											type="button"
											onClick={() => handleRemoveNetwork(social.slug)}
											className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm opacity-60 transition-opacity after:absolute after:-inset-3 after:content-[''] hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 md:after:-inset-1"
											aria-label={`Remove ${social.name}`}
										>
											<Trash2 className="h-3 w-3" />
										</button>
									</li>
								);
							})}
						</ul>
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
								disabled={updateBulk.isPending || missingUrls.length > 0}
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
										className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group/item"
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
											<p className="text-micro text-muted-foreground">
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
							aria-describedby={
								pendingUrl.length > 0 && !pendingUrlValid ? "add-network-url-error" : undefined
							}
						/>
						{pendingUrl.length > 0 && !pendingUrlValid && (
							<p id="add-network-url-error" role="status" className="text-xs text-destructive">
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
