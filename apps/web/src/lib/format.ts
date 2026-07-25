export function initials(name?: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

export function extractDomain(url: string | null): string {
	if (!url) return "—";
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return url;
	}
}

export function relativeTime(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const now = Date.now();
	const diff = now - d.getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return d.toLocaleDateString();
}

export function replaceTemplateVars(text: string, name?: string): string {
	return text
		.replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
		.replace(/\{\{copyright\}\}/g, "\u00A9")
		.replace(/\{\{name\}\}/g, name ?? "");
}
