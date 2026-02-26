interface WhitelabelFooterProps {
	text: string;
	mutedFg?: string;
	colorMode?: "light" | "dark";
	profileName?: string;
}

function processVariables(text: string, profileName?: string): string {
	return text
		.replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
		.replace(/\{\{copyright\}\}/g, "\u00A9")
		.replace(/\{\{name\}\}/g, profileName ?? "");
}

export function WhitelabelFooter({ text, mutedFg, colorMode, profileName }: WhitelabelFooterProps) {
	const resolvedText = processVariables(text, profileName);

	return (
		<footer className="ld-footer pb-6 pt-12 text-center">
			<p
				className={`text-xs ${!mutedFg ? (colorMode === "dark" ? "text-gray-600" : "text-gray-400") : ""}`}
				style={mutedFg ? { color: mutedFg, transition: "color 0.5s ease" } : undefined}
			>
				{resolvedText}
			</p>
		</footer>
	);
}
