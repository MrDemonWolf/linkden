import type { ThemeColors } from "./public-page";

interface TextBlockProps {
	block: {
		id: string;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors: ThemeColors;
}

const textAlignClasses: Record<string, string> = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
};

export function TextBlock({ config, themeColors }: TextBlockProps) {
	const body = config.body as string | undefined;
	if (!body) return null;
	const textAlign = textAlignClasses[(config.textAlign as string) || "left"] || "text-left";

	return (
		<p
			className={`ld-text-block whitespace-pre-line text-body ${textAlign}`}
			style={{ color: themeColors.fg }}
		>
			{body}
		</p>
	);
}
