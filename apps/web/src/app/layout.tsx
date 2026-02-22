import "@/styles/globals.css";
import { Providers } from "@/providers";
import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LinkDen",
    template: "%s | LinkDen",
  },
  description:
    "Your personal link-in-bio page. Share all your links, social profiles, and contact info in one place.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"),
  openGraph: {
    type: "website",
    siteName: "LinkDen",
    title: "LinkDen",
    description:
      "Your personal link-in-bio page. Share all your links, social profiles, and contact info in one place.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkDen",
    description:
      "Your personal link-in-bio page. Share all your links, social profiles, and contact info in one place.",
  },
  icons: {
    icon: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#091533",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
