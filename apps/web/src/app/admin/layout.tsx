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
	ExternalLink,
	Menu,
	X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";
import { themePresets } from "@linkden/ui/themes";

const NAV_ITEMS = [
	{ href: "/admin" as const, label: "Dashboard", icon: LayoutDashboard },
	{ href: "/admin/builder" as const, label: "Builder", icon: Blocks },
	{ href: "/admin/analytics" as const, label: "Analytics", icon: BarChart3 },
	{ href: "/admin/contacts" as const, label: "Contacts", icon: Mail },
	{ href: "/admin/appearance" as const, label: "Appearance", icon: Palette },
	{ href: "/admin/settings" as const, label: "Settings", icon: Settings },
	{ href: "/admin/social" as const, label: "Social", icon: Share2 },
];

function SidebarContent({
	pathname,
	unreadCount,
	onNavClick,
}: {
	pathname: string;
	unreadCount: number;
	onNavClick?: () => void;
}) {
	const isDev = process.env.NODE_ENV === "development";

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
			<nav className="flex-1 space-y-0.5 px-2">
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
							className={cn(
								"flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
								isActive
									? "bg-white/20 dark:bg-white/10 backdrop-blur-sm text-primary"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4 shrink-0" />
							<span>{item.label}</span>
							{item.label === "Contacts" && unreadCount > 0 && (
								<span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
									{unreadCount > 99 ? "99+" : unreadCount}
								</span>
							)}
						</Link>
					);
				})}
			</nav>

			{/* Public page link */}
			<div className="px-2 pb-2">
				<a
					href="/"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ExternalLink className="h-3.5 w-3.5" />
					<span>View Public Page</span>
				</a>
			</div>

			{/* Version */}
			<div className="border-t px-4 py-3">
				<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
					<span>v0.1.0</span>
					{isDev && (
						<span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1 py-0.5 text-[9px] font-semibold uppercase leading-none">
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

	const unreadCount = unreadQuery.data?.count ?? 0;

	const settingsQuery = useQuery({
		...trpc.settings.getAll.queryOptions(),
		enabled: !!session?.user,
	});

	// Resolve glass tint colors from theme preset
	const glassTints = (() => {
		const themePresetName = settingsQuery.data?.theme_preset || "default";
		const preset = themePresets.find((t) => t.name === themePresetName) ?? themePresets[0];
		return {
			tint1: preset.cssVars.light["--ld-primary"],
			tint2: preset.cssVars.light["--ld-accent"],
			primary: preset.cssVars.light["--ld-primary"],
		};
	})();

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
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!session?.user) {
		return null;
	}

	return (
		<div
			className="admin-glass-bg flex min-h-screen"
			style={{
				"--glass-tint-1": glassTints.tint1,
				"--glass-tint-2": glassTints.tint2,
				"--primary": glassTints.primary,
				"--primary-foreground": "#ffffff",
			} as React.CSSProperties}
		>
			{/* Desktop sidebar */}
			<aside className="hidden w-56 shrink-0 border-r border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-2xl md:block">
				<div className="sticky top-0 h-screen overflow-y-auto">
					<SidebarContent pathname={pathname} unreadCount={unreadCount} />
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
					className="flex h-8 w-8 items-center justify-center text-muted-foreground"
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
						onKeyDown={(e) => {
							if (e.key === "Escape") setMobileMenuOpen(false);
						}}
					/>
					<div className="fixed inset-y-0 left-0 z-50 w-56 bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-lg md:hidden">
						<SidebarContent
							pathname={pathname}
							unreadCount={unreadCount}
							onNavClick={() => setMobileMenuOpen(false)}
						/>
					</div>
				</>
			)}

			{/* Mobile bottom nav */}
			<nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/20 dark:border-white/10 backdrop-blur-2xl bg-white/70 dark:bg-black/40 md:hidden">
				{NAV_ITEMS.slice(0, 5).map((item) => {
					const isActive =
						item.href === "/admin"
							? pathname === "/admin"
							: pathname.startsWith(item.href);
					const Icon = item.icon;

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
								isActive
									? "text-primary"
									: "text-muted-foreground",
							)}
						>
							<div className="relative">
								<Icon className="h-4 w-4" />
								{item.label === "Contacts" && unreadCount > 0 && (
									<span className="absolute -right-2 -top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-white">
										{unreadCount > 9 ? "9+" : unreadCount}
									</span>
								)}
							</div>
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* Main content */}
			<main className="flex-1 pt-12 pb-16 md:pt-0 md:pb-0">
				<div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
			</main>
		</div>
	);
}
