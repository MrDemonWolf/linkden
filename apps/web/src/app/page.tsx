import { cookies } from "next/headers";
import { COLOR_MODE_COOKIE, ColorModeScript } from "@/components/public/color-mode-script";
import { PublicPage } from "@/components/public/public-page";
import { WelcomePage } from "@/components/welcome-page";
import { getPublicPage } from "@/lib/public-page";

// Server-rendered: the HTML already carries the hero + blocks (no spinner), and
// the color mode is resolved from the cookie so a returning visitor gets no
// flash. `cookies()` makes the route dynamic, which is what we want — the page
// must reflect the current DB on every request.
export default async function Home() {
	const data = await getPublicPage();
	// Unreachable API and "no profile yet" both land on the welcome page.
	if (!data?.profile) return <WelcomePage />;

	const cookieMode = (await cookies()).get(COLOR_MODE_COOKIE)?.value;
	const initialColorMode =
		cookieMode === "light" || cookieMode === "dark"
			? cookieMode
			: data.settings.defaultColorMode === "dark"
				? "dark"
				: "light";

	return (
		<>
			<ColorModeScript defaultColorMode={data.settings.defaultColorMode} />
			<PublicPage data={{ ...data, profile: data.profile }} initialColorMode={initialColorMode} />
		</>
	);
}
