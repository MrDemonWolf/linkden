function getContrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
	return L > 0.179 ? "#000000" : "#FFFFFF";
}

interface AvatarProps {
	src: string | null;
	name: string;
	size?: "sm" | "md" | "lg";
	className?: string;
	hasBanner?: boolean;
	ringColor?: string;
	themeColors?: { primary: string; accent: string };
}

const sizeClasses = {
	sm: "h-12 w-12 text-lg",
	md: "h-16 w-16 text-xl",
	lg: "h-24 w-24 text-3xl",
};

export function Avatar({ src, name, size = "md", className, hasBanner, ringColor, themeColors }: AvatarProps) {
	const initials = name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const ringStyle: React.CSSProperties = hasBanner && ringColor
		? { boxShadow: `0 0 0 4px ${ringColor}`, transition: "box-shadow 0.5s ease" }
		: {};

	return (
		<div className="ld-avatar flex justify-center">
			{src ? (
				<img
					src={src}
					alt={name}
					className={`${sizeClasses[size]} rounded-full object-cover ${hasBanner ? "" : "ring-2 ring-white/20"} ${className ?? ""}`}
					style={ringStyle}
				/>
			) : (
				<div
					className={`${sizeClasses[size]} flex items-center justify-center rounded-full font-bold ${hasBanner ? "" : "ring-2 ring-white/20"} ${className ?? ""}`}
					style={{
						...(themeColors
							? { background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})`, color: getContrastColor(themeColors.primary) }
							: { background: "linear-gradient(135deg, #0FACED, #38BDF8)", color: "#FFFFFF" }),
						...ringStyle,
					}}
					aria-label={name}
				>
					{initials}
				</div>
			)}
		</div>
	);
}
