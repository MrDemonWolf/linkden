import { replaceTemplateVars } from "@/lib/format";

interface WhitelabelFooterProps {
	text: string;
	mutedFg?: string;
	colorMode?: "light" | "dark";
	profileName?: string;
}

// The server's fallback branding copy reads as a run-on sentence — normalize it
// here; admin-customized branding_text passes through untouched. (Fallback lives
// in packages/api/src/routers/public.ts.)
const LEGACY_DEFAULT_TEXT = "Powered by LinkDen made by MrDemonWolf, Inc.";
const DEFAULT_TEXT = "Powered by LinkDen · by MrDemonWolf, Inc.";

export function WhitelabelFooter({ text, mutedFg, colorMode, profileName }: WhitelabelFooterProps) {
	const resolvedText = replaceTemplateVars(
		text === LEGACY_DEFAULT_TEXT ? DEFAULT_TEXT : text,
		profileName,
	);

	return (
		<footer className="ld-footer mt-auto pb-6 pt-12 text-center">
			<p
				className={`text-xs ${!mutedFg ? (colorMode === "dark" ? "text-gray-600" : "text-gray-400") : ""}`}
				style={mutedFg ? { color: mutedFg, transition: "color 0.5s ease" } : undefined}
			>
				{resolvedText}
			</p>
		</footer>
	);
}
