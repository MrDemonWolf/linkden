import type { Metadata } from "next";
import { Geist_Mono, Montserrat, Roboto } from "next/font/google";
import { Footer } from "@/components/footer";
import { Provider } from "@/components/provider";
import { basePath } from "@/lib/site";
import "./global.css";

const montserrat = Montserrat({
	subsets: ["latin"],
	variable: "--font-montserrat",
	display: "swap",
});
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
	title: {
		default: "LinkDen - Your Links, Your Brand, Your Rules",
		template: "%s | LinkDen",
	},
	description: "Build a personal page and run LinkDen on your own Cloudflare account.",
	keywords: [
		"LinkDen",
		"link-in-bio",
		"linktree",
		"self-hosted",
		"cloudflare",
		"cloudflare-workers",
		"nextjs",
		"hono",
		"trpc",
		"whitelabel",
	],
	authors: [{ name: "MrDemonWolf, Inc." }],
	creator: "MrDemonWolf, Inc.",
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "LinkDen",
		title: "LinkDen - Your Links, Your Brand, Your Rules",
		description: "Build a personal page on your own Cloudflare account.",
	},
	twitter: {
		card: "summary_large_image",
		title: "LinkDen - Your Links, Your Brand, Your Rules",
		description: "Build a personal page on your own Cloudflare account.",
	},
	metadataBase: new URL("https://mrdemonwolf.github.io/linkden"),
	icons: {
		icon: `${basePath}/favicon.svg`,
		apple: `${basePath}/favicon.svg`,
	},
};

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${montserrat.variable} ${roboto.variable} ${mono.variable}`}
			suppressHydrationWarning
		>
			<body className="flex flex-col min-h-screen">
				<Provider>{children}</Provider>
				<Footer />
			</body>
		</html>
	);
}
