import { replaceTemplateVars } from "@/lib/format";

interface WhitelabelFooterProps {
	text: string;
	/** Optional http(s) URL the footer text links to; anything else renders plain text. */
	link?: string | null;
	mutedFg?: string;
	colorMode?: "light" | "dark";
	profileName?: string;
}

// The server's fallback branding copy reads as a run-on sentence — normalize it
// here; admin-customized branding_text passes through untouched. (Fallback lives
// in packages/api/src/routers/public.ts.)
const LEGACY_DEFAULT_TEXT = "Powered by LinkDen made by MrDemonWolf, Inc.";
const DEFAULT_TEXT = "Powered by LinkDen · by MrDemonWolf, Inc.";

/** Only absolute http(s) links: never `javascript:` or a relative path. */
function safeHttpUrl(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
	} catch {
		return null;
	}
}

export function WhitelabelFooter({
	text,
	link,
	mutedFg,
	colorMode,
	profileName,
}: WhitelabelFooterProps) {
	const resolvedText = replaceTemplateVars(
		text === LEGACY_DEFAULT_TEXT ? DEFAULT_TEXT : text,
		profileName,
	);
	const href = safeHttpUrl(link);

	return (
		<footer className="ld-footer mt-auto pb-6 pt-12 text-center">
			<p
				className={`text-xs ${!mutedFg ? (colorMode === "dark" ? "text-gray-600" : "text-gray-400") : ""}`}
				style={mutedFg ? { color: mutedFg, transition: "color 0.5s ease" } : undefined}
			>
				{href ? (
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
					>
						{resolvedText}
					</a>
				) : (
					resolvedText
				)}
			</p>
		</footer>
	);
}
