"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
	LayoutDashboard,
	Blocks,
	BarChart3,
	Mail,
	Palette,
	Settings,
	Share2,
	Wallet,
	ExternalLink,
	Menu,
	X,
	Sun,
	Moon,
	Monitor,
	ChevronDown,
	Bell,
	Globe,
	User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";
import { getGravatarUrl } from "@/lib/gravatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_GROUPS = [
	{
		label: null,
		items: [
			{ href: "/admin" as const, label: "Dashboard", icon: LayoutDashboard },
			{ href: "/admin/builder" as const, label: "Builder", icon: Blocks },
			{ href: "/admin/analytics" as const, label: "Analytics", icon: BarChart3 },
			{ href: "/admin/forms" as const, label: "Forms", icon: Mail },
		],
	},
	{
		label: "Customize",
		items: [
			{ href: "/admin/appearance" as const, label: "Appearance", icon: Palette },
			{ href: "/admin/social" as const, label: "Social", icon: Share2 },
			{ href: "/admin/wallet" as const, label: "Wallet", icon: Wallet },
		],
	},
] as const;

const SETTINGS_ITEM = { href: "/admin/settings" as const, label: "Settings", icon: Settings };

const BOTTOM_NAV_ITEMS = [
	{ href: "/admin" as const, label: "Dashboard", icon: LayoutDashboard },
	{ href: "/admin/builder" as const, label: "Builder", icon: Blocks },
	{ href: "/admin/analytics" as const, label: "Analytics", icon: BarChart3 },
	{ href: "/admin/forms" as const, label: "Forms", icon: Mail },
	{ href: "/admin/profile" as const, label: "Profile", icon: User },
];

const THEME_OPTIONS = [
	{ value: "light", icon: Sun, label: "Light" },
	{ value: "dark", icon: Moon, label: "Dark" },
	{ value: "system", icon: Monitor, label: "System" },
] as const;

