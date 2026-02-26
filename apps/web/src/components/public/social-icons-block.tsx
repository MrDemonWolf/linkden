import { getAccessibleIconFill } from "@linkden/ui/color-contrast";

interface SocialNetwork {
	slug: string;
	name: string;
	url: string;
	hex: string;
	svgPath: string;
}

interface SocialIconsBlockProps {
	block: {
		id: string;
		socialIcons: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	networks?: SocialNetwork[];
	themeColors?: {
		bg?: string;
		muted?: string;
		mutedFg?: string;
		fg?: string;
		border?: string;
		primary?: string;
	};
	globalIconShape?: "circle" | "rounded-square";
}

export function SocialIconsBlock({
	block,
	config,
	colorMode,
	networks,
	themeColors,
	globalIconShape,
}: SocialIconsBlockProps) {
	const iconSize = (config.iconSize as string) || "md";
	const iconStyle = (config.iconStyle as string) || "circle";
	const showLabels = config.showLabels as boolean | undefined;
	const spacing = (config.spacing as string) || "default";

	// Global shape override
	const effectiveShape = globalIconShape === "rounded-square" ? "rounded"
		: globalIconShape === "circle" ? "circle"
		: iconStyle;

	// Use real social networks from API if available
	const items: { platform: string; url: string; hex?: string; svgPath?: string }[] = [];

	if (networks && networks.length > 0) {
		for (const n of networks) {
			items.push({ platform: n.name, url: n.url, hex: n.hex, svgPath: n.svgPath });
		}
	} else {
		// Fallback to legacy socialIcons JSON
		try {
			const parsed = block.socialIcons ? JSON.parse(block.socialIcons) : [];
			for (const icon of parsed) {
				items.push({ platform: icon.platform, url: icon.url });
			}
		} catch {
			// ignore
		}
	}

	if (items.length === 0) return null;

	const sizeClasses: Record<string, string> = {
		sm: "h-8 w-8",
		md: "h-10 w-10",
		lg: "h-12 w-12",
	};

	const svgSizeClasses: Record<string, string> = {
		sm: "h-4 w-4",
		md: "h-5 w-5",
		lg: "h-6 w-6",
	};

	const shapeClasses: Record<string, string> = {
		circle: "rounded-full",
		square: "rounded-none",
		rounded: "rounded-lg",
		bare: "",
	};

	const gapClasses: Record<string, string> = {
		compact: "gap-1",
		default: "gap-3",
		spacious: "gap-5",
	};

	return (
		<div role="listitem" className="ld-social-block py-2">
			<div
				className={`flex flex-wrap items-center justify-center ${gapClasses[spacing] || "gap-3"}`}
			>
				{items.map((item) => {
					// Adaptive fill: pick brand color only if it has sufficient contrast
					const contrastBg = effectiveShape === "bare" ? themeColors?.bg : themeColors?.muted;
					const fill = item.hex && contrastBg && themeColors?.fg
						? getAccessibleIconFill(item.hex, contrastBg, themeColors.fg)
						: item.hex || "currentColor";

					return (
						<a
							key={item.platform}
							href={item.url}
							target="_blank"
							rel="noopener noreferrer"
							className={`inline-flex items-center justify-center transition-transform hover:scale-110 ${
								sizeClasses[iconSize] || "h-10 w-10"
							} ${
								effectiveShape !== "bare"
									? shapeClasses[effectiveShape] || "rounded-full"
									: ""
							} focus-visible:outline-2 focus-visible:outline-offset-2`}
							style={
								effectiveShape !== "bare"
									? {
											backgroundColor: themeColors?.muted || (colorMode === "dark" ? "#1f2937" : "#f3f4f6"),
											color: themeColors?.fg || (colorMode === "dark" ? "#fff" : "#374151"),
											outlineColor: themeColors?.primary,
										}
									: {
											color: themeColors?.mutedFg || (colorMode === "dark" ? "#d1d5db" : "#4b5563"),
											outlineColor: themeColors?.primary,
										}
							}
							aria-label={item.platform}
							title={item.platform}
						>
							{item.svgPath ? (
								<svg viewBox="0 0 24 24" className={svgSizeClasses[iconSize] || "h-5 w-5"}>
									<path d={item.svgPath} fill={fill} />
								</svg>
							) : (
								<span className="text-xs font-medium uppercase">
									{item.platform.slice(0, 2)}
								</span>
							)}
						</a>
					);
				})}
			</div>
			{showLabels && (
				<div className="mt-2 flex flex-wrap justify-center gap-2">
					{items.map((item) => (
						<a
							key={`label-${item.platform}`}
							href={item.url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs transition-opacity hover:opacity-80"
							style={{ color: themeColors?.mutedFg || (colorMode === "dark" ? "#9ca3af" : "#6b7280") }}
						>
							{item.platform}
						</a>
					))}
				</div>
			)}
		</div>
	);
}
