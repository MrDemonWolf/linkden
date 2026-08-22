"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isNavActive, NAV_GROUPS, NavList } from "@/components/admin/nav-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WolfLogo } from "@/components/wolf-logo";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";
import { getGravatarUrl } from "@/lib/gravatar";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const BOTTOM_NAV_ITEMS = ALL_NAV_ITEMS.filter((i) => i.bottom);

type SessionUser = { name: string; email: string; image?: string | null } | null;

function DesktopTopBar({ pathname }: { pathname: string }) {
	const currentPageLabel =
		ALL_NAV_ITEMS.find((item) => isNavActive(item.href, pathname))?.label ?? "";

	return (
		<div className="hidden md:flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
			{/* Non-heading label: pages own their single h1 via PageHeader */}
			<span className="text-micro font-mono font-medium uppercase tracking-[0.14em] text-muted-foreground">
				{currentPageLabel}
			</span>
			<div className="flex items-center gap-3">
				<ThemeToggle />
				<a href="/" target="_blank" rel="noopener noreferrer">
					<Button size="sm" variant="default">
						<Globe className="mr-1.5 h-3.5 w-3.5" />
						View Live
					</Button>
				</a>
			</div>
		</div>
	);
}

/** Avatar + name/email + sign-out. Shared by the sidebar and the mobile Sheet. */
function UserFooter({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
	return (
		<div className="border-t border-border/50 px-3 py-3">
			<div className="flex items-center gap-2.5">
				<Avatar className="h-8 w-8 shrink-0">
					<AvatarImage
						src={user?.image ?? (user?.email ? getGravatarUrl(user.email, 56) : undefined)}
						alt={user?.name ?? "Admin"}
					/>
					<AvatarFallback className="text-xs font-semibold">{initials(user?.name)}</AvatarFallback>
				</Avatar>
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold truncate" title={user?.name}>
						{user?.name ?? "Admin"}
					</p>
					<p className="text-micro text-muted-foreground truncate" title={user?.email}>
						{user?.email}
					</p>
				</div>
				<button
					type="button"
					onClick={onSignOut}
					className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
					aria-label="Sign out"
				>
					<LogOut className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
}

function SidebarContent({
	pathname,
	unreadCount,
	adminBrandingEnabled,
	logoUrl,
	siteName,
	user,
	onSignOut,
}: {
	pathname: string;
	unreadCount: number;
	adminBrandingEnabled: boolean;
	logoUrl: string;
	siteName: string;
	user: SessionUser;
	onSignOut: () => void;
}) {
	const isDev = process.env.NODE_ENV === "development";

	return (
		<div className="flex h-full flex-col">
			{/* Logo + subtitle */}
			<div className="flex items-center gap-3 px-4 h-14 border-b border-border/50">
				{logoUrl ? (
					<img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
				) : (
					<WolfLogo className="h-9 w-9 shrink-0" />
				)}
				<div className="flex flex-col min-w-0">
					<span className="text-sm font-semibold leading-tight truncate">{siteName}</span>
					<span className="text-micro font-bold uppercase tracking-wider text-muted-foreground">
						Admin Console
					</span>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				<NavList pathname={pathname} unreadCount={unreadCount} />
			</div>

			{/* Branding + version */}
			<div className="px-4 pb-2">
				{adminBrandingEnabled && (
					<p className="text-xs text-muted-foreground">
						Powered by{" "}
						<a
							href="https://github.com/mrdemonwolf/LinkDen"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-foreground transition-colors"
						>
							LinkDen
							<span className="sr-only">(opens in new tab)</span>
						</a>
					</p>
				)}
				<p className="text-xs text-muted-foreground">
					v{process.env.NEXT_PUBLIC_APP_VERSION}
					{isDev && " · DEV"}
				</p>
			</div>

			<UserFooter user={user} onSignOut={onSignOut} />
		</div>
	);
}

/**
 * Client-side admin chrome: session gate, sidebar, mobile header/sheet/bottom
 * nav. Rendered by the server `app/admin/layout.tsx`, which owns the metadata.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session, isPending } = authClient.useSession();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
		pathname === "/admin/reset-password" ||
		pathname.startsWith("/admin/reset-password");

	useEffect(() => {
		if (!isPending && !session?.user && !isPublicRoute) {
			router.replace("/admin/login");
		}
	}, [isPending, session, isPublicRoute, router]);

	async function handleSignOut() {
		setMobileMenuOpen(false);
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

	return (
		<div className="admin-glass-bg flex min-h-screen">
			{/* Skip to content */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
			>
				Skip to main content
			</a>

			{/* Desktop sidebar */}
			<aside
				aria-label="Sidebar"
				className="hidden w-56 shrink-0 border-r border-border bg-sidebar backdrop-blur-2xl z-20 md:block"
			>
				<div className="sticky top-0 h-screen overflow-y-auto">
					<SidebarContent
						pathname={pathname}
						unreadCount={unreadCount}
						adminBrandingEnabled={adminBrandingEnabled}
						logoUrl={logoUrl}
						siteName={siteName}
						user={sessionUser}
						onSignOut={handleSignOut}
					/>
				</div>
			</aside>

			{/* Mobile header */}
			<div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center border-b border-border backdrop-blur-2xl bg-sidebar px-4 md:hidden">
				<div className="flex items-center shrink-0">
					{logoUrl ? (
						<img src={logoUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
					) : (
						<WolfLogo className="h-7 w-7" />
					)}
					<span className="sr-only">{siteName}</span>
				</div>
				{/* Current page — centered absolute */}
				<span className="absolute inset-x-0 text-center text-xs font-medium text-muted-foreground pointer-events-none">
					{ALL_NAV_ITEMS.find((item) => isNavActive(item.href, pathname))?.label ?? ""}
				</span>
				<button
					type="button"
					onClick={() => setMobileMenuOpen(true)}
					className="relative flex h-11 w-11 items-center justify-center text-muted-foreground ml-auto"
					aria-label={
						unreadCount > 0 ? `Open menu, ${unreadCount} unread connections` : "Open menu"
					}
					aria-expanded={mobileMenuOpen}
				>
					<Menu className="h-4 w-4" />
					{unreadCount > 0 && (
						<span
							className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar"
							aria-hidden="true"
						/>
					)}
				</button>
			</div>

			{/* Mobile menu — Sheet owns focus trap, Escape, scroll lock and focus restore */}
			<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} title="Menu" breakpoint="md">
				<NavList
					pathname={pathname}
					unreadCount={unreadCount}
					onNavClick={() => setMobileMenuOpen(false)}
				/>
				<UserFooter user={sessionUser} onSignOut={handleSignOut} />
			</Sheet>

			{/* Mobile bottom nav */}
			<nav
				aria-label="Quick navigation"
				className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border backdrop-blur-2xl bg-sidebar md:hidden"
			>
				{BOTTOM_NAV_ITEMS.map((item) => {
					const isActive = isNavActive(item.href, pathname);
					const Icon = item.icon;
					const showBadge = item.label === "Connections" && unreadCount > 0;

					return (
						<Link
							key={item.href}
							href={item.href}
							aria-current={isActive ? "page" : undefined}
							aria-label={showBadge ? `${item.label}, ${unreadCount} unread` : undefined}
							className={cn(
								"flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 min-h-[48px] text-xs font-medium transition-colors",
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

			{/* Right side: top bar + main content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				<DesktopTopBar pathname={pathname} />
				<main id="main-content" className="flex-1 overflow-y-auto pt-12 pb-16 md:pt-0 md:pb-0">
					<div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 md:p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
