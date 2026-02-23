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
		<div className="flex justify-center">
			{src ? (
				<img
					src={src}
					alt={name}
					className={`${sizeClasses[size]} rounded-full object-cover ${hasBanner ? "" : "ring-2 ring-white/20"} ${className ?? ""}`}
					style={ringStyle}
				/>
			) : (
				<div
					className={`${sizeClasses[size]} flex items-center justify-center rounded-full font-bold text-white ${hasBanner ? "" : "ring-2 ring-white/20"} ${className ?? ""}`}
					style={{
						...(themeColors
							? { background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})` }
							: { background: "linear-gradient(135deg, #3b82f6, #9333ea)" }),
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
