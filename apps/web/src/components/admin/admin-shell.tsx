"use client";

import { Menu } from "@base-ui/react/menu";
import { useQuery } from "@tanstack/react-query";
import { Globe, LogOut, Smartphone, UserCog, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobilePreviewSheet } from "@/components/admin/mobile-preview-sheet";
import { activeNavItem, isNavActive, NAV_ITEMS, NavList } from "@/components/admin/nav-list";
import { KickerSetter } from "@/components/admin/page-header";
import { PagePreview } from "@/components/admin/page-preview";
import { PreviewColumn } from "@/components/admin/preview-column";
import {
	type PreviewRegistration,
	PreviewSlotSetter,
	PreviewSlotState,
	usePreviewRegistration,
} from "@/components/admin/preview-slot";
import { SharePopover } from "@/components/admin/share-popover";
import { StatePill } from "@/components/admin/state-pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TooltipHint } from "@/components/ui/tooltip";
import { WolfLogo } from "@/components/wolf-logo";
import { useMediaQuery } from "@/hooks/use-media-query";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";
import { getGravatarUrl } from "@/lib/gravatar";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

type SessionUser = { name: string; email: string; image?: string | null };

/** `LINKS / PROFILE`: destination from NAV_ITEMS + the page's sub-tab label (or its path segment). */
function kickerFor(pathname: string, subLabel: string | null) {
	const item = activeNavItem(pathname);
	if (!item) return subLabel ?? "";
	const segment = pathname.slice(item.href.length + 1).split("/")[0];
	const sub = subLabel ?? (segment ? segment.replace(/-/g, " ") : "");
	return sub ? `${item.label} / ${sub}` : item.label;
}

/**
 * Fixed left sidebar (≥lg): 208px at xl with icon + label rows, a 64px
 * icon-only rail with Tooltip labels between lg and xl. Brand mark on top,
 * account identity + version at the bottom; sign-out stays in the top-bar
 * avatar menu so it exists exactly once.
 */
function Sidebar({
	pathname,
	unreadCount,
	logoUrl,
	siteName,
	user,
}: {
	pathname: string;
	unreadCount: number;
	logoUrl: string;
	siteName: string;
	user: SessionUser;
}) {
	const isXl = useMediaQuery("(min-width: 1280px)", true);
	const version = `v${process.env.NEXT_PUBLIC_APP_VERSION}${process.env.NODE_ENV === "development" ? " · DEV" : ""}`;
	const avatar = (
		<Avatar className="h-8 w-8 shrink-0">
			<AvatarImage
				src={user.image ?? (user.email ? getGravatarUrl(user.email, 56) : undefined)}
				alt=""
			/>
			<AvatarFallback className="text-xs font-semibold">{initials(user.name)}</AvatarFallback>
		</Avatar>
	);

	return (
		<aside
			aria-label="Sidebar"
			className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col border-r border-border bg-card lg:flex xl:w-52"
		>
			<div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-3 max-xl:justify-center">
				{logoUrl ? (
					<img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
				) : (
					<WolfLogo className="h-8 w-8 shrink-0" />
				)}
				<span className={cn("truncate font-display text-sm font-semibold", !isXl && "sr-only")}>
					{siteName}
				</span>
			</div>
			<div className="flex-1 overflow-y-auto">
				<NavList
					pathname={pathname}
					unreadCount={unreadCount}
					variant={isXl ? "sidebar" : "rail"}
				/>
			</div>
			<div className="shrink-0 border-t border-border p-3">
				{isXl ? (
					<Link
						href="/admin/settings"
						className="flex h-10 items-center gap-3 rounded-lg px-1.5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label={`Account settings — ${user.name || "Admin"}, ${version}`}
					>
						{avatar}
						<span className="min-w-0 flex-1">
							<span className="block truncate text-xs font-medium text-foreground">
								{user.name || "Admin"}
							</span>
							<span className="block truncate font-mono text-micro text-muted-foreground">
								{version}
							</span>
						</span>
					</Link>
				) : (
					<TooltipHint content={`${user.name || "Admin"} · ${version}`} side="right">
						<Link
							href="/admin/settings"
							className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={`Account settings — ${user.name || "Admin"}, ${version}`}
						>
							{avatar}
						</Link>
					</TooltipHint>
				)}
			</div>
		</aside>
	);
}

