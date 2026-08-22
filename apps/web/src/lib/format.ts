export function initials(name?: string | null): string {
	if (!name) return "?";
	return name
		.split(/\s+/)
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

/** ISO/Date -> value for a `datetime-local` input, in the browser's local zone. */
export function isoToLocal(value: string | Date | null | undefined): string {
	if (!value) return "";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** `datetime-local` value (local zone) -> UTC ISO string, or "" when empty/invalid. */
export function localToIso(local: string): string {
	if (!local) return "";
	const d = new Date(local);
	return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
