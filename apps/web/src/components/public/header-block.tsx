interface HeaderBlockProps {
	block: {
		id: string;
		title: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: {
		border?: string;
	};
}

export function HeaderBlock({ block, config, colorMode, themeColors }: HeaderBlockProps) {
	const headingLevel = (config.headingLevel as string) || "h2";
	const textAlign = (config.textAlign as string) || "center";
	const fontWeight = (config.fontWeight as string) || "bold";
	const emoji = config.emoji as string | undefined;
	const emojiPosition = (config.emojiPosition as string) || "left";
	const showDivider = config.showDivider as boolean | undefined;

	const textAlignClasses: Record<string, string> = {
		left: "text-left",
		center: "text-center",
		right: "text-right",
	};

	const fontWeightClasses: Record<string, string> = {
		normal: "font-normal",
		medium: "font-medium",
		bold: "font-bold",
	};

	const sizeClasses: Record<string, string> = {
		h2: "text-xl",
		h3: "text-lg",
		h4: "text-base",
	};

	const HeadingTag = headingLevel as "h2" | "h3" | "h4";

	const content = (
		<span className="flex items-center justify-center gap-2">
			{emoji && emojiPosition === "left" && (
				<span aria-hidden="true">{emoji}</span>
			)}
			<span>{block.title || ""}</span>
			{emoji && emojiPosition === "right" && (
				<span aria-hidden="true">{emoji}</span>
			)}
		</span>
	);

	return (
		<div role="listitem" className="ld-header-block py-2">
			<HeadingTag
				className={`${sizeClasses[headingLevel] || "text-xl"} ${fontWeightClasses[fontWeight] || "font-bold"} ${textAlignClasses[textAlign] || "text-center"}`}
			>
				{content}
			</HeadingTag>
			{showDivider && (
				<hr
					className="mt-2"
					style={{ borderColor: themeColors?.border || (colorMode === "dark" ? "#374151" : "#e5e7eb") }}
				/>
			)}
		</div>
	);
}
