export function getPrefix(template: string): string {
	const idx = template.indexOf("{}");
	if (idx === -1) return "";
	return template.slice(0, idx);
}

export function getSuffix(template: string): string {
	const idx = template.indexOf("{}");
	if (idx === -1) return "";
	return template.slice(idx + 2);
}

export function isFullUrlTemplate(template: string): boolean {
	return template === "{}";
}
