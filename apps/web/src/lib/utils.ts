export { cn } from "@linkden/ui";

export function getAdminThemeColors(resolvedTheme: string | undefined) {
	const bg = resolvedTheme === "dark" ? "#09090b" : "#ffffff";
	const fg = resolvedTheme === "dark" ? "#fafafa" : "#09090b";
	return { bg, fg };
}
