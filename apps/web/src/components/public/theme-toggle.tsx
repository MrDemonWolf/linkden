import type { ThemeColors } from "./public-page";

interface ThemeToggleProps {
	colorMode: "light" | "dark";
	onToggle: () => void;
	themeColors?: ThemeColors;
}

export function ThemeToggle({ colorMode, onToggle, themeColors }: ThemeToggleProps) {
	const style: React.CSSProperties = themeColors
		? {
				backgroundColor: `${themeColors.card}cc`,
				color: themeColors.cardFg,
				border: `1px solid ${themeColors.border}`,
				backdropFilter: "blur(12px)",
				WebkitBackdropFilter: "blur(12px)",
				transition: "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease",
			}
		: {};

	return (
		<button
			onClick={onToggle}
			className={`fixed right-4 top-4 z-50 rounded-full p-2 transition-colors ${
				themeColors
					? ""
					: colorMode === "dark"
						? "bg-gray-800 text-yellow-400 hover:bg-gray-700"
						: "bg-white text-gray-700 shadow-md hover:bg-gray-100"
			}`}
			style={style}
			aria-label={`Switch to ${colorMode === "light" ? "dark" : "light"} mode`}
			type="button"
		>
			{colorMode === "dark" ? (
				<svg
					className="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
					/>
				</svg>
			) : (
				<svg
					className="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
					/>
				</svg>
			)}
		</button>
	);
}
