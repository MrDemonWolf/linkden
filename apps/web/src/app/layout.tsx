import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Montserrat, Roboto } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
};

const montserrat = Montserrat({
	subsets: ["latin"],
	variable: "--font-display",
	weight: ["600", "700", "800"],
	display: "swap",
});

const roboto = Roboto({
	subsets: ["latin"],
	variable: "--font-sans",
	weight: ["400", "500"],
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	weight: ["400", "500", "600"],
	display: "swap",
});

type PublicPagePayload = {
	profile?: {
		name?: string | null;
		image?: string | null;
		bio?: string | null;
	} | null;
	settings?: {
		seoTitle?: string | null;
		seoDescription?: string | null;
		seoOgImage?: string | null;
		seoOgMode?: string | null;
		seoOgTemplate?: string | null;
		customPrimary?: string | null;
		brandingFaviconUrl?: string | null;
	};
};

async function fetchPage(): Promise<PublicPagePayload> {
	try {
		const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
		if (!serverUrl) return {};
		const res = await fetch(`${serverUrl}/trpc/public.getPage`, {
			next: { revalidate: 60 },
		});
		if (!res.ok) return {};
		const json = (await res.json()) as {
			result?: { data?: PublicPagePayload };
		};
		return json?.result?.data ?? {};
	} catch {
		return {};
	}
}

export async function generateMetadata(): Promise<Metadata> {
	const { profile, settings = {} } = await fetchPage();

	const title = settings.seoTitle || "LinkDen";
	const description = settings.seoDescription || "Your personal link-in-bio page";

	let ogImageUrl: string | undefined;
	if (settings.seoOgMode === "template") {
		const template = settings.seoOgTemplate || "minimal";
		const name = encodeURIComponent(profile?.name || "My Links");
		const bio = encodeURIComponent(profile?.bio || "");
		const theme = encodeURIComponent(settings.customPrimary || "#6366f1");
		const avatar = profile?.image ? `&avatar=${encodeURIComponent(profile.image)}` : "";
		ogImageUrl = `/api/og?template=${template}&name=${name}&bio=${bio}&theme=${theme}${avatar}`;
	} else if (settings.seoOgImage) {
		ogImageUrl = settings.seoOgImage;
	}

	return {
		title,
		description,
		icons: settings.brandingFaviconUrl
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
		<html lang="en" className="dark" suppressHydrationWarning>
			<body
				className={`${montserrat.variable} ${roboto.variable} ${jetbrainsMono.variable} antialiased`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
