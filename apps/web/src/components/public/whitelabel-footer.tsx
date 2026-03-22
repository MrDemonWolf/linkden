import { replaceTemplateVars } from "@/lib/format";

interface WhitelabelFooterProps {
	text: string;
	mutedFg?: string;
	colorMode?: "light" | "dark";
	profileName?: string;
}

export function WhitelabelFooter({ text, mutedFg, colorMode, profileName }: WhitelabelFooterProps) {
	const resolvedText = replaceTemplateVars(text, profileName);

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
