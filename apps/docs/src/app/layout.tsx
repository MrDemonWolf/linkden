import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { Footer } from "@/components/footer";
import "./global.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "LinkDen - Your Links, Your Brand, Your Rules",
    template: "%s | LinkDen",
  },
  description: "Self-hosted link-in-bio platform built on Cloudflare. A modern, whitelabel-friendly Linktree alternative.",
  keywords: ["LinkDen", "link-in-bio", "linktree", "self-hosted", "cloudflare", "cloudflare-workers", "nextjs", "hono", "trpc", "whitelabel"],
  authors: [{ name: "MrDemonWolf, Inc." }],
  creator: "MrDemonWolf, Inc.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "LinkDen",
    title: "LinkDen - Your Links, Your Brand, Your Rules",
    description: "Self-hosted link-in-bio platform built on Cloudflare. A modern, whitelabel-friendly Linktree alternative.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkDen - Your Links, Your Brand, Your Rules",
    description: "Self-hosted link-in-bio platform built on Cloudflare. A modern, whitelabel-friendly Linktree alternative.",
  },
  metadataBase: new URL("https://mrdemonwolf.github.io/LinkDen"),
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
        <Footer />
      </body>
    </html>
  );
}
