"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Globe, LogOut, Smartphone, UserCog, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobilePreviewSheet } from "@/components/admin/mobile-preview-sheet";
import { activeNavItem, isNavActive, NAV_ITEMS } from "@/components/admin/nav-list";
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
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WolfLogo } from "@/components/wolf-logo";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";
import { getGravatarUrl } from "@/lib/gravatar";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

type SessionUser = { name: string; email: string; image?: string | null };

const APP_VERSION = `v${process.env.NEXT_PUBLIC_APP_VERSION}${
	process.env.NODE_ENV === "development" ? " · DEV" : ""
}`;

/** Destination + the page's sub-tab (label, or the path segment) — the breadcrumb trail. */
function crumbsFor(pathname: string, subLabel: string | null) {
	const item = activeNavItem(pathname);
	if (!item) return { destination: null, sub: subLabel };
	const segment = pathname.slice(item.href.length + 1).split("/")[0];
	const sub = subLabel ?? (segment ? segment.replace(/-/g, " ") : null);
	return { destination: item, sub };
}

function UserAvatar({ user, className }: { user: SessionUser; className?: string }) {
	return (
		<Avatar className={cn("size-8 shrink-0 rounded-md", className)}>
			<AvatarImage
				src={user.image ?? (user.email ? getGravatarUrl(user.email, 56) : undefined)}
				alt=""
			/>
			<AvatarFallback className="rounded-md text-xs font-semibold">
				{initials(user.name)}
			</AvatarFallback>
		</Avatar>
	);
}

/**
 * The one account surface: identity, Account, Wallet pass, Sign out. It lives
 * in the sidebar footer at lg and up and — because the sidebar is not rendered
 * below lg (the bottom tab bar is the only navigation there) — in the top bar
 * below lg. Exactly one instance is ever visible, so sign-out has one home per
 * breakpoint.
 */
