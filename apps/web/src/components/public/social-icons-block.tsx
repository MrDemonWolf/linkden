import { getAccessibleIconFill } from "@linkden/ui/color-contrast";
import { usePreview } from "./preview-context";

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
}

export function SocialIconsBlock({
	block,
	config,
	colorMode,
	networks,
	themeColors,
}: SocialIconsBlockProps) {
	const { isPreview } = usePreview();
	const iconSize = (config.iconSize as string) || "md";
	const iconStyle = (config.iconStyle as string) || "circle";
	const showLabels = config.showLabels as boolean | undefined;
	const spacing = (config.spacing as string) || "default";
	const alignment = (config.alignment as string) || "center";

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

	const justifyClasses: Record<string, string> = {
		left: "justify-start",
		center: "justify-center",
		right: "justify-end",
	};

	return (
		<div role="listitem" className="ld-social-block flex flex-col py-2">
			<div className={`flex flex-wrap items-center ${justifyClasses[alignment] || "justify-center"} ${gapClasses[spacing] || "gap-3"}`}>
				{items.map((item) => {
					const contrastBg = iconStyle === "bare"
						? themeColors?.bg
						: colorMode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
					const fill = item.hex && contrastBg && themeColors?.fg
						? getAccessibleIconFill(item.hex, contrastBg, themeColors.fg)
						: item.hex || "currentColor";

					return (
						<a
							key={item.platform}
							href={isPreview ? undefined : item.url}
							target={isPreview ? undefined : "_blank"}
							rel={isPreview ? undefined : "noopener noreferrer"}
							onClick={isPreview ? (e: React.MouseEvent) => e.preventDefault() : undefined}
							className={`inline-flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 min-h-[44px] min-w-[44px] ${
								sizeClasses[iconSize] || "h-10 w-10"
							} ${
								iconStyle !== "bare"
									? `${shapeClasses[iconStyle] || "rounded-full"} backdrop-blur-xl border`
									: ""
							} focus-visible:outline-2 focus-visible:outline-offset-2`}
							style={
								iconStyle !== "bare"
									? {
											color: themeColors?.fg || (colorMode === "dark" ? "#fff" : "#374151"),
											outlineColor: themeColors?.primary,
											backgroundColor: colorMode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
											borderColor: colorMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
											transition: "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease, transform 0.2s ease, opacity 0.2s ease",
										}
									: {
											color: themeColors?.mutedFg || (colorMode === "dark" ? "#d1d5db" : "#4b5563"),
											outlineColor: themeColors?.primary,
											transition: "color 0.5s ease, transform 0.2s ease, opacity 0.2s ease",
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
				<div className={`mt-2 flex flex-wrap ${justifyClasses[alignment] || "justify-center"} gap-2`}>
					{items.map((item) => (
						<a
							key={`label-${item.platform}`}
							href={isPreview ? undefined : item.url}
							target={isPreview ? undefined : "_blank"}
							rel={isPreview ? undefined : "noopener noreferrer"}
							onClick={isPreview ? (e: React.MouseEvent) => e.preventDefault() : undefined}
							className="text-xs transition-opacity hover:opacity-80"
							style={{ color: themeColors?.mutedFg || (colorMode === "dark" ? "#9ca3af" : "#6b7280"), transition: "color 0.5s ease" }}
						>
							{item.platform}
						</a>
					))}
				</div>
			)}
		</div>
	);
}
