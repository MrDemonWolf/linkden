"use client";

import { PublicPage } from "@/components/public/public-page";

interface LinkData {
  id: string;
  type: string;
  title: string;
  url: string | null;
  icon: string | null;
  iconType: string | null;
  isActive: boolean;
  clickCount: number;
  metadata: Record<string, unknown> | null;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface PhonePreviewProps {
  settings: Record<string, string>;
  links: LinkData[];
  socialLinks: SocialLink[];
  deviceSize: "phone" | "tablet" | "desktop";
}

const DEVICE_DIMENSIONS = {
  phone: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
};

export function PhonePreview({ settings, links, socialLinks, deviceSize }: PhonePreviewProps) {
  const dims = DEVICE_DIMENSIONS[deviceSize];
  const isPhone = deviceSize === "phone";

  return (
    <div className="flex flex-col items-center justify-start h-full py-6 overflow-auto">
      <div
        className={`relative bg-black rounded-[3rem] shadow-2xl overflow-hidden ${
          isPhone ? "p-3" : "p-2 rounded-2xl"
        }`}
        style={{
          width: Math.min(dims.width + (isPhone ? 24 : 16), 420),
          maxHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Phone frame notch */}
        {isPhone && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-20" />
        )}

        {/* Status bar */}
        {isPhone && (
          <div className="relative z-10 flex items-center justify-between px-6 pt-2 pb-1 text-[10px] font-medium text-white">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px]">
                {[4, 3, 2, 1].map((h) => (
                  <div
                    key={h}
                    className="w-[3px] bg-white rounded-sm"
                    style={{ height: h * 2 + 2 }}
                  />
                ))}
              </div>
              <span className="ml-1">100%</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className={`overflow-y-auto overflow-x-hidden ${
            isPhone ? "rounded-[2.25rem]" : "rounded-xl"
          }`}
          style={{
            height: isPhone ? dims.height - 60 : dims.height,
            background: settings.backgroundColor || "#091533",
          }}
        >
          <PublicPage settings={settings} links={links} socialLinks={socialLinks} isPreview />
        </div>
      </div>
    </div>
  );
}
