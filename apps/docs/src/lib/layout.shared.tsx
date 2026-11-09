import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { basePath } from "./site";

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: (
				<span className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
					<img src={`${basePath}/favicon.svg`} alt="" width={28} height={28} />
					<span>LinkDen</span>
				</span>
			),
			url: "/",
			transparentMode: "top",
		},
		githubUrl: "https://github.com/mrdemonwolf/linkden",
		links: [
			{ text: "Docs", url: "/docs", active: "nested-url" },
			{ text: "Design system", url: "/docs/design-system", active: "nested-url" },
			{ text: "Changelog", url: "/docs/changelog", active: "url" },
		],
		themeSwitch: { enabled: true, mode: "light-dark-system" },
		searchToggle: { enabled: true },
	};
}
