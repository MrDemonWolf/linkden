"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { WolfLogo } from "@/components/wolf-logo";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
	LayoutDashboard,
	Blocks,
	Handshake,
	Palette,
	Settings,
	Wallet,
	Menu,
	X,
	Globe,
	UserCog,
	LogOut,
	BarChart3,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";
import { getGravatarUrl } from "@/lib/gravatar";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_GROUPS = [
	{
		label: "Main",
		items: [
			{ href: "/admin" as const, label: "Dashboard", icon: LayoutDashboard },
			{ href: "/admin/builder" as const, label: "Builder", icon: Blocks },
			{ href: "/admin/appearance" as const, label: "Appearance", icon: Palette },
		],
	},
	{
		label: "Engage",
		items: [
			{ href: "/admin/analytics" as const, label: "Analytics", icon: BarChart3 },
			{ href: "/admin/connections" as const, label: "Connections", icon: Handshake },
		],
	},
	{
		label: "System",
		items: [
			{ href: "/admin/wallet" as const, label: "Wallet", icon: Wallet },
			{ href: "/admin/account" as const, label: "Account", icon: UserCog },
			{ href: "/admin/settings" as const, label: "Settings", icon: Settings },
		],
	},
] as const;

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => [...g.items]);

const BOTTOM_NAV_ITEMS = [
	{ href: "/admin" as const, label: "Dashboard", icon: LayoutDashboard },
	{ href: "/admin/builder" as const, label: "Builder", icon: Blocks },
	{ href: "/admin/analytics" as const, label: "Analytics", icon: BarChart3 },
	{ href: "/admin/settings" as const, label: "Settings", icon: Settings },
];

