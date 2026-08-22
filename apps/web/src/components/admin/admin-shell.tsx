"use client";

import { Menu } from "@base-ui/react/menu";
import { useQuery } from "@tanstack/react-query";
import { Globe, LogOut, Pin, PinOff, Smartphone, UserCog, Wallet } from "lucide-react";
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
import { WolfLogo } from "@/components/wolf-logo";
import { useMediaQuery } from "@/hooks/use-media-query";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";
import { getGravatarUrl } from "@/lib/gravatar";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

const RAIL_PINNED_KEY = "admin.rail.pinned";

type SessionUser = { name: string; email: string; image?: string | null };

/** `LINKS / PROFILE`: destination from NAV_ITEMS + the page's sub-tab label (or its path segment). */
function kickerFor(pathname: string, subLabel: string | null) {
	const item = activeNavItem(pathname);
	if (!item) return subLabel ?? "";
	const segment = pathname.slice(item.href.length + 1).split("/")[0];
	const sub = subLabel ?? (segment ? segment.replace(/-/g, " ") : "");
	return sub ? `${item.label} / ${sub}` : item.label;
}

/** 64px icon rail; at xl it expands to 208px on hover/focus-within, or stays open when pinned. */
function Rail({
	pathname,
	unreadCount,
	logoUrl,
	siteName,
	pinned,
	onTogglePin,
}: {
	pathname: string;
	unreadCount: number;
	logoUrl: string;
	siteName: string;
	pinned: boolean;
	onTogglePin: () => void;
}) {
	const canExpand = useMediaQuery("(min-width: 1280px)", true);
	const [hover, setHover] = useState(false);
	const expanded = canExpand && (pinned || hover);

	return (
		<aside
			aria-label="Sidebar"
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			onFocus={() => setHover(true)}
			onBlur={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(false);
			}}
			className={cn(
				"fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-rule bg-sidebar transition-[width] duration-180 ease-out lg:flex",
				expanded ? "w-52" : "w-16",
				expanded && !pinned && "shadow-card",
			)}
		>
			<div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-rule px-4">
				{logoUrl ? (
					<img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
				) : (
					<WolfLogo className="h-8 w-8 shrink-0" />
				)}
				<span className={cn("truncate text-sm font-semibold", !expanded && "sr-only")}>
					{siteName}
				</span>
			</div>
			<div className="flex-1 overflow-y-auto">
				<NavList pathname={pathname} unreadCount={unreadCount} expanded={expanded} />
			</div>
			{canExpand && (
				<div className="border-t border-rule p-2">
					<button
						type="button"
						onClick={onTogglePin}
						aria-pressed={pinned}
						aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
						className={cn(
							"flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
							!expanded && "justify-center px-0",
						)}
					>
						{pinned ? (
							<PinOff className="h-4 w-4 shrink-0" />
						) : (
							<Pin className="h-4 w-4 shrink-0" />
						)}
						<span className={cn(!expanded && "sr-only")}>{pinned ? "Unpin" : "Pin open"}</span>
					</button>
				</div>
			)}
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
			className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
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

/** Main grid: tool column (720px beside a preview, 880px alone) + the preview column. */
function MainGrid({ children }: { children: React.ReactNode }) {
	const hasPreview = usePreviewRegistration() !== null;
	return (
		<div
			className={cn(
				"mx-auto flex items-start gap-6",
				hasPreview ? "max-w-[calc(720px+1.5rem+360px)]" : "max-w-[880px]",
			)}
		>
			<div className={cn("min-w-0 flex-1", hasPreview && "max-w-[720px]")}>{children}</div>
			<PreviewColumn />
		</div>
	);
}

/**
 * Client-side admin chrome: session gate, icon rail (≥lg), top bar, main grid
 * with the shell-owned preview column, FAB + preview sheet and bottom tab bar
 * (<lg). Rendered by the server `app/admin/layout.tsx`, which owns the metadata.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session, isPending } = authClient.useSession();
	const [registration, setRegistration] = useState<PreviewRegistration | null>(null);
	const [subLabel, setSubLabel] = useState<string | null>(null);
	const [railPinned, setRailPinned] = useState(false);
	useEffect(() => {
		setRailPinned(localStorage.getItem(RAIL_PINNED_KEY) === "1");
	}, []);
	const toggleRailPin = () => {
		setRailPinned((p) => {
			localStorage.setItem(RAIL_PINNED_KEY, p ? "0" : "1");
			return !p;
		});
	};

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

						<Rail
							pathname={pathname}
							unreadCount={unreadCount}
							logoUrl={logoUrl}
							siteName={siteName}
							pinned={railPinned}
							onTogglePin={toggleRailPin}
						/>

						{/* Offset by the rail: 64px, or 208px when pinned open (xl only — the
						    rail never expands below xl). Hover-expand overlays instead. */}
						<div className={cn("lg:pl-16", railPinned && "xl:pl-52")}>
							<header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-rule bg-sidebar px-3 lg:h-[52px] lg:px-6">
								<span className="min-w-0 flex-1 truncate font-mono text-micro font-medium uppercase tracking-[0.14em] text-muted-foreground">
									{kicker}
								</span>
								<StatePill />
								<div className="flex flex-1 items-center justify-end gap-1 lg:gap-2">
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
								className="px-4 py-4 pb-[calc(56px+env(safe-area-inset-bottom)+1.5rem)] md:p-6 md:pb-[calc(56px+env(safe-area-inset-bottom)+1.5rem)] lg:pb-6"
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
