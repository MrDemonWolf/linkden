"use client";

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Contact,
  FileText,
  LayoutDashboard,
  Link2,
  Mail,
  Menu,
  Palette,
  QrCode,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const contactsQuery = trpc.contact.list.useQuery(
    { page: 1, limit: 1 },
    { refetchInterval: 30000 },
  );
  const unreadCount = contactsQuery.data?.unreadCount ?? 0;

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: "Links",
      href: "/admin/links",
      icon: <Link2 className="w-4 h-4" />,
    },
    {
      label: "Appearance",
      href: "/admin/appearance",
      icon: <Palette className="w-4 h-4" />,
    },
    {
      label: "vCard",
      href: "/admin/vcard",
      icon: <Contact className="w-4 h-4" />,
    },
    {
      label: "Wallet Pass",
      href: "/admin/wallet",
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      label: "Analytics",
      href: "/admin/analytics",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      label: "Contacts",
      href: "/admin/contacts",
      icon: <Mail className="w-4 h-4" />,
      badge: unreadCount,
    },
    {
      label: "Pages",
      href: "/admin/pages",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "QR Code",
      href: "/qr",
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const navContent = (
    <nav className="flex flex-col gap-1 p-3">
      <div className="px-3 py-4 mb-2">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-brand-cyan">Link</span>
          <span>Den</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Admin Panel</p>
      </div>

      {navItems.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={() => setIsOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            isActive(item.href)
              ? "bg-[var(--button-bg)] text-brand-cyan border border-[rgba(15,172,237,0.25)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]",
          )}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </a>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden glass-button p-2"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[240px] z-40 glass-panel border-r border-[var(--surface-border)] transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-full overflow-y-auto">{navContent}</div>
      </aside>
    </>
  );
}
