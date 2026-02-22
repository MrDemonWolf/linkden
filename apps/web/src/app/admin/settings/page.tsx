"use client";

import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Download,
  Mail,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.settings.getAll.useQuery();
  const updateCheck = trpc.system.checkUpdate.useQuery(undefined, {
    retry: false,
  });

  const [contactEnabled, setContactEnabled] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [captchaSiteKey, setCaptchaSiteKey] = useState("");
  const [captchaSecretKey, setCaptchaSecretKey] = useState("");

  useEffect(() => {
    if (settingsQuery.data) {
      const map: Record<string, string> = {};
      settingsQuery.data.forEach((s) => {
        map[s.key] = s.value;
      });
      setContactEnabled(map.contactEnabled === "true");
      setContactEmail(map.contactEmail || "");
      setCaptchaSiteKey(map.captchaSiteKey || "");
      setCaptchaSecretKey(map.captchaSecretKey || "");
    }
  }, [settingsQuery.data]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      utils.settings.getPublic.invalidate();
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const exportQuery = trpc.export.exportAll.useQuery(undefined, {
    enabled: false,
  });

  const importMutation = trpc.export.importAll.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      utils.settings.getAll.invalidate();
      utils.vcard.get.invalidate();
      utils.wallet.get.invalidate();
      utils.pages.list.invalidate();
      toast.success("Data imported successfully");
    },
    onError: (err) => toast.error(err.message || "Import failed"),
  });

  function handleSave() {
    updateMutation.mutate({
      settings: [
        { key: "contactEnabled", value: contactEnabled ? "true" : "false" },
        { key: "contactEmail", value: contactEmail },
        { key: "captchaSiteKey", value: captchaSiteKey },
        { key: "captchaSecretKey", value: captchaSecretKey },
      ],
    });
  }

  async function handleExport() {
    const result = await exportQuery.refetch();
    if (result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
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
          toast.error("Invalid export file format");
          return;
        }
        importMutation.mutate({ data: parsed.data });
      } catch {
        toast.error("Failed to parse import file");
      }
    };
    input.click();
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-cyan" />
            Settings
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage your LinkDen configuration
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="glass-button-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Contact Form Settings */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5 text-brand-cyan" />
          Contact Form
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setContactEnabled(!contactEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              contactEnabled ? "bg-brand-cyan" : "bg-[rgba(255,255,255,0.15)]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                contactEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm">
            {contactEnabled ? "Contact form enabled" : "Contact form disabled"}
          </span>
        </div>
        {contactEnabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Notification Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.com"
                className="glass-input"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Where contact form submissions will be sent
              </p>
            </div>
          </div>
        )}
      </section>

      {/* CAPTCHA Settings */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-cyan" />
          CAPTCHA (Cloudflare Turnstile)
        </h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Site Key
            </label>
            <input
              type="text"
              value={captchaSiteKey}
              onChange={(e) => setCaptchaSiteKey(e.target.value)}
              placeholder="0x4AAAAAAA..."
              className="glass-input font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Secret Key
            </label>
            <input
              type="password"
              value={captchaSecretKey}
              onChange={(e) => setCaptchaSecretKey(e.target.value)}
              placeholder="0x4AAAAAAA..."
              className="glass-input font-mono text-sm"
            />
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold">Data Management</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={exportQuery.isFetching}
            className="glass-button flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportQuery.isFetching ? "Exporting..." : "Export All Data"}
          </button>
          <button
            onClick={handleImport}
            disabled={importMutation.isPending}
            className="glass-button flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {importMutation.isPending ? "Importing..." : "Import Data"}
          </button>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300">
            Importing data will replace ALL existing data. Make sure to export a backup first.
          </p>
        </div>
      </section>

      {/* System Info */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-brand-cyan" />
          System
        </h2>
        {updateCheck.isLoading ? (
          <div className="h-16 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
        ) : updateCheck.data ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Current Version</span>
              <span className="font-mono">v{updateCheck.data.currentVersion}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Latest Version</span>
              <span className="font-mono">v{updateCheck.data.latestVersion}</span>
            </div>
            {updateCheck.data.isUpdateAvailable && (
              <a
                href={updateCheck.data.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-button-primary inline-flex items-center gap-2 text-sm mt-2"
              >
                Update Available
              </a>
            )}
            {!updateCheck.data.isUpdateAvailable && (
              <p className="text-sm text-emerald-400">You are running the latest version</p>
            )}
          </div>
        ) : updateCheck.error ? (
          <p className="text-sm text-[var(--text-secondary)]">Unable to check for updates</p>
        ) : null}
      </section>

      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="glass-button-primary flex items-center gap-2 px-8 py-2.5 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
