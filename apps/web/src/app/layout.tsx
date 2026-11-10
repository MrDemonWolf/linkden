import { env } from "@linkden/env/web";
import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";
import { SwRegister } from "@/components/sw-register";

// Static on purpose: the profile-driven title, SEO, OG card, favicon and theme
// colour are app/page.tsx's (only "/" needs them). Fetching the public page here
// made every admin render, 404 and /offline wait on — and pay for — that API
// call, and forced all of them dynamic.
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	themeColor: "#00ACED",
};

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	weight: ["400", "500"],
	display: "swap",
	preload: false,
});

export const metadata: Metadata = {
	// Makes relative icon/OG URLs absolute — crawlers need absolute OG images.
	metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
	title: "LinkDen",
	description: "Your personal link-in-bio page",
	icons: {
		icon: [
			{ url: "/logo.svg", type: "image/svg+xml" },
			{ url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
		],
		apple: "/favicon/apple-touch-icon.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistMono.variable} antialiased`}>
				<Providers>{children}</Providers>
				<SwRegister />
			</body>
		</html>
	);
}