function DesktopTopBar({ pathname, siteName }: { pathname: string; siteName: string }) {
	const currentPageLabel =
		ALL_NAV_ITEMS.find((item) =>
			item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
		)?.label ?? "";

	return (
		<div className="hidden md:flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-6">
			<div className="flex items-center gap-3">
				<h2 className="text-sm font-semibold">{currentPageLabel}</h2>
				<span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5">
					<span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
					<span className="text-[10px] font-medium text-foreground font-mono">{siteName}</span>
				</span>
			</div>
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

function SidebarContent({
	pathname,
	unreadCount,
	adminBrandingEnabled,
	logoUrl,
	siteName,
	user,
	onNavClick,
}: {
	pathname: string;
	unreadCount: number;
	adminBrandingEnabled: boolean;
	logoUrl: string;
	siteName: string;
	user: { name: string; email: string; image?: string | null } | null;
	onNavClick?: () => void;
}) {
	const isDev = process.env.NODE_ENV === "development";
	const router = useRouter();

	async function handleSignOut() {
		await authClient.signOut();
		router.push("/admin/login");
	}

	function renderNavItem(item: { href: string; label: string; icon: React.ElementType }) {
		const isActive =
			item.href === "/admin"
				? pathname === "/admin"
				: pathname.startsWith(item.href);
		const Icon = item.icon;

		return (
			<Link
				key={item.href}
				href={item.href as never}
				onClick={onNavClick}
				aria-current={isActive ? "page" : undefined}
				aria-label={item.label === "Connections" && unreadCount > 0 ? `Connections, ${unreadCount} unread` : undefined}
				className={cn(
					"relative flex items-center gap-2.5 rounded-lg px-3 py-2 min-h-[44px] text-xs font-medium transition-all",
					isActive
						? "bg-primary/10 text-foreground"
						: "text-muted-foreground hover:text-foreground hover:bg-white/5",
				)}
			>
				{isActive && (
					<span
						aria-hidden
						className="absolute left-0 top-2 bottom-2 w-0.5 rounded-sm bg-primary shadow-[0_0_10px_var(--primary)]"
					/>
				)}
				<Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
				<span>{item.label}</span>
				{item.label === "Connections" && unreadCount > 0 && (
					<span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-semibold text-white">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</Link>
		);
	}

	return (
		<div className="flex h-full flex-col">
			{/* Logo + subtitle */}
			<div className="flex items-center gap-3 px-4 h-14 border-b border-white/5">
				{logoUrl ? (
					<img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
				) : (
					<WolfLogo className="h-16 w-16 shrink-0" />
				)}
				<div className="flex flex-col min-w-0">
					<span className="text-sm font-semibold leading-tight truncate">{siteName}</span>
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Admin Console
					</span>
				</div>
			</div>

			{/* Nav */}
			<nav aria-label="Main navigation" className="flex-1 px-2 py-2 space-y-3 overflow-y-auto">
				{NAV_GROUPS.map((group) => (
					<div key={group.label} className="space-y-0.5">
						<p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
							{group.label}
						</p>
						{(group.items as readonly { href: string; label: string; icon: React.ElementType }[]).map((item) =>
							renderNavItem(item),
						)}
					</div>
				))}
			</nav>

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
				<p className="text-xs text-muted-foreground">v0.1.0{isDev && " · DEV"}</p>
			</div>

			{/* User profile footer */}
			<div className="border-t border-white/5 px-3 py-3">
				<div className="flex items-center gap-2.5">
					<Avatar className="h-8 w-8 shrink-0">
						<AvatarImage
							src={user?.image ?? (user?.email ? getGravatarUrl(user.email, 56) : undefined)}
							alt={user?.name ?? "Admin"}
						/>
						<AvatarFallback className="text-xs font-semibold">
							{initials(user?.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<p className="text-xs font-semibold truncate">{user?.name ?? "Admin"}</p>
						<p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
					</div>
					<button
						type="button"
						onClick={handleSignOut}
						className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
						aria-label="Sign out"
					>
						<LogOut className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>
	);
}

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
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
		pathname === "/admin/login" || pathname === "/admin/setup" || pathname === "/admin/reset-password" || pathname.startsWith("/admin/reset-password");

	useEffect(() => {
		if (!isPending && !session?.user && !isPublicRoute) {
			router.replace("/admin/login");
		}
	}, [isPending, session, isPublicRoute, router]);

	if (isPublicRoute) {
		return <>{children}</>;
	}

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!session?.user) {
		return null;
	}

	const sessionUser = session.user
		? { name: session.user.name ?? "", email: session.user.email ?? "", image: session.user.image }
		: null;

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
			<aside aria-label="Sidebar" className="hidden w-56 shrink-0 border-r border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/40 backdrop-blur-2xl z-20 md:block">
				<div className="sticky top-0 h-screen overflow-y-auto">
					<SidebarContent
						pathname={pathname}
						unreadCount={unreadCount}
						adminBrandingEnabled={adminBrandingEnabled}
						logoUrl={logoUrl}
						siteName={siteName}
						user={sessionUser}
					/>
				</div>
			</aside>

			{/* Mobile header */}
			<div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center border-b border-white/20 dark:border-white/10 backdrop-blur-2xl bg-white/70 dark:bg-black/40 px-4 md:hidden">
				<div className="flex items-center gap-2 shrink-0">
					{logoUrl ? (
						<img src={logoUrl} alt="" className="h-6 w-6 rounded-md object-cover" />
					) : (
						<WolfLogo className="h-12 w-12" />
					)}
					<span className="text-xs font-semibold">{siteName}</span>
				</div>
				{/* Current page — centered absolute */}
				<span className="absolute inset-x-0 text-center text-xs font-medium text-muted-foreground pointer-events-none">
					{ALL_NAV_ITEMS.find((item) =>
						item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
					)?.label ?? ""}
				</span>
				<button
					type="button"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					className="flex h-11 w-11 items-center justify-center text-muted-foreground ml-auto"
					aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
					aria-expanded={mobileMenuOpen}
				>
					{mobileMenuOpen ? (
						<X className="h-4 w-4" />
					) : (
						<Menu className="h-4 w-4" />
					)}
				</button>
			</div>

			{/* Mobile dropdown menu */}
			{mobileMenuOpen && (
				<>
					<div
						className="fixed inset-0 top-12 z-40 md:hidden"
						onClick={() => setMobileMenuOpen(false)}
					/>
					<div
						className="fixed inset-x-0 top-12 z-50 md:hidden bg-white/90 dark:bg-black/80 backdrop-blur-2xl border-b border-white/20 dark:border-white/10 shadow-xl"
						role="dialog"
						aria-modal="true"
						aria-label="Navigation menu"
						onKeyDown={(e) => {
							if (e.key === "Escape") setMobileMenuOpen(false);
						}}
					>
						<nav className="flex flex-col px-2 py-2 gap-0.5" aria-label="Navigation">
							{NAV_GROUPS.map((group) => (
								<div key={group.label}>
									<p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
										{group.label}
									</p>
									{(group.items as readonly { href: string; label: string; icon: React.ElementType }[]).map((item) => {
										const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
										const Icon = item.icon;
										return (
											<Link
												key={item.href}
												href={item.href as never}
												onClick={() => setMobileMenuOpen(false)}
												aria-current={isActive ? "page" : undefined}
												className={cn(
													"flex items-center gap-3 rounded-lg px-3 py-3 min-h-[44px] text-sm font-medium transition-all",
													isActive
														? "bg-primary/10 text-primary"
														: "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground",
												)}
											>
												<Icon className="h-4 w-4 shrink-0" />
												{item.label}
												{item.label === "Connections" && unreadCount > 0 && (
													<span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-semibold text-white">
														{unreadCount > 99 ? "99+" : unreadCount}
													</span>
												)}
											</Link>
										);
									})}
								</div>
							))}
						</nav>
						<div className="border-t border-white/10 px-4 py-2.5 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Avatar className="h-6 w-6 shrink-0">
									<AvatarImage
										src={sessionUser?.image ?? (sessionUser?.email ? getGravatarUrl(sessionUser.email, 48) : undefined)}
										alt={sessionUser?.name ?? "Admin"}
									/>
									<AvatarFallback className="text-xs font-semibold">
										{initials(sessionUser?.name)}
									</AvatarFallback>
								</Avatar>
								<span className="text-xs font-medium truncate">{sessionUser?.name ?? "Admin"}</span>
							</div>
							<button
								type="button"
								onClick={async () => {
									setMobileMenuOpen(false);
									await authClient.signOut();
									router.push("/admin/login");
								}}
								className="text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								Sign out
							</button>
						</div>
					</div>
				</>
			)}

			{/* Mobile bottom nav */}
			<nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/20 dark:border-white/10 backdrop-blur-2xl bg-white/70 dark:bg-black/40 md:hidden">
				{BOTTOM_NAV_ITEMS.map((item) => {
					const isActive =
						item.href === "/admin"
							? pathname === "/admin"
							: pathname.startsWith(item.href);
					const Icon = item.icon;

					return (
						<Link
							key={item.href}
							href={item.href as never}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"flex flex-1 flex-col items-center justify-center gap-1 min-h-[48px] text-xs font-medium transition-colors",
								isActive
									? "text-primary"
									: "text-muted-foreground",
							)}
						>
							<Icon className="h-5 w-5" />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* Right side: top bar + main content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				<DesktopTopBar pathname={pathname} siteName={siteName} />
				<main id="main-content" className="flex-1 overflow-y-auto pt-12 pb-16 md:pt-0 md:pb-0">
					<div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 md:p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
