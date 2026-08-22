import { env } from "@linkden/env/web";
import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist_Mono, Sora } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";
import { getPublicPage } from "@/lib/public-page";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
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

export async function generateMetadata(): Promise<Metadata> {
	const data = await getPublicPage();
	const profile = data?.profile;
	const settings = data?.settings;

	const title = settings?.seoTitle || "LinkDen";
	const description = settings?.seoDescription || "Your personal link-in-bio page";

	let ogImageUrl: string | undefined;
	if (settings?.seoOgMode === "template") {
		const template = settings.seoOgTemplate || "minimal";
		const name = encodeURIComponent(profile?.name || "My Links");
		const bio = encodeURIComponent(profile?.bio || "");
		const theme = encodeURIComponent(settings.customPrimary || "#6366f1");
		const avatar = profile?.image ? `&avatar=${encodeURIComponent(profile.image)}` : "";
		ogImageUrl = `/og?template=${template}&name=${name}&bio=${bio}&theme=${theme}${avatar}`;
	} else if (settings?.seoOgImage) {
		ogImageUrl = settings.seoOgImage;
	}

	return {
		// Makes relative icon/OG URLs absolute — crawlers need absolute OG images.
		metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
		title,
		description,
		icons: settings?.brandingFaviconUrl
			? {
					icon: settings.brandingFaviconUrl,
					apple: settings.brandingFaviconUrl,
				}
			: {
					icon: [
						{ url: "/favicon/favicon.svg", type: "image/svg+xml" },
						{ url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
					],
					apple: "/favicon/apple-touch-icon.png",
				},
		manifest: "/favicon/site.webmanifest",
		openGraph: {
			title,
			description,
			...(ogImageUrl
				? {
						images: [
							{
								url: ogImageUrl,
								width: 1200,
								height: 630,
								alt: title,
							},
						],
					}
				: {}),
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			...(ogImageUrl
				? {
						images: [
							{
								url: ogImageUrl,
								width: 1200,
								height: 630,
								alt: title,
							},
						],
					}
				: {}),
		},
	};
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${sora.variable} ${dmSans.variable} ${geistMono.variable} antialiased`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
