"use client";

import { StatCard } from "@/components/admin/stat-card";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import {
  ExternalLink,
  Eye,
  Globe,
  MousePointerClick,
  Percent,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Period = "7d" | "30d" | "90d";

export function AnalyticsDrawer() {
  const [period, setPeriod] = useState<Period>("30d");
  const utils = trpc.useUtils();

  const overview = trpc.analytics.overview.useQuery({ period });
  const timeSeries = trpc.analytics.timeSeries.useQuery({ period });
  const byLink = trpc.analytics.byLink.useQuery({ period });
  const topReferrers = trpc.analytics.topReferrers.useQuery({ period });
  const countries = trpc.analytics.countries.useQuery({ period });

  const clearMutation = trpc.analytics.clear.useMutation({
    onSuccess: () => {
      utils.analytics.overview.invalidate();
      utils.analytics.timeSeries.invalidate();
      utils.analytics.byLink.invalidate();
      utils.analytics.topReferrers.invalidate();
      utils.analytics.countries.invalidate();
      toast.success("Analytics data cleared");
    },
    onError: () => toast.error("Failed to clear analytics"),
  });

  const [confirmClear, setConfirmClear] = useState(false);

  const chartData = useMemo(() => {
    if (!timeSeries.data) return [];
    const map = new Map<string, { date: string; views: number; clicks: number }>();

    for (const row of timeSeries.data) {
      const existing = map.get(row.date) || { date: row.date, views: 0, clicks: 0 };
      if (row.event === "page_view") existing.views = row.count;
      if (row.event === "link_click") existing.clicks = row.count;
      map.set(row.date, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [timeSeries.data]);

  function handleClear() {
    if (confirmClear) {
      clearMutation.mutate();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-[var(--admin-border)]">
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-[var(--admin-accent)] text-white"
                  : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={handleClear}
          className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            confirmClear
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-[var(--admin-text-secondary)] hover:text-red-400"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirmClear ? "Confirm Clear" : "Clear"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Eye className="w-5 h-5" />}
          label="Page Views"
          value={overview.isLoading ? "..." : (overview.data?.totalViews ?? 0).toLocaleString()}
        />
        <StatCard
          icon={<MousePointerClick className="w-5 h-5" />}
          label="Clicks"
          value={overview.isLoading ? "..." : (overview.data?.totalClicks ?? 0).toLocaleString()}
        />
        <StatCard
          icon={<Percent className="w-5 h-5" />}
          label="CTR"
          value={overview.isLoading ? "..." : `${overview.data?.ctr ?? 0}%`}
        />
      </div>

      {/* Time Series Chart */}
      <div className="rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-[var(--admin-text)]">
          <TrendingUp className="w-5 h-5 text-[var(--admin-accent)]" />
          Traffic Over Time
        </h2>
        {timeSeries.isLoading ? (
          <div className="h-64 rounded-lg bg-[var(--admin-border)] animate-pulse" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--admin-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--admin-accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--admin-text-secondary)", fontSize: 11 }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })
                }
              />
              <YAxis tick={{ fill: "var(--admin-text-secondary)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--admin-text)",
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--admin-accent)"
                fillOpacity={1}
                fill="url(#viewsGradient)"
                name="Views"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#7C3AED"
                fillOpacity={1}
                fill="url(#clicksGradient)"
                name="Clicks"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--admin-text-secondary)] text-center py-12">
            No data for this period
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Top Links */}
        <div className="rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4">
          <h2 className="text-base font-semibold mb-4 text-[var(--admin-text)]">Top Links</h2>
          {byLink.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded bg-[var(--admin-border)] animate-pulse" />
              ))}
            </div>
          ) : byLink.data && byLink.data.length > 0 ? (
            <div className="space-y-2">
              {byLink.data.map((item, i) => (
                <div
                  key={item.linkId || i}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--admin-bg)]"
                >
                  <span className="text-xs text-[var(--admin-text-secondary)] w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--admin-text)]">
                      {item.title || "Unknown"}
                    </p>
                    <p className="text-xs text-[var(--admin-text-secondary)] truncate">{item.url}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--admin-accent)]">
                    {item.clicks}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--admin-text-secondary)] text-center py-6">
              No click data yet
            </p>
          )}
        </div>

        {/* Top Referrers */}
        <div className="rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-[var(--admin-text)]">
            <ExternalLink className="w-4 h-4 text-[var(--admin-accent)]" />
            Top Referrers
          </h2>
          {topReferrers.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded bg-[var(--admin-border)] animate-pulse" />
              ))}
            </div>
          ) : topReferrers.data && topReferrers.data.length > 0 ? (
            <div className="space-y-2">
              {topReferrers.data.slice(0, 10).map((item, i) => {
                const maxCount = topReferrers.data![0].count;
                const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={i} className="relative p-2.5 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-0 bg-[var(--admin-accent)] opacity-10 rounded-lg"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                      <span className="text-sm truncate text-[var(--admin-text)]">
                        {item.referrer || "Direct"}
                      </span>
                      <span className="text-sm font-semibold text-[var(--admin-accent)] ml-2">
                        {item.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--admin-text-secondary)] text-center py-6">
              No referrer data yet
            </p>
          )}
        </div>
      </div>

      {/* Countries */}
      <div className="rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-[var(--admin-text)]">
          <Globe className="w-5 h-5 text-[var(--admin-accent)]" />
          Countries
        </h2>
        {countries.isLoading ? (
          <div className="h-48 rounded-lg bg-[var(--admin-border)] animate-pulse" />
        ) : countries.data && countries.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={countries.data.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis
                dataKey="country"
                tick={{ fill: "var(--admin-text-secondary)", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "var(--admin-text-secondary)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--admin-text)",
                }}
              />
              <Bar dataKey="count" fill="var(--admin-accent)" radius={[4, 4, 0, 0]} name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--admin-text-secondary)] text-center py-6">
            No country data yet
          </p>
        )}
      </div>
    </div>
  );
}
