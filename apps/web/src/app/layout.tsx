import type { Metadata, Viewport } from "next";
import { Montserrat, Roboto } from "next/font/google";
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

async function fetchSettings(): Promise<Record<string, string>> {
	try {
		const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
		if (!serverUrl) return {};
		const res = await fetch(`${serverUrl}/trpc/public.getPage`, {
			next: { revalidate: 60 },
		});
		if (!res.ok) return {};
		const json = await res.json() as { result?: { data?: { settings?: Record<string, string> } } };
		return json?.result?.data?.settings ?? {};
	} catch {
		return {};
	}
}

export async function generateMetadata(): Promise<Metadata> {
	const settings = await fetchSettings();

	const title = settings.seo_title || "LinkDen";
	const description = settings.seo_description || "Your personal link-in-bio page";

	let ogImageUrl: string | undefined;
	if (settings.seo_og_mode === "template") {
		const template = settings.seo_og_template || "minimal";
		const name = encodeURIComponent(settings.profile_name || "My Links");
		const bio = encodeURIComponent(settings.bio || "");
		const theme = encodeURIComponent(settings.custom_primary || "#6366f1");
		const avatar = settings.avatar_url ? `&avatar=${encodeURIComponent(settings.avatar_url)}` : "";
		ogImageUrl = `/api/og?template=${template}&name=${name}&bio=${bio}&theme=${theme}${avatar}`;
	} else if (settings.seo_og_image) {
		ogImageUrl = settings.seo_og_image;
	}

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			...(ogImageUrl ? { images: [ogImageUrl] } : {}),
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
			<body
				className={`${montserrat.variable} ${roboto.variable} antialiased`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
