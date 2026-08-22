import { SectionRule } from "@/components/ui/section-rule";
import type { ThemeColors } from "./public-page";

interface HeaderBlockProps {
	block: {
		id: string;
		title: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors: ThemeColors;
}

type Level = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const sizeClasses: Record<Level, string> = {
	h1: "text-h1 font-bold",
	h2: "text-h2 font-semibold",
	h3: "text-body font-semibold",
	h4: "text-small font-semibold",
	h5: "text-small font-medium",
	h6: "text-micro font-semibold uppercase tracking-wider",
};

export function HeaderBlock({ block, config, themeColors }: HeaderBlockProps) {
	const level = Object.hasOwn(sizeClasses, String(config.headingLevel))
		? (config.headingLevel as Level)
		: "h2";
	const textAlign = (config.textAlign as string) || "left";
	const emoji = config.emoji as string | undefined;
	const emojiPosition = (config.emojiPosition as string) || "left";
	// The running hairline *is* the divider now; `showDivider: false` hides it.
	const showRule = config.showDivider !== false;
	// The profile name is the page's only <h1>; a stored h1 keeps its size but
	// renders as <h2> so the document outline never has two top-level headings.
	const HeadingTag = level === "h1" ? "h2" : level;

	return (
		<div
			className="ld-header-block py-2"
			style={
				{
					color: themeColors.fg,
					// SectionRule paints from these two vars; set them from the page theme.
					"--signal": `linear-gradient(90deg, ${themeColors.primary}, ${themeColors.accent})`,
					"--rule": themeColors.border,
				} as React.CSSProperties
			}
		>
			{/* as="div" so the real h1–h6 below keeps its own size/weight classes. */}
			<SectionRule
				as="div"
				className={
					textAlign === "center"
						? "justify-center"
						: textAlign === "right"
							? "flex-row-reverse"
							: undefined
				}
				// A centered title has no "after" edge for a running rule; it gets the full-width one below.
				ruleClassName={!showRule || textAlign === "center" ? "hidden" : undefined}
			>
				<HeadingTag className={`flex items-center gap-2 ${sizeClasses[level]}`}>
					{emoji && emojiPosition === "left" && <span aria-hidden="true">{emoji}</span>}
					<span>{block.title || ""}</span>
					{emoji && emojiPosition === "right" && <span aria-hidden="true">{emoji}</span>}
				</HeadingTag>
			</SectionRule>
			{showRule && textAlign === "center" && (
				<hr className="mt-2 h-px border-0 bg-[color:var(--rule)]" />
			)}
		</div>
	);
}
