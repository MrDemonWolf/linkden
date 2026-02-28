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
} from "lucide-react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/admin" as const, label: "Dashboard", icon: LayoutDashboard },
	{ href: "/admin/builder" as const, label: "Builder", icon: Blocks },
	{ href: "/admin/analytics" as const, label: "Analytics", icon: BarChart3 },
	{ href: "/admin/contacts" as const, label: "Contacts", icon: Mail },
	{ href: "/admin/appearance" as const, label: "Appearance", icon: Palette },
	{ href: "/admin/settings" as const, label: "Settings", icon: Settings },
	{ href: "/admin/social" as const, label: "Social", icon: Share2 },
	{ href: "/admin/wallet" as const, label: "Wallet", icon: Wallet },
];

const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) =>
	["/admin", "/admin/builder", "/admin/social", "/admin/settings"].includes(item.href),
);

const THEME_OPTIONS = [
	{ value: "light", icon: Sun, label: "Light" },
	{ value: "dark", icon: Moon, label: "Dark" },
	{ value: "system", icon: Monitor, label: "System" },
] as const;

function SidebarContent({
	pathname,
	unreadCount,
	adminBrandingEnabled,
	onNavClick,
}: {
	pathname: string;
	unreadCount: number;
	adminBrandingEnabled: boolean;
	onNavClick?: () => void;
}) {
	const isDev = process.env.NODE_ENV === "development";
	const { setTheme, theme: adminTheme } = useTheme();

	return (
		<div className="flex h-full flex-col">
			{/* Logo */}
			<div className="flex items-center gap-2 px-4 py-5">
				<div className="flex h-8 w-8 items-center justify-center bg-primary/90 backdrop-blur-sm rounded-lg text-primary-foreground text-sm font-bold">
					LD
				</div>
				<span className="text-sm font-semibold tracking-tight">LinkDen</span>
			</div>

			{/* Nav */}
			<nav aria-label="Main navigation" className="flex-1 space-y-0.5 px-2">
				{NAV_ITEMS.map((item) => {
					const isActive =
						item.href === "/admin"
							? pathname === "/admin"
							: pathname.startsWith(item.href);
					const Icon = item.icon;

					return (
						<Link
							key={item.href}
							href={item.href}
							onClick={onNavClick}
							aria-current={isActive ? "page" : undefined}
							aria-label={item.label === "Contacts" && unreadCount > 0 ? `Contacts, ${unreadCount} unread` : undefined}
							className={cn(
								"flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
								isActive
									? "bg-primary/10 text-primary border-l-2 border-primary shadow-[inset_0_0_12px_rgba(var(--primary-rgb,99,102,241),0.08)]"
									: "text-muted-foreground hover:bg-white/10 hover:backdrop-blur-sm hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4 shrink-0" />
							<span>{item.label}</span>
							{item.label === "Contacts" && unreadCount > 0 && (
								<span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white">
									{unreadCount > 99 ? "99+" : unreadCount}
								</span>
							)}
						</Link>
					);
				})}
			</nav>

			{/* External links */}
			<div className="px-2 pb-2 space-y-0.5">
				<a
					href={isDev ? "http://localhost:3002" : "https://mrdemonwolf.github.io/linkden/"}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-white/10 hover:backdrop-blur-sm hover:text-foreground transition-all"
				>
					<ExternalLink className="h-3.5 w-3.5" />
					<span>View Docs</span>
				</a>
				<a
					href="/"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-white/10 hover:backdrop-blur-sm hover:text-foreground transition-all"
				>
					<ExternalLink className="h-3.5 w-3.5" />
					<span>View Public Page</span>
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
									"flex flex-1 items-center justify-center rounded-md p-1.5 transition-all",
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

			{/* Branding + Version */}
			<div className="border-t px-4 py-3 space-y-1">
				{adminBrandingEnabled && (
					<p className="text-[10px] text-muted-foreground/70">
						Powered by{" "}
						<a
							href="https://github.com/mrdemonwolf/LinkDen"
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							LinkDen
						</a>
					</p>
				)}
				<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
					<span>v0.1.0</span>
					{isDev && (
						<span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1 py-0.5 text-[10px] font-semibold uppercase leading-none">
							DEV
						</span>
					)}
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
		...trpc.contacts.unreadCount.queryOptions(),
		enabled: !!session?.user,
		refetchInterval: 30000,
	});

	const brandingQuery = useQuery({
		...trpc.settings.get.queryOptions({ key: "admin_branding_enabled" }),
		enabled: !!session?.user,
	});

	const unreadCount = unreadQuery.data?.count ?? 0;
	const adminBrandingEnabled = brandingQuery.data?.value !== "false";

	// Allow login and setup pages without auth
	const isPublicRoute =
		pathname === "/admin/login" || pathname === "/admin/setup";

	useEffect(() => {
		if (!isPending && !session?.user && !isPublicRoute) {
			router.replace("/admin/login");
		}
	}, [isPending, session, isPublicRoute, router]);

	// Public routes render without sidebar
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
			<aside aria-label="Sidebar" className="hidden w-56 shrink-0 border-r border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-2xl md:block">
				<div className="sticky top-0 h-screen overflow-y-auto">
					<SidebarContent pathname={pathname} unreadCount={unreadCount} adminBrandingEnabled={adminBrandingEnabled} />
				</div>
			</aside>

			{/* Mobile header */}
			<div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-white/20 dark:border-white/10 backdrop-blur-2xl bg-white/70 dark:bg-black/40 px-4 md:hidden">
				<div className="flex items-center gap-2">
					<div className="flex h-6 w-6 items-center justify-center bg-primary/90 backdrop-blur-sm rounded-md text-primary-foreground text-[10px] font-bold">
						LD
					</div>
					<span className="text-xs font-semibold">LinkDen</span>
				</div>
				<button
					type="button"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					className="flex h-11 w-11 items-center justify-center text-muted-foreground"
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

			{/* Mobile menu overlay */}
			{mobileMenuOpen && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/40 md:hidden"
						onClick={() => setMobileMenuOpen(false)}
					/>
					<div
						className="fixed inset-y-0 left-0 z-50 w-56 bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-lg md:hidden"
						role="dialog"
						aria-modal="true"
						onKeyDown={(e) => {
							if (e.key === "Escape") setMobileMenuOpen(false);
						}}
					>
						<SidebarContent
							pathname={pathname}
							unreadCount={unreadCount}
							adminBrandingEnabled={adminBrandingEnabled}
							onNavClick={() => setMobileMenuOpen(false)}
						/>
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
							href={item.href}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"flex flex-1 flex-col items-center gap-0.5 py-2 min-h-[44px] text-[10px]",
								isActive
									? "text-foreground border-t-2 border-primary"
									: "text-muted-foreground",
							)}
						>
						<Icon className="h-4 w-4" />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* Main content */}
			<main id="main-content" className="flex-1 pt-12 pb-16 md:pt-0 md:pb-0">
				<div className="mx-auto max-w-6xl px-2 py-4 sm:px-4 md:p-6">{children}</div>
			</main>
		</div>
	);
}
