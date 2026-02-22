"use client";

import { useState, useEffect } from "react";
import { Check, Palette } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";
import { ColorPicker } from "@/components/admin/color-picker";
import { ImageUpload } from "@/components/admin/image-upload";
import { themes, type ThemeConfig } from "@linkden/ui/themes";

export default function AppearancePage() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.settings.getAll.useQuery();

  const [selectedTheme, setSelectedTheme] = useState("midnight-glass");
  const [accentColor, setAccentColor] = useState("#0FACED");
  const [backgroundColor, setBackgroundColor] = useState("#091533");
  const [textColor, setTextColor] = useState("rgba(255,255,255,0.95)");
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [brandFavicon, setBrandFavicon] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [customHead, setCustomHead] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaImage, setMetaImage] = useState("");

  useEffect(() => {
    if (settingsQuery.data) {
      const map: Record<string, string> = {};
      settingsQuery.data.forEach((s) => {
        map[s.key] = s.value;
      });
      setSelectedTheme(map.theme || "midnight-glass");
      setAccentColor(map.accentColor || "#0FACED");
      setBackgroundColor(map.backgroundColor || "#091533");
      setTextColor(map.textColor || "rgba(255,255,255,0.95)");
      setProfileName(map.profileName || "");
      setProfileBio(map.profileBio || "");
      setProfileImage(map.profileImage || "");
      setBrandName(map.brandName || "");
      setBrandLogo(map.brandLogo || "");
      setBrandFavicon(map.brandFavicon || "");
      setCustomCss(map.customCss || "");
      setCustomHead(map.customHead || "");
      setMetaTitle(map.metaTitle || "");
      setMetaDescription(map.metaDescription || "");
      setMetaImage(map.metaImage || "");
    }
  }, [settingsQuery.data]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      utils.settings.getPublic.invalidate();
      toast.success("Appearance saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  function handleSave() {
    updateMutation.mutate({
      settings: [
        { key: "theme", value: selectedTheme },
        { key: "accentColor", value: accentColor },
        { key: "backgroundColor", value: backgroundColor },
        { key: "textColor", value: textColor },
        { key: "profileName", value: profileName },
        { key: "profileBio", value: profileBio },
        { key: "profileImage", value: profileImage },
        { key: "brandName", value: brandName },
        { key: "brandLogo", value: brandLogo },
        { key: "brandFavicon", value: brandFavicon },
        { key: "customCss", value: customCss },
        { key: "customHead", value: customHead },
        { key: "metaTitle", value: metaTitle },
        { key: "metaDescription", value: metaDescription },
        { key: "metaImage", value: metaImage },
      ],
    });
  }

  function handleThemeSelect(theme: ThemeConfig) {
    setSelectedTheme(theme.id);
    setAccentColor(theme.dark.primary);
    setBackgroundColor(theme.dark.background);
    setTextColor(theme.dark.textPrimary);
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Appearance</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appearance</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Customize your public page look and feel
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="glass-button-primary px-6 py-2.5 disabled:opacity-50"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Profile */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="grid gap-4">
          <ImageUpload
            label="Profile Image"
            value={profileImage}
            onChange={setProfileImage}
            placeholder="https://example.com/avatar.jpg"
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Your name"
              className="glass-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Bio
            </label>
            <textarea
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
              placeholder="A short description about you"
              rows={3}
              className="glass-input resize-y"
            />
          </div>
        </div>
      </section>

      {/* Theme Selector */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Palette className="w-5 h-5 text-brand-cyan" />
          Theme
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme)}
              className={`relative p-3 rounded-xl border transition-all text-left ${
                selectedTheme === theme.id
                  ? "border-brand-cyan bg-brand-cyan/10"
                  : "border-[var(--surface-border)] hover:border-[rgba(255,255,255,0.2)]"
              }`}
            >
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-cyan flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className="w-full h-16 rounded-lg mb-2 flex items-end p-2 gap-1"
                style={{ background: theme.dark.background }}
              >
                <div
                  className="w-full h-4 rounded"
                  style={{
                    background: theme.dark.surface,
                    border: `1px solid ${theme.dark.surfaceBorder}`,
                  }}
                />
              </div>
              <p className="text-xs font-semibold truncate">{theme.name}</p>
              <p className="text-[10px] text-[var(--text-secondary)] capitalize">
                {theme.category}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Custom Colors */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold">Custom Colors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorPicker
            label="Accent Color"
            value={accentColor}
            onChange={setAccentColor}
          />
          <ColorPicker
            label="Background"
            value={backgroundColor}
            onChange={setBackgroundColor}
          />
          <ColorPicker
            label="Text Color"
            value={textColor}
            onChange={setTextColor}
          />
        </div>
      </section>

      {/* Branding */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold">Branding</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Brand Name
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Leave empty for 'Powered by LinkDen'"
              className="glass-input"
            />
          </div>
          <ImageUpload
            label="Brand Logo"
            value={brandLogo}
            onChange={setBrandLogo}
          />
          <ImageUpload
            label="Favicon"
            value={brandFavicon}
            onChange={setBrandFavicon}
          />
        </div>
      </section>

      {/* SEO / Meta */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold">SEO &amp; Meta Tags</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Meta Title
            </label>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Page title for search engines"
              className="glass-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Meta Description
            </label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Page description for search engines"
              rows={2}
              className="glass-input resize-y"
            />
          </div>
          <ImageUpload
            label="OG Image"
            value={metaImage}
            onChange={setMetaImage}
            placeholder="https://example.com/og-image.png"
          />
        </div>
      </section>

      {/* Advanced */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold">Advanced</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Custom CSS
            </label>
            <textarea
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              placeholder=".my-class { color: red; }"
              rows={4}
              className="glass-input resize-y font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Custom Head HTML
            </label>
            <textarea
              value={customHead}
              onChange={(e) => setCustomHead(e.target.value)}
              placeholder='<script src="..."></script>'
              rows={4}
              className="glass-input resize-y font-mono text-sm"
            />
          </div>
        </div>
      </section>

      {/* Save button at bottom */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="glass-button-primary px-8 py-2.5 disabled:opacity-50"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
