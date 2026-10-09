import { env } from "@linkden/env/web";
import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist_Mono, Sora } from "next/font/google";
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

const sora = Sora({
	subsets: ["latin"],
	variable: "--font-display",
	weight: ["600", "700", "800"],
	display: "swap",
	preload: true,
});

// next/font only allows `axes` on the variable build, so DM Sans ships as a
// variable font (covers 400/500/600) to get the optical-size axis.
const dmSans = DM_Sans({
	subsets: ["latin"],
	variable: "--font-sans",
	weight: "variable",
	axes: ["opsz"],
	display: "swap",
	preload: true,
});

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
			<body className={`${sora.variable} ${dmSans.variable} ${geistMono.variable} antialiased`}>
				<Providers>{children}</Providers>
				<SwRegister />
			</body>
		</html>
	);
}
