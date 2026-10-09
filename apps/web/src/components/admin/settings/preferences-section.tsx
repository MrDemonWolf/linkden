"use client";

import type { BannerPreset } from "@linkden/ui";
import { Check, Image as ImageIcon, Sparkles, Upload } from "lucide-react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { ShaderBanner } from "@/components/public/shader-banner";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getLoginBgPresets } from "@/lib/login-bg";
import { cn } from "@/lib/utils";

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
	loginLogoUrl: string;
	loginBgMode: string;
	loginBgPreset: string;
	loginBgCustomUrl: string;
}

export function parsePreferences(s: Record<string, string>): PreferencesState {
	return {
		timezone: s.timezone ?? "",
		adminBrandingEnabled: s.admin_branding_enabled !== "false",
		loginLogoUrl: s.branding_login_logo_url ?? "",
		loginBgMode: s.branding_login_bg_mode ?? "default",
		loginBgPreset: s.branding_login_bg_preset ?? "wolf-shadow",
		loginBgCustomUrl: s.branding_login_bg_custom_url ?? "",
	};
}

export function serializePreferences(s: PreferencesState) {
	return [
		{ key: "timezone" as const, value: s.timezone },
		{ key: "admin_branding_enabled" as const, value: String(s.adminBrandingEnabled) },
		{ key: "branding_login_logo_url" as const, value: s.loginLogoUrl },
		{ key: "branding_login_bg_mode" as const, value: s.loginBgMode },
		{ key: "branding_login_bg_preset" as const, value: s.loginBgPreset },
		{ key: "branding_login_bg_custom_url" as const, value: s.loginBgCustomUrl },
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

const BG_MODES = [
	{ id: "default", label: "Default", icon: Sparkles },
	{ id: "preset", label: "Preset", icon: ImageIcon },
	{ id: "custom", label: "Custom", icon: Upload },
] as const;

export function PreferencesSection({
	state,
	onChange,
}: {
	state: PreferencesState;
	onChange: (next: PreferencesState) => void;
}) {
	const set = <K extends keyof PreferencesState>(key: K, value: PreferencesState[K]) =>
		onChange({ ...state, [key]: value });
	const bgMode = state.loginBgMode || "default";

	return (
		<div className="space-y-6">
			<div className="space-y-1.5">
				<Label htmlFor="pref-timezone">Timezone</Label>
				<Select
					id="pref-timezone"
					value={state.timezone}
					onValueChange={(v) => set("timezone", v)}
					items={timezoneItems(state.timezone, browserTimeZone())}
				/>
				<p className="text-micro text-muted-foreground">
					Insights counts views and clicks per calendar day in this timezone.
				</p>
			</div>

			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<Label htmlFor="pref-admin-branding">Admin panel branding</Label>
					<p className="mt-0.5 text-micro text-muted-foreground">
						Show &quot;Powered by LinkDen&quot; in the admin rail
					</p>
				</div>
				<Switch
					id="pref-admin-branding"
					checked={state.adminBrandingEnabled}
					onCheckedChange={(v) => set("adminBrandingEnabled", v)}
					aria-label="Admin panel branding"
				/>
			</div>

			{/* Login page customization */}
			<div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
				<div>
					<p className="text-xs font-medium">Login page</p>
					<p className="text-micro text-muted-foreground">
						A dedicated logo and background for the login and setup screens
					</p>
				</div>

				{/* Fieldset + legend: the upload's Replace / Re-crop / Remove buttons are
				    generic, so the group name tells a screen reader which image they act on. */}
				<fieldset className="min-w-0 space-y-1.5" aria-describedby="pref-login-logo-hint">
					<legend className="text-micro font-medium text-muted-foreground">Login logo</legend>
					<p id="pref-login-logo-hint" className="text-micro text-muted-foreground">
						Optional — falls back to the site logo (Design → Branding) when empty
					</p>
					<ImageUploadField
						ariaLabel="login logo"
						value={state.loginLogoUrl}
						purpose="login_logo"
						onUploadComplete={(v) => set("loginLogoUrl", v)}
						aspectRatio="logo"
					/>
				</fieldset>

				<fieldset className="min-w-0 space-y-2">
					<legend className="text-micro font-medium text-muted-foreground">Login background</legend>
					{/* Single-select ToggleGroup (Base UI `multiple` defaults to false).
					    An empty `next` is a re-press of the active mode — ignoring it keeps
					    one mode selected. This was a `role="tablist"` before, but the three
					    modes never controlled tabpanels. */}
					<ToggleGroup
						value={[bgMode]}
						onValueChange={(next) => {
							const picked = next[0];
							if (picked) set("loginBgMode", picked);
						}}
						spacing={1}
						aria-label="Login background mode"
						className="flex-wrap rounded-lg border border-border bg-background p-1"
					>
						{BG_MODES.map(({ id, label, icon: Icon }) => (
							<ToggleGroupItem
								key={id}
								value={id}
								className="min-h-11 gap-1.5 px-3 text-muted-foreground md:min-h-9 aria-pressed:bg-primary/10 aria-pressed:text-primary hover:aria-pressed:bg-primary/10 hover:aria-pressed:text-primary"
							>
								<Icon className="size-3" />
								{label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>

					{bgMode === "default" && (
						<p className="text-micro text-muted-foreground">
							Theme-aware glow over the base background.
						</p>
					)}

					{bgMode === "preset" && (
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{getLoginBgPresets().map((preset: BannerPreset) => {
								const selected = state.loginBgPreset === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										aria-pressed={selected}
										onClick={() => set("loginBgPreset", preset.id)}
										className={cn(
											"group relative h-16 overflow-hidden rounded-lg border-2 transition-colors",
											selected
												? "border-primary ring-2 ring-primary/20"
												: "border-transparent hover:border-muted-foreground/30",
										)}
									>
										{preset.type === "css" ? (
											<div
												className={`absolute inset-0 ${preset.className ?? ""}`}
												style={preset.style}
											/>
										) : (
											<ShaderBanner preset={preset} staticPreview />
										)}
										{selected && (
											<div className="absolute inset-0 flex items-center justify-center bg-black/25">
												<Check className="h-4 w-4 text-white drop-shadow-lg" />
											</div>
										)}
										<span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-micro font-medium text-white">
											{preset.name}
										</span>
									</button>
								);
							})}
						</div>
					)}

					{bgMode === "custom" && (
						<ImageUploadField
							ariaLabel="login background"
							value={state.loginBgCustomUrl}
							purpose="login_background"
							onUploadComplete={(v) => set("loginBgCustomUrl", v)}
							aspectRatio="banner"
						/>
					)}
				</fieldset>
			</div>
		</div>
	);
}