function AvatarMenu({
	user,
	onSignOut,
	adminBrandingEnabled,
}: {
	user: SessionUser;
	onSignOut: () => void;
	adminBrandingEnabled: boolean;
}) {
	const itemClass =
		"flex min-h-11 cursor-default select-none items-center gap-2.5 rounded-lg px-3 text-xs outline-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground md:min-h-9";
	return (
		<Menu.Root>
			<Menu.Trigger
				aria-label="Account menu"
				className="flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:w-9"
			>
				<Avatar className="h-8 w-8">
					<AvatarImage
						src={user.image ?? (user.email ? getGravatarUrl(user.email, 56) : undefined)}
						alt=""
					/>
					<AvatarFallback className="text-xs font-semibold">{initials(user.name)}</AvatarFallback>
				</Avatar>
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
					<Menu.Popup className="min-w-56 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 duration-150">
						<div className="px-3 py-2">
							<p className="truncate text-xs font-semibold">{user.name || "Admin"}</p>
							<p className="truncate text-micro text-muted-foreground">{user.email}</p>
						</div>
						<Menu.Separator className="my-1 h-px bg-border" />
						<Menu.LinkItem
							closeOnClick
							className={itemClass}
							render={<Link href="/admin/settings" />}
						>
							<UserCog className="h-4 w-4" />
							Account
						</Menu.LinkItem>
						<Menu.LinkItem
							closeOnClick
							className={itemClass}
							render={<Link href="/admin/settings/wallet" />}
						>
							<Wallet className="h-4 w-4" />
							Wallet pass
						</Menu.LinkItem>
						<Menu.Separator className="my-1 h-px bg-border" />
						<Menu.Item className={cn(itemClass, "text-destructive")} onClick={onSignOut}>
							<LogOut className="h-4 w-4" />
							Sign out
						</Menu.Item>
						<p className="px-3 pt-2 pb-1 text-micro text-muted-foreground">
							{adminBrandingEnabled && (
								<>
									Powered by{" "}
									<a
										href="https://github.com/mrdemonwolf/LinkDen"
										target="_blank"
										rel="noopener noreferrer"
										className="transition-colors hover:text-foreground"
									>
										LinkDen
										<span className="sr-only">(opens in new tab)</span>
									</a>{" "}
									·{" "}
								</>
							)}
							v{process.env.NEXT_PUBLIC_APP_VERSION}
							{process.env.NODE_ENV === "development" && " · DEV"}
						</p>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

function BottomTabBar({ pathname, unreadCount }: { pathname: string; unreadCount: number }) {
	return (
		<nav
			aria-label="Main navigation"
			className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
		>
			{NAV_ITEMS.map((item) => {
				const isActive = isNavActive(item.href, pathname);
				const Icon = item.icon;
				const showBadge = item.label === "Inbox" && unreadCount > 0;
				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={isActive ? "page" : undefined}
						aria-label={showBadge ? `${item.label}, ${unreadCount} unread` : undefined}
						className={cn(
							"flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-micro font-medium transition-colors",
							isActive ? "text-primary" : "text-muted-foreground",
						)}
					>
						<span className="relative">
							<Icon className="h-5 w-5" />
							{showBadge && (
								<span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground">
									{unreadCount > 99 ? "99+" : unreadCount}
								</span>
							)}
						</span>
						<span className="max-w-full truncate">{item.label}</span>
					</Link>
				);
			})}
		</nav>
	);
}

/** Below lg: FAB + MobilePreviewSheet, only while a page has a preview registered. */
function MobilePreview() {
	const reg = usePreviewRegistration();
	const [open, setOpen] = useState(false);
	if (!reg) return null;
	return (
		<>
			<Button
				type="button"
				size="icon"
				onClick={() => setOpen(true)}
				className="fixed right-4 bottom-[calc(56px+env(safe-area-inset-bottom)+1rem)] z-40 h-12 w-12 rounded-full shadow-glow lg:hidden"
				aria-label="Open live preview"
			>
				<Smartphone className="h-5 w-5" />
			</Button>
			<MobilePreviewSheet open={open} onOpenChange={setOpen}>
				<PagePreview
					overrides={reg.overrides}
					mode={reg.mode}
					onModeChange={reg.onModeChange}
					showHeader={false}
				/>
			</MobilePreviewSheet>
		</>
	);
}

/**
 * Main grid, left-aligned (never centered in the leftover space). With a
 * preview registered: tool column (≤760px) + the preview column, 32px gap.
 * Alone: a single ≤960px column.
 */
function MainGrid({ children }: { children: React.ReactNode }) {
	const hasPreview = usePreviewRegistration() !== null;
	return (
		<div
			className={cn(
				hasPreview
					? "lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-8"
					: "max-w-[960px]",
			)}
		>
			<div className={cn("min-w-0", hasPreview && "max-w-[760px]")}>{children}</div>
			<PreviewColumn />
		</div>
	);
}

/**
 * Client-side admin chrome: session gate, sidebar (≥lg), top bar, main grid
 * with the shell-owned preview column, FAB + preview sheet and bottom tab bar
 * (<lg). Rendered by the server `app/admin/layout.tsx`, which owns the metadata.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session, isPending } = authClient.useSession();
	const [registration, setRegistration] = useState<PreviewRegistration | null>(null);
	const [subLabel, setSubLabel] = useState<string | null>(null);

	const unreadQuery = useQuery({
		...trpc.forms.unreadCount.queryOptions(),
		enabled: !!session?.user,
		refetchInterval: 30000,
	});
	const brandingQuery = useQuery({
		...trpc.settings.get.queryOptions({ key: "branding_enabled" }),
		enabled: !!session?.user,
	});
	const logoQuery = useQuery({
		...trpc.settings.get.queryOptions({ key: "branding_logo_url" }),
		enabled: !!session?.user,
	});
	const siteNameQuery = useQuery({
		...trpc.settings.get.queryOptions({ key: "branding_site_name" }),
		enabled: !!session?.user,
	});

	const unreadCount = unreadQuery.data?.count ?? 0;
	const adminBrandingEnabled = brandingQuery.data?.value !== "false";
	const logoUrl = logoQuery.data?.value || "";
	const siteName = siteNameQuery.data?.value || "LinkDen";

	const isPublicRoute =
		pathname === "/admin/login" ||
		pathname === "/admin/setup" ||
		pathname.startsWith("/admin/reset-password");

	useEffect(() => {
		if (!isPending && !session?.user && !isPublicRoute) {
			router.replace("/admin/login");
		}
	}, [isPending, session, isPublicRoute, router]);

	async function handleSignOut() {
		await authClient.signOut();
		router.push("/admin/login");
	}

	if (isPublicRoute) {
		return <>{children}</>;
	}

	if (isPending) {
		return (
			<div
				className="flex min-h-screen items-center justify-center"
				role="status"
				aria-label="Loading"
			>
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!session?.user) {
		return null;
	}

	const sessionUser: SessionUser = {
		name: session.user.name ?? "",
		email: session.user.email ?? "",
		image: session.user.image,
	};
	const kicker = kickerFor(pathname, subLabel);

	return (
		<PreviewSlotSetter value={setRegistration}>
			<PreviewSlotState value={registration}>
				<KickerSetter value={setSubLabel}>
					<div className="min-h-dvh bg-background">
						<a
							href="#main-content"
							className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
						>
							Skip to main content
						</a>

						<Sidebar
							pathname={pathname}
							unreadCount={unreadCount}
							logoUrl={logoUrl}
							siteName={siteName}
							user={sessionUser}
						/>

						{/* Offset by the sidebar: 64px rail at lg, 208px at xl. */}
						<div className="lg:pl-16 xl:pl-52">
							<header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
								<span className="min-w-0 flex-1 truncate font-mono text-micro font-medium uppercase tracking-[0.14em] text-muted-foreground">
									{kicker}
								</span>
								<div className="flex shrink-0 items-center gap-1 lg:gap-2">
									<StatePill />
									<SharePopover />
									<Button
										size="sm"
										variant="outline"
										className="hidden lg:inline-flex"
										nativeButton={false}
										render={<a href="/" target="_blank" rel="noopener noreferrer" />}
									>
										<Globe className="h-3.5 w-3.5" />
										View live
									</Button>
									<span className="hidden lg:inline-flex">
										<ThemeToggle />
									</span>
									<AvatarMenu
										user={sessionUser}
										onSignOut={handleSignOut}
										adminBrandingEnabled={adminBrandingEnabled}
									/>
								</div>
							</header>

							<main
								id="main-content"
								className="px-4 py-4 pb-[calc(56px+env(safe-area-inset-bottom)+1.5rem)] md:px-6 md:py-6 md:pb-[calc(56px+env(safe-area-inset-bottom)+1.5rem)] lg:px-8 lg:pb-6"
							>
								<MainGrid>{children}</MainGrid>
							</main>
						</div>

						<MobilePreview />
						<BottomTabBar pathname={pathname} unreadCount={unreadCount} />
					</div>
				</KickerSetter>
			</PreviewSlotState>
		</PreviewSlotSetter>
	);
}