function AccountMenu({
	user,
	onSignOut,
	adminBrandingEnabled,
	side,
	children,
}: {
	user: SessionUser;
	onSignOut: () => void;
	adminBrandingEnabled: boolean;
	/** "top" from the sidebar footer, "bottom" from the top bar. */
	side: "top" | "bottom";
	children: React.ReactNode;
}) {
	return (
		<DropdownMenu>
			{children}
			<DropdownMenuContent align="end" side={side} sideOffset={8} className="w-56 p-1">
				{/* Base UI's GroupLabel throws ("MenuGroupRootContext is missing") unless
				    it sits inside a Group, so the identity header and the two account
				    destinations it names are one group. Sign out stays outside it. */}
				<DropdownMenuGroup>
					<DropdownMenuLabel className="px-2 py-1.5">
						<span className="block truncate text-xs font-semibold text-foreground">
							{user.name || "Admin"}
						</span>
						<span className="block truncate text-micro font-normal text-muted-foreground">
							{user.email}
						</span>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="min-h-11 md:min-h-9"
						render={<Link href="/admin/settings" />}
					>
						<UserCog />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem
						className="min-h-11 md:min-h-9"
						render={<Link href="/admin/settings/wallet" />}
					>
						<Wallet />
						Wallet pass
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" className="min-h-11 md:min-h-9" onClick={onSignOut}>
					<LogOut />
					Sign out
				</DropdownMenuItem>
				<p className="px-2 pt-2 pb-1 text-micro text-muted-foreground">
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
					{APP_VERSION}
				</p>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * The shadcn Sidebar, icon-collapsible: brand mark + site name on top (the
 * name folds away when collapsed), the five destinations in one group, the
 * account menu in the footer. Every button carries its label as a tooltip so
 * the collapsed rail explains itself.
 */
function AdminSidebar({
	pathname,
	unreadCount,
	logoUrl,
	siteName,
	user,
	onSignOut,
	adminBrandingEnabled,
}: {
	pathname: string;
	unreadCount: number;
	logoUrl: string;
	siteName: string;
	user: SessionUser;
	onSignOut: () => void;
	adminBrandingEnabled: boolean;
}) {
	return (
		<Sidebar collapsible="icon" className="border-r border-sidebar-border">
			<SidebarHeader className="h-13 shrink-0 justify-center border-b border-sidebar-border">
				<div className="flex items-center gap-2 overflow-hidden px-1 group-data-[collapsible=icon]:px-0">
					{logoUrl ? (
						<img src={logoUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" />
					) : (
						<WolfLogo className="size-8 shrink-0" />
					)}
					<span className="truncate font-display text-sm font-semibold group-data-[collapsible=icon]:hidden">
						{siteName}
					</span>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{NAV_ITEMS.map((item) => {
								const isActive = isNavActive(item.href, pathname);
								const showBadge = item.label === "Inbox" && unreadCount > 0;
								const Icon = item.icon;
								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											isActive={isActive}
											tooltip={item.label}
											aria-label={showBadge ? `${item.label}, ${unreadCount} unread` : undefined}
											className="min-h-11 md:min-h-8 data-active:[&_svg]:text-sidebar-primary"
											render={<Link href={item.href} />}
										>
											<Icon />
											<span>{item.label}</span>
										</SidebarMenuButton>
										{showBadge && (
											<SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground peer-hover/menu-button:text-sidebar-primary-foreground peer-data-active/menu-button:text-sidebar-primary-foreground">
												{unreadCount > 99 ? "99+" : unreadCount}
											</SidebarMenuBadge>
										)}
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border">
				<SidebarMenu>
					<SidebarMenuItem>
						<AccountMenu
							user={user}
							onSignOut={onSignOut}
							adminBrandingEnabled={adminBrandingEnabled}
							side="top"
						>
							<DropdownMenuTrigger
								aria-label="Account menu"
								render={<SidebarMenuButton size="lg" />}
							>
								<UserAvatar user={user} />
								<span className="grid min-w-0 flex-1 text-left">
									<span className="truncate text-xs font-medium">{user.name || "Admin"}</span>
									<span className="truncate font-mono text-micro text-muted-foreground">
										{APP_VERSION}
									</span>
								</span>
								<ChevronsUpDown className="ml-auto" />
							</DropdownMenuTrigger>
						</AccountMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
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
 * preview registered: tool column (<=760px) + the preview column, 32px gap.
 * Alone: a single <=960px column.
 */
function MainGrid({ children }: { children: React.ReactNode }) {
	const hasPreview = usePreviewRegistration() !== null;
	return (
		<div
			className={cn(
				hasPreview
					? // The rail track is `auto`, not a fixed 360px: PreviewColumn owns its
						// own width (300px at lg, 372px at xl, 40px collapsed) and a fixed
						// track would either overflow at xl or leave dead space collapsed.
						"lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-8"
					: "max-w-[960px]",
			)}
		>
			<div className={cn("min-w-0", hasPreview && "max-w-[760px]")}>{children}</div>
			<PreviewColumn />
		</div>
	);
}

/**
 * Client-side admin chrome: session gate, shadcn Sidebar (>=lg), 52px top bar
 * with the breadcrumb and page actions, main grid with the shell-owned preview
 * column, FAB + preview sheet and bottom tab bar (<lg). Rendered by the server
 * `app/admin/layout.tsx`, which owns the metadata.
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

	// Portalled surfaces — dropdown menus, popovers, tooltips, dialogs, sheets —
	// mount on `document.body`, outside the shell root, so the `.admin-scope`
	// class on the provider below can't reach them and they'd keep the public
	// page's 18px corners next to the console's 8px ones. Mirroring the class
	// onto <body> for as long as the console is mounted is what makes the
	// tighter radius scale actually console-wide.
	useEffect(() => {
		if (isPublicRoute) return;
		document.body.classList.add("admin-scope");
		return () => document.body.classList.remove("admin-scope");
	}, [isPublicRoute]);

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
	const { destination, sub } = crumbsFor(pathname, subLabel);

	return (
		<PreviewSlotSetter value={setRegistration}>
			<PreviewSlotState value={registration}>
				<KickerSetter value={setSubLabel}>
					{/* `admin-scope` retunes the radius scale for the whole console. */}
					<SidebarProvider className="admin-scope min-h-dvh bg-background">
						<a
							href="#main-content"
							className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
						>
							Skip to main content
						</a>

						{/* One navigation system per breakpoint: the sidebar (and its mobile
						    drawer) never renders below lg, where the bottom tab bar rules. */}
						<div className="hidden lg:contents">
							<AdminSidebar
								pathname={pathname}
								unreadCount={unreadCount}
								logoUrl={logoUrl}
								siteName={siteName}
								user={sessionUser}
								onSignOut={handleSignOut}
								adminBrandingEnabled={adminBrandingEnabled}
							/>
						</div>

						<SidebarInset className="min-w-0">
							<header className="sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
								<SidebarTrigger className="-ml-1 hidden lg:inline-flex" />
								<Separator
									orientation="vertical"
									className="hidden h-4 data-vertical:self-center lg:block"
								/>
								<Breadcrumb className="min-w-0 flex-1">
									<BreadcrumbList className="flex-nowrap text-micro">
										{destination &&
											(sub ? (
												<>
													<BreadcrumbItem className="min-w-0">
														<BreadcrumbLink
															// 16px of type in a 52px bar: a pseudo-element carries the
															// 44px touch target below md without changing the layout.
															className="relative truncate after:absolute after:inset-x-0 after:-inset-y-3.5 after:content-[''] md:after:hidden"
															render={<Link href={destination.href} />}
														>
															{destination.label}
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem className="min-w-0">
														<BreadcrumbPage className="truncate capitalize">{sub}</BreadcrumbPage>
													</BreadcrumbItem>
												</>
											) : (
												<BreadcrumbItem className="min-w-0">
													<BreadcrumbPage className="truncate">{destination.label}</BreadcrumbPage>
												</BreadcrumbItem>
											))}
									</BreadcrumbList>
								</Breadcrumb>
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
									{/* Below lg the sidebar footer is not rendered, so the account
									    menu (and with it, sign-out) lives here instead. */}
									<span className="lg:hidden">
										<AccountMenu
											user={sessionUser}
											onSignOut={handleSignOut}
											adminBrandingEnabled={adminBrandingEnabled}
											side="bottom"
										>
											<DropdownMenuTrigger
												aria-label="Account menu"
												render={<Button variant="ghost" size="icon" />}
											>
												<UserAvatar user={sessionUser} />
											</DropdownMenuTrigger>
										</AccountMenu>
									</span>
								</div>
							</header>

							{/* SidebarInset is itself the <main> landmark, so this is a div —
							    two nested <main> elements would be one landmark too many. */}
							<div
								id="main-content"
								tabIndex={-1}
								className="px-6 py-6 pb-[calc(56px+env(safe-area-inset-bottom)+1.5rem)] outline-none lg:px-8 lg:pb-6"
							>
								<MainGrid>{children}</MainGrid>
							</div>
						</SidebarInset>

						<MobilePreview />
						<BottomTabBar pathname={pathname} unreadCount={unreadCount} />
					</SidebarProvider>
				</KickerSetter>
			</PreviewSlotState>
		</PreviewSlotSetter>
	);
}
