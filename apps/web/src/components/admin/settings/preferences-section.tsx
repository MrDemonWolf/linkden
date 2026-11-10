"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const COMMON_TIMEZONES = [
	// Americas
	{ label: "Pacific Time (US & Canada)", value: "America/Los_Angeles" },
	{ label: "Mountain Time (US & Canada)", value: "America/Denver" },
	{ label: "Central Time (US & Canada)", value: "America/Chicago" },
	{ label: "Eastern Time (US & Canada)", value: "America/New_York" },
	{ label: "Atlantic Time (Canada)", value: "America/Halifax" },
	{ label: "São Paulo", value: "America/Sao_Paulo" },
	{ label: "Buenos Aires", value: "America/Argentina/Buenos_Aires" },
	{ label: "Bogotá", value: "America/Bogota" },
	{ label: "Mexico City", value: "America/Mexico_City" },
	// Europe
	{ label: "UTC", value: "UTC" },
	{ label: "London (GMT/BST)", value: "Europe/London" },
	{ label: "Paris / Berlin / Rome", value: "Europe/Paris" },
	{ label: "Helsinki", value: "Europe/Helsinki" },
	{ label: "Kyiv", value: "Europe/Kyiv" },
	{ label: "Moscow", value: "Europe/Moscow" },
	{ label: "Istanbul", value: "Europe/Istanbul" },
	// Asia/Pacific
	{ label: "Dubai", value: "Asia/Dubai" },
	{ label: "Kolkata (IST)", value: "Asia/Kolkata" },
	{ label: "Bangkok", value: "Asia/Bangkok" },
	{ label: "Singapore / Kuala Lumpur", value: "Asia/Singapore" },
	{ label: "Shanghai / Beijing", value: "Asia/Shanghai" },
	{ label: "Tokyo", value: "Asia/Tokyo" },
	{ label: "Seoul", value: "Asia/Seoul" },
	{ label: "Sydney", value: "Australia/Sydney" },
	{ label: "Auckland", value: "Pacific/Auckland" },
];

/** Admin-only preferences: nothing here touches the public page. */
export interface PreferencesState {
	timezone: string;
	adminBrandingEnabled: boolean;
}

export function parsePreferences(s: Record<string, string>): PreferencesState {
	return {
		timezone: s.timezone ?? "",
		adminBrandingEnabled: s.admin_branding_enabled !== "false",
	};
}

export function serializePreferences(s: PreferencesState) {
	return [
		{ key: "timezone" as const, value: s.timezone },
		{ key: "admin_branding_enabled" as const, value: String(s.adminBrandingEnabled) },
	];
}

/**
 * Zone options: the common list, plus this browser's zone and the stored value
 * when either is missing from it (a restored backup can hold any valid zone,
 * and a Select can't show a value it has no option for).
 */
export function timezoneItems(stored: string, browserZone: string | undefined) {
	const known = new Set(COMMON_TIMEZONES.map((z) => z.value));
	const extra: { label: string; value: string }[] = [];
	if (browserZone && !known.has(browserZone)) {
		extra.push({ label: `${browserZone} (this browser)`, value: browserZone });
		known.add(browserZone);
	}
	if (stored && !known.has(stored)) extra.push({ label: stored, value: stored });
	// Unset means UTC: Insights buckets days on the server, which can't see the browser's zone.
	return [{ value: "", label: "Not set (UTC)" }, ...extra, ...COMMON_TIMEZONES];
}

function browserTimeZone(): string | undefined {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	} catch {
		return undefined;
	}
}

export function PreferencesSection({
	state,
	onChange,
}: {
	state: PreferencesState;
	onChange: (next: PreferencesState) => void;
}) {
	const set = <K extends keyof PreferencesState>(key: K, value: PreferencesState[K]) =>
		onChange({ ...state, [key]: value });

	return (
		<div className="space-y-6">
			<div className="space-y-1.5">
				<Label htmlFor="pref-timezone">Timezone</Label>
				<Select
					id="pref-timezone"
					value={state.timezone}
					onValueChange={(v) => set("timezone", v)}
					items={timezoneItems(state.timezone, browserTimeZone())}
					aria-describedby="pref-timezone-hint"
				/>
				<p id="pref-timezone-hint" className="text-micro text-muted-foreground">
					Inbox timestamps use this timezone.
				</p>
			</div>

			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<Label htmlFor="pref-admin-branding">Admin panel branding</Label>
					<p className="mt-0.5 text-micro text-muted-foreground">
						Show &quot;Powered by LinkDen&quot; in the admin footer
					</p>
				</div>
				<Switch
					id="pref-admin-branding"
					checked={state.adminBrandingEnabled}
					onCheckedChange={(v) => set("adminBrandingEnabled", v)}
					aria-label="Admin panel branding"
				/>
			</div>
		</div>
	);
}
