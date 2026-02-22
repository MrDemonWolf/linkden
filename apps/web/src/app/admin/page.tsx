"use client";

import { Eye, MousePointerClick, Percent, Link2, Mail, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";

export default function DashboardPage() {
  const overview = trpc.analytics.overview.useQuery({ period: "30d" });
  const linksQuery = trpc.links.listAll.useQuery();
  const contactsQuery = trpc.contact.list.useQuery({ page: 1, limit: 5 });
  const pagesQuery = trpc.pages.list.useQuery();

  const totalLinks = linksQuery.data?.length ?? 0;
  const activeLinks = linksQuery.data?.filter((l) => l.isActive).length ?? 0;
  const unreadContacts = contactsQuery.data?.unreadCount ?? 0;
  const totalPages = pagesQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Overview of your LinkDen page (last 30 days)
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Eye className="w-5 h-5" />}
          label="Page Views"
          value={overview.isLoading ? "..." : (overview.data?.totalViews ?? 0).toLocaleString()}
        />
        <StatCard
          icon={<MousePointerClick className="w-5 h-5" />}
          label="Total Clicks"
          value={overview.isLoading ? "..." : (overview.data?.totalClicks ?? 0).toLocaleString()}
        />
        <StatCard
          icon={<Percent className="w-5 h-5" />}
          label="Click-Through Rate"
          value={overview.isLoading ? "..." : `${overview.data?.ctr ?? 0}%`}
        />
        <StatCard
          icon={<Link2 className="w-5 h-5" />}
          label="Links"
          value={linksQuery.isLoading ? "..." : totalLinks}
          delta={`${activeLinks} active`}
          deltaType="neutral"
        />
        <StatCard
          icon={<Mail className="w-5 h-5" />}
          label="Unread Contacts"
          value={contactsQuery.isLoading ? "..." : unreadContacts}
          deltaType={unreadContacts > 0 ? "negative" : "neutral"}
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Custom Pages"
          value={pagesQuery.isLoading ? "..." : totalPages}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Links */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Links</h2>
            <a href="/admin/links" className="text-sm text-brand-cyan hover:underline">
              View All
            </a>
          </div>
          {linksQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse" />
              ))}
            </div>
          ) : linksQuery.data && linksQuery.data.length > 0 ? (
            <div className="space-y-2">
              {linksQuery.data.slice(0, 5).map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--button-bg)] flex items-center justify-center shrink-0">
                    <Link2 className="w-4 h-4 text-brand-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{link.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {link.url || link.type}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--text-secondary)]">
                      {link.clickCount} clicks
                    </p>
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        link.isActive ? "bg-emerald-400" : "bg-gray-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] text-center py-6">
              No links yet.{" "}
              <a href="/admin/links/new" className="text-brand-cyan hover:underline">
                Create one
              </a>
            </p>
          )}
        </div>

        {/* Recent Contact Submissions */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Messages</h2>
            <a href="/admin/contacts" className="text-sm text-brand-cyan hover:underline">
              View All
            </a>
          </div>
          {contactsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse" />
              ))}
            </div>
          ) : contactsQuery.data && contactsQuery.data.items.length > 0 ? (
            <div className="space-y-2">
              {contactsQuery.data.items.map((sub) => (
                <a
                  key={sub.id}
                  href={`/admin/contacts/${sub.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {!sub.isRead && (
                        <span className="inline-block w-2 h-2 rounded-full bg-brand-cyan mr-2" />
                      )}
                      {sub.name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {sub.message}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] shrink-0">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] text-center py-6">
              No messages yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
