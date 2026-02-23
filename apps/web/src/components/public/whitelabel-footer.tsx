interface WhitelabelFooterProps {
	text: string;
	mutedFg?: string;
	colorMode?: "light" | "dark";
}

export function WhitelabelFooter({ text, mutedFg, colorMode }: WhitelabelFooterProps) {
	return (
		<footer className="pb-6 pt-12 text-center">
			<p
				className={`text-xs ${!mutedFg ? (colorMode === "dark" ? "text-gray-600" : "text-gray-400") : ""}`}
				style={mutedFg ? { color: mutedFg, transition: "color 0.5s ease" } : undefined}
			>
				{text}
			</p>
		</footer>
	);
}
