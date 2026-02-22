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

const DEVICE_CONFIGS = {
  phone: {
    viewport: { width: 393, height: 852 },
    scale: 0.65,
    frameRadius: 50,
    bezel: 8,
    showDynamicIsland: true,
    showStatusBar: true,
    showHomeIndicator: true,
    showSideButtons: true,
  },
  tablet: {
    viewport: { width: 820, height: 1180 },
    scale: 0.38,
    frameRadius: 24,
    bezel: 6,
    showDynamicIsland: false,
    showStatusBar: false,
    showHomeIndicator: true,
    showSideButtons: false,
  },
  desktop: {
    viewport: { width: 1280, height: 800 },
    scale: 0.35,
    frameRadius: 12,
    bezel: 0,
    showDynamicIsland: false,
    showStatusBar: false,
    showHomeIndicator: false,
    showSideButtons: false,
  },
};

export function PhonePreview({ settings, links, socialLinks, deviceSize }: PhonePreviewProps) {
  const config = DEVICE_CONFIGS[deviceSize];
  const isDesktop = deviceSize === "desktop";

  const scaledWidth = config.viewport.width * config.scale + (config.bezel * 2 * config.scale);
  const scaledHeight = config.viewport.height * config.scale + (config.bezel * 2 * config.scale);

  return (
    <div className="flex flex-col items-center justify-center h-full py-6 overflow-auto">
      <div
        className="relative transition-all duration-500 ease-out"
        style={{
          width: isDesktop ? scaledWidth + 2 : scaledWidth + (config.showSideButtons ? 16 : 0),
          height: isDesktop ? scaledHeight + 40 : scaledHeight,
        }}
      >
        {/* Side buttons (phone only) */}
        {config.showSideButtons && (
          <>
            {/* Volume buttons - left */}
            <div
              className="absolute bg-zinc-700 rounded-l-sm"
              style={{
                left: -3,
                top: `${90 * config.scale}px`,
                width: 3,
                height: `${30 * config.scale}px`,
              }}
            />
            <div
              className="absolute bg-zinc-700 rounded-l-sm"
              style={{
                left: -3,
                top: `${130 * config.scale}px`,
                width: 3,
                height: `${30 * config.scale}px`,
              }}
            />
            {/* Power button - right */}
            <div
              className="absolute bg-zinc-700 rounded-r-sm"
              style={{
                right: -3,
                top: `${120 * config.scale}px`,
                width: 3,
                height: `${40 * config.scale}px`,
              }}
            />
          </>
        )}

        {/* Desktop browser chrome */}
        {isDesktop && (
          <div
            className="bg-zinc-800 border border-zinc-700 rounded-t-xl flex items-center px-3 gap-2"
            style={{ height: 36 }}
          >
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            {/* URL bar */}
            <div className="flex-1 mx-4">
              <div className="bg-zinc-900 rounded-md px-3 py-1 text-[10px] text-zinc-400 truncate text-center">
                {settings.metaTitle || settings.profileName || "linkden.app"}
              </div>
            </div>
          </div>
        )}

        {/* Device shell */}
        <div
          className="relative bg-zinc-950 shadow-2xl overflow-hidden transition-all duration-500 ease-out"
          style={{
            borderRadius: isDesktop
              ? "0 0 12px 12px"
              : `${config.frameRadius * config.scale}px`,
            padding: `${config.bezel * config.scale}px`,
            width: isDesktop ? scaledWidth + 2 : scaledWidth,
            border: isDesktop ? "1px solid rgb(63 63 70)" : undefined,
          }}
        >
          {/* Dynamic Island (phone only) */}
          {config.showDynamicIsland && (
            <div
              className="absolute z-20 left-1/2 -translate-x-1/2 bg-black rounded-full"
              style={{
                top: `${6 * config.scale}px`,
                width: `${126 * config.scale}px`,
                height: `${37 * config.scale}px`,
              }}
            />
          )}

          {/* Status bar (phone only) */}
          {config.showStatusBar && (
            <div
              className="relative z-10 flex items-center justify-between text-white"
              style={{
                padding: `${6 * config.scale}px ${20 * config.scale}px ${2 * config.scale}px`,
                fontSize: `${12 * config.scale}px`,
                fontWeight: 600,
              }}
            >
              <span>9:41</span>
              <div className="flex items-center gap-1">
                {/* Signal bars */}
                <svg
                  width={`${16 * config.scale}`}
                  height={`${12 * config.scale}`}
                  viewBox="0 0 16 12"
                  fill="white"
                >
                  <rect x="0" y="8" width="3" height="4" rx="0.5" />
                  <rect x="4" y="5" width="3" height="7" rx="0.5" />
                  <rect x="8" y="2" width="3" height="10" rx="0.5" />
                  <rect x="12" y="0" width="3" height="12" rx="0.5" />
                </svg>
                {/* WiFi */}
                <svg
                  width={`${14 * config.scale}`}
                  height={`${10 * config.scale}`}
                  viewBox="0 0 14 10"
                  fill="white"
                >
                  <path d="M7 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM3.5 6.5C4.5 5.5 5.7 5 7 5s2.5.5 3.5 1.5M1 3.5C2.7 1.8 4.8 1 7 1s4.3.8 6 2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                {/* Battery */}
                <svg
                  width={`${22 * config.scale}`}
                  height={`${10 * config.scale}`}
                  viewBox="0 0 22 10"
                  fill="none"
                >
                  <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="white" strokeOpacity="0.5" />
                  <rect x="2" y="2" width="15" height="6" rx="1" fill="white" />
                  <path d="M20 3.5v3a1.5 1.5 0 000-3z" fill="white" fillOpacity="0.5" />
                </svg>
              </div>
            </div>
          )}

          {/* Screen content */}
          <div
            className="overflow-y-auto overflow-x-hidden transition-all duration-500 ease-out"
            style={{
              borderRadius: isDesktop
                ? 0
                : `${(config.frameRadius - config.bezel) * config.scale}px`,
              height: `${config.viewport.height * config.scale - (config.showStatusBar ? 30 * config.scale : 0)}px`,
              width: `${config.viewport.width * config.scale}px`,
              background: settings.backgroundColor || "#091533",
              transform: `scale(1)`,
              transformOrigin: "top left",
            }}
          >
            <div
              style={{
                width: config.viewport.width,
                transform: `scale(${config.scale})`,
                transformOrigin: "top left",
                minHeight: config.viewport.height,
              }}
            >
              <PublicPage settings={settings} links={links} socialLinks={socialLinks} isPreview />
            </div>
          </div>

          {/* Home indicator (phone/tablet) */}
          {config.showHomeIndicator && (
            <div className="flex justify-center" style={{ padding: `${4 * config.scale}px 0` }}>
              <div
                className="bg-white/30 rounded-full"
                style={{
                  width: `${134 * config.scale}px`,
                  height: `${5 * config.scale}px`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
