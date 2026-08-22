import { getAccessibleIconFill } from "@linkden/ui/color-contrast";
import type { ThemeColors } from "./public-page";

interface SocialNetwork {
	slug: string;
	name: string;
	url: string;
	hex: string;
	svgPath: string;
}

interface ProfileSocialIconsProps {
	networks: SocialNetwork[];
	colorMode: "light" | "dark";
	themeColors: ThemeColors;
	shape?: "circle" | "rounded-square";
}

/**
 * Social icons row rendered in the profile header section (below bio, above blocks).
 * Pulls data from the socialNetwork table rather than from blocks.
 */
export function ProfileSocialIcons({
	networks,
	colorMode,
	themeColors,
	shape = "circle",
}: ProfileSocialIconsProps) {
	if (networks.length === 0) return null;
	const radiusClass = shape === "rounded-square" ? "rounded-lg" : "rounded-full";

	return (
		<nav
			className="ld-social-icons mt-5 flex flex-wrap items-center justify-center gap-2"
			aria-label="Social links"
		>
			{networks.map((network, index) => {
				const contrastBg = themeColors.bg;
				const fill =
					network.hex && contrastBg && themeColors.fg
						? getAccessibleIconFill(network.hex, contrastBg, themeColors.fg)
						: network.hex || "currentColor";

				return (
					// Each <a> is an `.ld-social-icons > a` entrance target; `--ld-i` staggers it.
					<a
						key={network.slug}
						href={network.url}
						target="_blank"
						rel="noopener noreferrer"
						className={`group inline-flex h-11 w-11 items-center justify-center ${radiusClass} transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:bg-[var(--ld-primary)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 [&_svg_path]:transition-[fill] [&_svg_path]:duration-200 hover:[&_svg_path]:!fill-[var(--ld-primary)]`}
						style={
							{
								"--ld-i": Math.min(index, 12),
								color: themeColors.fg,
								outlineColor: themeColors.primary,
								backgroundColor:
									colorMode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
								borderColor: colorMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
								border: `1px solid ${colorMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
								backdropFilter: "blur(12px)",
								transition:
									"background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease, transform 0.3s ease",
							} as React.CSSProperties
						}
						aria-label={network.name}
						title={network.name}
					>
						{network.svgPath ? (
							<svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
								<path d={network.svgPath} fill={fill} />
							</svg>
						) : (
							<span className="text-xs font-semibold uppercase tracking-wide">
								{network.name.slice(0, 2)}
							</span>
						)}
					</a>
				);
			})}
		</nav>
	);
}
