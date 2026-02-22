"use client";

import type { AdminDrawer } from "@/app/admin/page";
import { ColorPicker } from "@/components/admin/color-picker";
import { ImageUpload } from "@/components/admin/image-upload";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { type ThemeConfig, themes } from "@linkden/ui/themes";
import { BarChart3, Check, Download, Palette, Settings, Shield, Upload } from "lucide-react";
import { useState } from "react";

type RightTab = "design" | "analytics" | "settings";

interface RightPanelProps {
  settings: Record<string, string>;
  onSettingsChange: (key: string, value: string) => void;
  onOpenDrawer?: (drawer: AdminDrawer) => void;
}

export function RightPanel({ settings, onSettingsChange, onOpenDrawer }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightTab>("design");

  const tabs = [
    { id: "design" as const, label: "Design", icon: <Palette className="w-4 h-4" /> },
    { id: "analytics" as const, label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "settings" as const, label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--admin-surface)]">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--admin-border)] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-600 text-[var(--admin-accent)]"
                : "border-transparent text-[var(--admin-text-secondary)] hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "design" && (
          <DesignTab settings={settings} onSettingsChange={onSettingsChange} />
        )}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "settings" && (
          <SettingsTab settings={settings} onSettingsChange={onSettingsChange} />
        )}
      </div>
    </div>
  );
}

function DesignTab({
  settings,
  onSettingsChange,
}: {
  settings: Record<string, string>;
  onSettingsChange: (key: string, value: string) => void;
}) {
  const selectedTheme = settings.theme || "midnight-glass";
  const themeMode = (settings.themeMode || "dark") as "dark" | "light" | "system";

  function handleThemeSelect(theme: ThemeConfig) {
    const variant = themeMode === "light" ? theme.light : theme.dark;
    onSettingsChange("theme", theme.id);
    onSettingsChange("accentColor", variant.primary);
    onSettingsChange("backgroundColor", variant.background);
    onSettingsChange("textColor", variant.textPrimary);
  }

  return (
    <div className="p-4 space-y-5">
      {/* Theme Mode Toggle */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Default Mode</h3>
        <div className="flex items-center bg-[var(--admin-bg)] rounded-lg p-0.5">
          {(["dark", "light", "system"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSettingsChange("themeMode", mode)}
              className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors capitalize ${
                themeMode === mode
                  ? "bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-sm"
                  : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      {/* Theme Selector */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Theme</h3>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleThemeSelect(theme)}
              className={`relative p-2 rounded-xl border transition-all text-left ${
                selectedTheme === theme.id
                  ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                  : "border-[var(--admin-border)] hover:border-gray-300"
              }`}
            >
              {selectedTheme === theme.id && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--admin-accent)] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div
                className="w-full h-10 rounded-lg mb-1.5 flex items-end p-1.5 gap-0.5"
                style={{ background: theme.dark.background }}
              >
                <div
                  className="w-full h-3 rounded"
                  style={{
                    background: theme.dark.surface,
                    border: `1px solid ${theme.dark.surfaceBorder}`,
                  }}
                />
              </div>
              <p className="text-[10px] font-semibold text-[var(--admin-text)] truncate">{theme.name}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Colors */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Colors</h3>
        <div className="space-y-3">
          <ColorPicker
            label="Accent"
            value={settings.accentColor || "#0FACED"}
            onChange={(v) => onSettingsChange("accentColor", v)}
          />
          <ColorPicker
            label="Background"
            value={settings.backgroundColor || "#091533"}
            onChange={(v) => onSettingsChange("backgroundColor", v)}
          />
          <ColorPicker
            label="Text"
            value={settings.textColor || "rgba(255,255,255,0.95)"}
            onChange={(v) => onSettingsChange("textColor", v)}
          />
        </div>
      </section>

      {/* Branding */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Branding</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1">Brand Name</label>
            <input
              type="text"
              value={settings.brandName || ""}
              onChange={(e) => onSettingsChange("brandName", e.target.value)}
              placeholder="Powered by LinkDen"
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--admin-border)] focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
            />
          </div>
          <ImageUpload
            label="Brand Logo"
            value={settings.brandLogo || ""}
            onChange={(v) => onSettingsChange("brandLogo", v)}
          />
          <ImageUpload
            label="Favicon"
            value={settings.brandFavicon || ""}
            onChange={(v) => onSettingsChange("brandFavicon", v)}
          />
        </div>
      </section>
    </div>
  );
}

function AnalyticsTab() {
  const overview = trpc.analytics.overview.useQuery({ period: "30d" });

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--admin-text)]">Quick Stats (30 days)</h3>

      {overview.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-[var(--admin-bg)] animate-pulse" />
          ))}
        </div>
      ) : overview.data ? (
        <div className="space-y-2">
          <StatItem label="Page Views" value={overview.data.totalViews.toLocaleString()} />
          <StatItem label="Total Clicks" value={overview.data.totalClicks.toLocaleString()} />
          <StatItem label="Click-Through Rate" value={`${overview.data.ctr}%`} />
        </div>
      ) : (
        <p className="text-sm text-[var(--admin-text-secondary)]">Unable to load analytics.</p>
      )}

      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)]"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        View Full Analytics
      </button>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--admin-bg)] border border-gray-100">
      <span className="text-xs text-[var(--admin-text-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--admin-text)]">{value}</span>
    </div>
  );
}

