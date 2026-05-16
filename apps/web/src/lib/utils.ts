// Import from the granular subpath to avoid pulling every UI component into
// the server module graph at build time (which triggers `createContext` errors
// during Next.js prerender).
export { cn } from "@linkden/ui/utils";

export function getAdminThemeColors(resolvedTheme: string | undefined) {
	const bg = resolvedTheme === "dark" ? "#09090b" : "#ffffff";
	const fg = resolvedTheme === "dark" ? "#fafafa" : "#09090b";
	return { bg, fg };
}
