"use client";

import { LeftPanel } from "@/components/admin/left-panel";
import { PhonePreview } from "@/components/admin/phone-preview";
import { RightPanel } from "@/components/admin/right-panel";
import { TopBar } from "@/components/admin/top-bar";
import {
  placeholderLinks,
  placeholderSettings,
  placeholderSocialLinks,
} from "@/lib/placeholder-data";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { BarChart3, LayoutGrid, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type DeviceSize = "phone" | "tablet" | "desktop";
type MobileTab = "blocks" | "preview" | "design";

export default function AdminEditorPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("phone");
  const [mobileTab, setMobileTab] = useState<MobileTab>("preview");
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({
    ...placeholderSettings,
  });

  // Load settings from server
  const settingsQuery = trpc.settings.getAll.useQuery();
  const linksQuery = trpc.links.listAll.useQuery();

  useEffect(() => {
    if (settingsQuery.data) {
      const map: Record<string, string> = { ...placeholderSettings };
      for (const s of settingsQuery.data) {
        map[s.key] = s.value;
      }
      setLocalSettings(map);
    }
  }, [settingsQuery.data]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      utils.settings.getPublic.invalidate();
      toast.success("Published!");
    },
    onError: () => toast.error("Failed to publish"),
  });

  const handleSettingsChange = useCallback((key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  function handlePublish() {
    const settingsArray = Object.entries(localSettings).map(([key, value]) => ({
      key,
      value,
    }));
    updateMutation.mutate({ settings: settingsArray });
  }

  function handleNavigate(path: string) {
    router.push(path);
  }

  // Use server links or placeholder
  const links = linksQuery.data && linksQuery.data.length > 0 ? linksQuery.data : placeholderLinks;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <TopBar
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        onPublish={handlePublish}
        isPublishing={updateMutation.isPending}
      />

      {/* Desktop: 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - hidden on mobile */}
        <div className="hidden lg:flex w-[320px] border-r border-gray-200 shrink-0">
          <LeftPanel onNavigate={handleNavigate} />
        </div>

        {/* Center - Phone Preview */}
        <div className="hidden lg:flex flex-1 bg-gray-100">
          <PhonePreview
            settings={localSettings}
            links={links}
            socialLinks={placeholderSocialLinks}
            deviceSize={deviceSize}
          />
        </div>

        {/* Right Panel - hidden on mobile */}
        <div className="hidden lg:block w-[360px] border-l border-gray-200 shrink-0">
          <RightPanel settings={localSettings} onSettingsChange={handleSettingsChange} />
        </div>

        {/* Mobile: Tab-based view */}
        <div className="flex-1 lg:hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {mobileTab === "blocks" && (
              <div className="h-full">
                <LeftPanel onNavigate={handleNavigate} />
              </div>
            )}
            {mobileTab === "preview" && (
              <div className="h-full bg-gray-100">
                <PhonePreview
                  settings={localSettings}
                  links={links}
                  socialLinks={placeholderSocialLinks}
                  deviceSize="phone"
                />
              </div>
            )}
            {mobileTab === "design" && (
              <div className="h-full">
                <RightPanel settings={localSettings} onSettingsChange={handleSettingsChange} />
              </div>
            )}
          </div>

          {/* Mobile bottom tab bar */}
          <div className="flex border-t border-gray-200 bg-white shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("blocks")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                mobileTab === "blocks" ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              Blocks
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                mobileTab === "preview" ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("design")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                mobileTab === "design" ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              <Palette className="w-5 h-5" />
              Design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