function SettingsTab({
  settings,
  onSettingsChange,
}: {
  settings: Record<string, string>;
  onSettingsChange: (key: string, value: string) => void;
}) {
  const utils = trpc.useUtils();
  const exportQuery = trpc.export.exportAll.useQuery(undefined, { enabled: false });
  const importMutation = trpc.export.importAll.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      utils.settings.getAll.invalidate();
      toast.success("Data imported");
    },
    onError: (err) => toast.error(err.message || "Import failed"),
  });

  async function handleExport() {
    const result = await exportQuery.refetch();
    if (result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `linkden-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    }
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.data) {
          toast.error("Invalid export file");
          return;
        }
        importMutation.mutate({ data: parsed.data });
      } catch {
        toast.error("Failed to parse file");
      }
    };
    input.click();
  }

  return (
    <div className="p-4 space-y-5">
      {/* Profile */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Profile</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1">Display Name</label>
            <input
              type="text"
              value={settings.profileName || ""}
              onChange={(e) => onSettingsChange("profileName", e.target.value)}
              placeholder="Your name"
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--admin-border)] focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1">Bio</label>
            <textarea
              value={settings.profileBio || ""}
              onChange={(e) => onSettingsChange("profileBio", e.target.value)}
              placeholder="A short description"
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--admin-border)] focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none resize-y"
            />
          </div>
          <ImageUpload
            label="Profile Image"
            value={settings.profileImage || ""}
            onChange={(v) => onSettingsChange("profileImage", v)}
            placeholder="https://example.com/avatar.jpg"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onSettingsChange(
                  "verifiedBadge",
                  settings.verifiedBadge === "true" ? "false" : "true",
                )
              }
              className={`relative w-9 h-5 rounded-full transition-colors ${
                settings.verifiedBadge === "true" ? "bg-[var(--admin-accent)]" : "bg-[var(--admin-border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--admin-surface)] transition-transform shadow-sm ${
                  settings.verifiedBadge === "true" ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-xs text-[var(--admin-text-secondary)]">Show verified badge</span>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Contact Form</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onSettingsChange(
                  "contactEnabled",
                  settings.contactEnabled === "true" ? "false" : "true",
                )
              }
              className={`relative w-9 h-5 rounded-full transition-colors ${
                settings.contactEnabled === "true" ? "bg-[var(--admin-accent)]" : "bg-[var(--admin-border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--admin-surface)] transition-transform shadow-sm ${
                  settings.contactEnabled === "true" ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-xs text-[var(--admin-text-secondary)]">Enable contact form</span>
          </div>
          {settings.contactEnabled === "true" && (
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1">
                Notification Email
              </label>
              <input
                type="email"
                value={settings.contactEmail || ""}
                onChange={(e) => onSettingsChange("contactEmail", e.target.value)}
                placeholder="your@email.com"
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--admin-border)] focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
              />
            </div>
          )}
        </div>
      </section>

      {/* CAPTCHA */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-gray-400" />
          CAPTCHA
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1">Site Key</label>
            <input
              type="text"
              value={settings.captchaSiteKey || ""}
              onChange={(e) => onSettingsChange("captchaSiteKey", e.target.value)}
              placeholder="0x4AAAAAAA..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--admin-border)] focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1">Secret Key</label>
            <input
              type="password"
              value={settings.captchaSecretKey || ""}
              onChange={(e) => onSettingsChange("captchaSecretKey", e.target.value)}
              placeholder="0x4AAAAAAA..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--admin-border)] focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none font-mono"
            />
          </div>
        </div>
      </section>

      {/* SEO */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">SEO & Meta</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1">Meta Title</label>
            <input
              type="text"
              value={settings.metaTitle || ""}
              onChange={(e) => onSettingsChange("metaTitle", e.target.value)}
              placeholder="Page title for search engines"
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--admin-border)] focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1">Meta Description</label>
            <textarea
              value={settings.metaDescription || ""}
              onChange={(e) => onSettingsChange("metaDescription", e.target.value)}
              placeholder="Page description"
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--admin-border)] focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none resize-y"
            />
          </div>
          <ImageUpload
            label="OG Image"
            value={settings.metaImage || ""}
            onChange={(v) => onSettingsChange("metaImage", v)}
            placeholder="https://example.com/og.png"
          />
        </div>
      </section>

      {/* Quick Links - these now open drawers via the admin page */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Quick Access</h3>
        <div className="space-y-1.5">
          <span className="block text-xs text-[var(--admin-accent)] font-medium cursor-pointer hover:text-[var(--admin-accent-hover)]">
            vCard Editor
          </span>
          <span className="block text-xs text-[var(--admin-accent)] font-medium cursor-pointer hover:text-[var(--admin-accent-hover)]">
            Wallet Pass
          </span>
        </div>
      </section>

      {/* Export/Import */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Data</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--admin-text-secondary)] px-3 py-2 rounded-lg border border-[var(--admin-border)] hover:bg-[var(--admin-bg)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--admin-text-secondary)] px-3 py-2 rounded-lg border border-[var(--admin-border)] hover:bg-[var(--admin-bg)] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
        </div>
      </section>
    </div>
  );
}
