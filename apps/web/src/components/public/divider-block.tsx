import type { ThemeColors } from "./public-page";

interface DividerBlockProps {
	block: {
		id: string;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors: ThemeColors;
}

const spaceClasses: Record<string, string> = { sm: "h-4", md: "h-8", lg: "h-12" };

export function DividerBlock({ config, themeColors }: DividerBlockProps) {
	const style = (config.style as string) || "line";
	const size = spaceClasses[(config.size as string) || "md"] || "h-8";

	if (style === "space") {
		return <div className={`ld-divider-block ${size}`} aria-hidden="true" />;
	}

	if (style === "dots") {
		// A real <hr> carries the separator role; the dots are purely decorative.
		return (
			<div className="ld-divider-block relative py-3">
				<hr className="sr-only" />
				<div
					aria-hidden="true"
					className="flex items-center justify-center gap-2"
					style={{ color: themeColors.mutedFg }}
				>
					{[0, 1, 2].map((i) => (
						<span key={i} className="h-1 w-1 rounded-full bg-current" />
					))}
				</div>
			</div>
		);
	}

	return (
		<hr
			className="ld-divider-block my-2 h-px w-full border-0"
			style={{ backgroundColor: themeColors.border }}
		/>
	);
}
