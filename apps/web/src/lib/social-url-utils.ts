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

export function extractUsername(fullUrl: string, template: string): string {
	if (!fullUrl || isFullUrlTemplate(template)) return fullUrl;
	const prefix = getPrefix(template);
	const suffix = getSuffix(template);
	let username = fullUrl;
	if (prefix && username.startsWith(prefix)) {
		username = username.slice(prefix.length);
	}
	if (suffix && username.endsWith(suffix)) {
		username = username.slice(0, -suffix.length);
	}
	return username;
}

export function buildUrl(username: string, template: string): string {
	if (!username || isFullUrlTemplate(template)) return username;
	return template.replace("{}", username);
}

export function resolveUrl(url: string, template: string): string {
	if (!url) return "";
	if (isFullUrlTemplate(template)) return url;
	const username = extractUsername(url, template);
	return buildUrl(username, template);
}
