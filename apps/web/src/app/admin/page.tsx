"use client";

import { LeftPanel } from "@/components/admin/left-panel";
import { PhonePreview } from "@/components/admin/phone-preview";
import { RightPanel } from "@/components/admin/right-panel";
import { TopBar } from "@/components/admin/top-bar";
import {
  placeholderSettings,
  placeholderSocialLinks,
} from "@/lib/placeholder-data";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { useThemeMode } from "@/hooks/use-theme-mode";
import { AnalyticsDrawer } from "@/components/admin/drawers/analytics-drawer";
import { ContactDetailDrawer } from "@/components/admin/drawers/contact-detail-drawer";
import { ContactsDrawer } from "@/components/admin/drawers/contacts-drawer";
import { LinkEditDrawer } from "@/components/admin/drawers/link-edit-drawer";
import { PageEditorDrawer } from "@/components/admin/drawers/page-editor-drawer";
import { PagesDrawer } from "@/components/admin/drawers/pages-drawer";
import { VCardDrawer } from "@/components/admin/drawers/vcard-drawer";
import { WalletDrawer } from "@/components/admin/drawers/wallet-drawer";
import { ArrowLeft, BarChart3, Eye, LayoutGrid, Palette, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type DeviceSize = "phone" | "tablet" | "desktop";
type MobileTab = "blocks" | "preview" | "design";

export type AdminDrawer =
  | null
  | "analytics"
  | "vcard"
  | "wallet"
  | "contacts"
  | "pages"
  | "pages-new"
  | { type: "page-edit"; id: string }
  | { type: "contact-detail"; id: string }
  | { type: "link-edit"; id: string };

export default function AdminEditorPage() {
  const utils = trpc.useUtils();
  const { isDark, toggle: toggleDarkMode } = useThemeMode();
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("phone");
  const [mobileTab, setMobileTab] = useState<MobileTab>("preview");
  const [activeDrawer, setActiveDrawer] = useState<AdminDrawer>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({
    ...placeholderSettings,
  });

  // Load settings from server
  const settingsQuery = trpc.settings.getAll.useQuery();
  const linksQuery = trpc.links.listAll.useQuery();
  const linkDraftCount = trpc.links.draftCount.useQuery();
  const settingDraftCount = trpc.settings.draftCount.useQuery();

  const totalDraftCount = (linkDraftCount.data ?? 0) + (settingDraftCount.data ?? 0);

  useEffect(() => {
    if (settingsQuery.data) {
      const map: Record<string, string> = { ...placeholderSettings };
      for (const s of settingsQuery.data) {
        map[s.key] = s.value;
      }
      setLocalSettings(map);
    }
  }, [settingsQuery.data]);

  const settingsUpdateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      utils.settings.draftCount.invalidate();
    },
    onError: () => toast.error("Failed to save setting"),
  });

  const linksPublishMutation = trpc.links.publish.useMutation();
  const settingsPublishMutation = trpc.settings.publish.useMutation();

  const handleSettingsChange = useCallback(
    (key: string, value: string) => {
      setLocalSettings((prev) => ({ ...prev, [key]: value }));
      settingsUpdateMutation.mutate({ settings: [{ key, value }] });
    },
    [settingsUpdateMutation],
  );

  async function handlePublish() {
    try {
      await linksPublishMutation.mutateAsync();
      await settingsPublishMutation.mutateAsync();
      utils.links.listAll.invalidate();
      utils.links.draftCount.invalidate();
      utils.settings.getAll.invalidate();
      utils.settings.getPublic.invalidate();
      utils.settings.draftCount.invalidate();
      toast.success("Published!");
    } catch {
      toast.error("Failed to publish");
    }
  }

  async function handleDiscardAll() {
    utils.links.listAll.invalidate();
    utils.settings.getAll.invalidate();
    utils.links.draftCount.invalidate();
    utils.settings.draftCount.invalidate();
    toast.success("Changes discarded");
  }

  function handleOpenDrawer(drawer: AdminDrawer) {
    setActiveDrawer(drawer);
  }

  function handleCloseDrawer() {
    setActiveDrawer(null);
  }

  const isPublishing = linksPublishMutation.isPending || settingsPublishMutation.isPending;

  // Use server links (no placeholder fallback — show empty state when no blocks exist)
  const links = linksQuery.data ?? [];

  const mobileTabItems = [
    { id: "blocks" as const, icon: LayoutGrid, label: "Blocks" },
    { id: "preview" as const, icon: Smartphone, label: "Preview" },
    { id: "design" as const, icon: Palette, label: "Design" },
  ];

  return (
    <div className={`h-screen flex flex-col ${isDark ? "admin-dark" : ""}`} data-admin-panel>
      <div className="h-full flex flex-col bg-[var(--admin-bg)] transition-colors duration-200">
        {/* Top Bar */}
        <TopBar
          deviceSize={deviceSize}
          onDeviceSizeChange={setDeviceSize}
          onPublish={handlePublish}
          onDiscardAll={handleDiscardAll}
          isPublishing={isPublishing}
          draftCount={totalDraftCount}
          darkMode={isDark}
          onToggleDarkMode={toggleDarkMode}
        />

        {/* Desktop: 3-panel layout */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Panel - hidden on mobile */}
          <div className="hidden lg:flex w-[300px] border-r border-[var(--admin-border)] shrink-0">
            <LeftPanel onOpenDrawer={handleOpenDrawer} />
          </div>

          {/* Center - Phone Preview */}
          <div className="hidden lg:flex flex-1 bg-[var(--admin-bg)] items-center justify-center">
            <PhonePreview
              settings={localSettings}
              links={links}
              socialLinks={placeholderSocialLinks}
              deviceSize={deviceSize}
            />
          </div>

          {/* Right Panel - hidden on mobile */}
          <div className="hidden lg:flex w-[340px] border-l border-[var(--admin-border)] shrink-0">
            <RightPanel
              settings={localSettings}
              onSettingsChange={handleSettingsChange}
              onOpenDrawer={handleOpenDrawer}
            />
          </div>

          {/* Drawer overlay — desktop: slide from right, mobile: slide from bottom */}
          {activeDrawer && (
            <div className="absolute inset-0 z-50 flex lg:justify-end justify-center items-end lg:items-stretch">
              <div
                className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                onClick={handleCloseDrawer}
              />
              {/* Desktop drawer */}
              <div className="relative hidden lg:block w-full max-w-2xl bg-[var(--admin-surface)] border-l border-[var(--admin-border)] animate-slide-in-right overflow-y-auto" style={{ boxShadow: "var(--admin-shadow-lg)" }}>
                <DrawerContent drawer={activeDrawer} onClose={handleCloseDrawer} onOpenDrawer={handleOpenDrawer} />
              </div>
              {/* Mobile drawer — slides up from bottom */}
              <div className="relative lg:hidden w-full max-h-[85vh] bg-[var(--admin-surface)] border-t border-[var(--admin-border)] rounded-t-2xl animate-slide-up overflow-y-auto" style={{ boxShadow: "var(--admin-shadow-lg)" }}>
                {/* Drag handle */}
                <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-[var(--admin-surface)] z-10">
                  <div className="w-8 h-1 rounded-full bg-[var(--admin-border)]" />
                </div>
                <DrawerContent drawer={activeDrawer} onClose={handleCloseDrawer} onOpenDrawer={handleOpenDrawer} />
              </div>
            </div>
          )}

          {/* Mobile: Tab-based view */}
          <div className="flex-1 lg:hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {mobileTab === "blocks" && (
                <div className="h-full bg-[var(--admin-surface)]">
                  <LeftPanel onOpenDrawer={handleOpenDrawer} />
                </div>
              )}
              {mobileTab === "preview" && (
                <div className="h-full bg-[var(--admin-bg)] flex items-center justify-center">
                  <PhonePreview
                    settings={localSettings}
                    links={links}
                    socialLinks={placeholderSocialLinks}
                    deviceSize="phone"
                  />
                </div>
              )}
              {mobileTab === "design" && (
                <div className="h-full bg-[var(--admin-surface)]">
                  <RightPanel
                    settings={localSettings}
                    onSettingsChange={handleSettingsChange}
                    onOpenDrawer={handleOpenDrawer}
                  />
                </div>
              )}
            </div>

            {/* Mobile bottom tab bar */}
            <div className="flex border-t border-[var(--admin-border)] bg-[var(--admin-surface)] shrink-0 safe-area-pb" style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
              {mobileTabItems.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors duration-150 ${
                    mobileTab === tab.id
                      ? "text-[var(--admin-accent)]"
                      : "text-[var(--admin-text-tertiary)]"
                  }`}
                >
                  <tab.icon className={`w-5 h-5 transition-transform duration-150 ${mobileTab === tab.id ? "scale-110" : ""}`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawerContent({
  drawer,
  onClose,
  onOpenDrawer,
}: {
  drawer: NonNullable<AdminDrawer>;
  onClose: () => void;
  onOpenDrawer: (drawer: AdminDrawer) => void;
}) {
  const drawerTitle =
    drawer === "analytics"
      ? "Analytics"
      : drawer === "vcard"
        ? "vCard Editor"
        : drawer === "wallet"
          ? "Wallet Pass"
          : drawer === "contacts"
            ? "Contacts"
            : drawer === "pages"
              ? "Pages"
              : drawer === "pages-new"
                ? "New Page"
                : typeof drawer === "object" && drawer.type === "page-edit"
                  ? "Edit Page"
                  : typeof drawer === "object" && drawer.type === "contact-detail"
                    ? "Contact Details"
                    : typeof drawer === "object" && drawer.type === "link-edit"
                      ? "Edit Block"
                      : "Drawer";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--admin-border)] shrink-0 bg-[var(--admin-surface)] sticky top-0 z-10 lg:static">
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-accent-subtle)] transition-all duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-[14px] font-semibold text-[var(--admin-text)] tracking-tight">{drawerTitle}</h2>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-accent-subtle)] transition-all duration-150"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {drawer === "analytics" && <AnalyticsDrawer />}
        {drawer === "vcard" && <VCardDrawer />}
        {drawer === "wallet" && <WalletDrawer />}
        {drawer === "contacts" && <ContactsDrawer onOpenDrawer={onOpenDrawer} />}
        {drawer === "pages" && <PagesDrawer onOpenDrawer={onOpenDrawer} />}
        {drawer === "pages-new" && (
          <PageEditorDrawer pageId={null} onOpenDrawer={onOpenDrawer} onClose={onClose} />
        )}
        {typeof drawer === "object" && drawer.type === "page-edit" && (
          <PageEditorDrawer pageId={drawer.id} onOpenDrawer={onOpenDrawer} onClose={onClose} />
        )}
        {typeof drawer === "object" && drawer.type === "contact-detail" && (
          <ContactDetailDrawer id={drawer.id} onClose={onClose} onOpenDrawer={onOpenDrawer} />
        )}
        {typeof drawer === "object" && drawer.type === "link-edit" && (
          <LinkEditDrawer id={drawer.id} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