function initials(name?: string | null) {
	if (!name) return "?";
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

function SidebarContent({
	pathname,
	unreadCount,
	adminBrandingEnabled,
	user,
	onNavClick,
}: {
	pathname: string;
	unreadCount: number;
	adminBrandingEnabled: boolean;
	user: { name: string; email: string; image?: string | null } | null;
	onNavClick?: () => void;
}) {
	const isDev = process.env.NODE_ENV === "development";
	const { setTheme, theme: adminTheme } = useTheme();
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
				aria-label={item.label === "Forms" && unreadCount > 0 ? `Forms, ${unreadCount} unread` : undefined}
				className={cn(
					"flex items-center gap-2.5 rounded-lg px-3 py-2 min-h-[44px] text-xs font-medium transition-all",
					isActive
						? "bg-primary/10 text-primary border-l-2 border-primary -ml-px"
						: "text-muted-foreground hover:bg-white/10 hover:backdrop-blur-sm hover:text-foreground",
				)}
			>
				<Icon className="h-4 w-4 shrink-0" />
				<span>{item.label}</span>
				{item.label === "Forms" && unreadCount > 0 && (
					<span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</Link>
		);
	}

	return (
		<div className="flex h-full flex-col">
			{/* Logo + Bell */}
			<div className="flex items-center gap-2 px-4 py-6">
				<div className="flex h-8 w-8 items-center justify-center bg-primary/90 backdrop-blur-sm rounded-lg text-primary-foreground text-sm font-bold">
					LD
				</div>
				<span className="flex-1 text-sm font-semibold tracking-tight">LinkDen</span>
				<button
					type="button"
					className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
					aria-label="Notifications"
				>
					<Bell className="h-4 w-4" />
				</button>
			</div>

			{/* Nav */}
			<nav aria-label="Main navigation" className="flex-1 px-2 space-y-1">
				{NAV_GROUPS.map((group) => (
					<div key={group.label ?? "main"} className="space-y-0.5">
						{group.label && (
							<p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{group.label}
							</p>
						)}
						{group.items.map((item) => renderNavItem(item))}
					</div>
				))}

				{/* Settings — standalone at bottom of nav */}
				<div className="pt-1">
					{renderNavItem(SETTINGS_ITEM)}
				</div>
			</nav>

			{/* Docs + View Live external links */}
			<div className="px-2 pb-2 space-y-0.5">
				<a
					href={isDev ? "http://localhost:3002" : "https://mrdemonwolf.github.io/linkden/"}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-white/10 hover:backdrop-blur-sm hover:text-foreground transition-all"
				>
					<ExternalLink className="h-3.5 w-3.5" />
					<span>View Docs</span>
					<span className="sr-only">(opens in new tab)</span>
				</a>
				<a
					href="/"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-white/10 hover:backdrop-blur-sm hover:text-foreground transition-all"
				>
					<Globe className="h-3.5 w-3.5" />
					<span>View Live Page</span>
					<span className="sr-only">(opens in new tab)</span>
				</a>
			</div>

			{/* Theme toggle */}
			<div className="px-2 pb-2">
				<div className="flex w-full rounded-lg border border-border/50 p-0.5 bg-muted/30">
					{THEME_OPTIONS.map((opt) => {
						const Icon = opt.icon;
						return (
							<button
								key={opt.value}
								type="button"
								onClick={() => setTheme(opt.value)}
								className={cn(
									"flex flex-1 items-center justify-center rounded-md p-2.5 min-h-[44px] min-w-[44px] transition-all",
									adminTheme === opt.value
										? "bg-white/20 text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
								title={opt.label}
								aria-label={`Switch to ${opt.label} theme`}
							>
								<Icon className="h-3.5 w-3.5" />
							</button>
						);
					})}
				</div>
			</div>

			{/* User profile footer */}
			<div className="border-t border-white/10 px-2 py-2">
				<DropdownMenu>
					<DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left hover:bg-white/10 transition-all">
						<Avatar className="h-7 w-7 shrink-0">
							<AvatarImage
								src={user?.image ?? (user?.email ? getGravatarUrl(user.email, 56) : undefined)}
								alt={user?.name ?? "Admin"}
							/>
							<AvatarFallback className="text-xs font-semibold">
								{initials(user?.name)}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium truncate">{user?.name ?? "Admin"}</p>
						</div>
						<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-44 bottom-full mb-1 mt-0 top-auto origin-bottom-right">
						<DropdownMenuItem onClick={() => router.push("/admin/profile")}>Profile</DropdownMenuItem>
						<DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{adminBrandingEnabled && (
					<p className="mt-1 px-2 text-xs text-muted-foreground/50">
						Powered by{" "}
						<a
							href="https://github.com/mrdemonwolf/LinkDen"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-muted-foreground transition-colors"
						>
							LinkDen
							<span className="sr-only">(opens in new tab)</span>
						</a>
					</p>
				)}
				<p className="px-2 text-xs text-muted-foreground/50">
					v0.1.0{isDev && " · DEV"}
				</p>
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
		...trpc.settings.get.queryOptions({ key: "admin_branding_enabled" }),
		enabled: !!session?.user,
	});

	const unreadCount = unreadQuery.data?.count ?? 0;
	const adminBrandingEnabled = brandingQuery.data?.value !== "false";

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
			<aside aria-label="Sidebar" className="hidden w-56 shrink-0 border-r border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-2xl z-20 md:block">
				<div className="sticky top-0 h-screen overflow-y-auto">
					<SidebarContent
						pathname={pathname}
						unreadCount={unreadCount}
						adminBrandingEnabled={adminBrandingEnabled}
						user={sessionUser}
					/>
				</div>
			</aside>

			{/* Mobile header */}
			<div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center border-b border-white/20 dark:border-white/10 backdrop-blur-2xl bg-white/70 dark:bg-black/40 px-4 md:hidden">
				<div className="flex items-center gap-2 shrink-0">
					<div className="flex h-6 w-6 items-center justify-center bg-primary/90 backdrop-blur-sm rounded-md text-primary-foreground text-xs font-bold">
						LD
					</div>
					<span className="text-xs font-semibold">LinkDen</span>
				</div>
				{/* Current page — centered absolute */}
				<span className="absolute inset-x-0 text-center text-xs font-medium text-muted-foreground pointer-events-none">
					{[...NAV_GROUPS.flatMap((g) => [...g.items]), SETTINGS_ITEM].find((item) =>
						item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
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
								<div key={group.label ?? "main"}>
									{group.label && (
										<p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
											{group.label}
										</p>
									)}
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
												{item.label === "Forms" && unreadCount > 0 && (
													<span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
														{unreadCount > 99 ? "99+" : unreadCount}
													</span>
												)}
											</Link>
										);
									})}
								</div>
							))}
							<div className="border-t border-white/10 mt-1 pt-1">
								{(() => {
									const item = SETTINGS_ITEM;
									const isActive = pathname.startsWith(item.href);
									const Icon = item.icon;
									return (
										<Link
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
										</Link>
									);
								})()}
							</div>
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
									: "text-muted-foreground/70",
							)}
						>
							<Icon className="h-5 w-5" />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* Main content */}
			<main id="main-content" className="flex-1 pt-12 pb-16 md:pt-0 md:pb-0">
				<div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 md:p-6">{children}</div>
			</main>
		</div>
	);
}
