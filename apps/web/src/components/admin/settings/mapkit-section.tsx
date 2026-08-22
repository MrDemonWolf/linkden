"use client";

import { SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { Info } from "lucide-react";
import { z } from "zod";
import { FieldError } from "@/components/admin/field-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fieldError } from "@/lib/validate";

// Same cap the server applies (it truncates silently past this).
const TOKEN_MAX = SETTING_REGISTRY.mapkit_token?.maxLength ?? 512;
const tokenSchema = z.string().max(TOKEN_MAX);

/** Field → message for an invalid MapKit token; `{}` when valid. */
export function mapkitErrors(v: { mapkitToken: string }): Record<string, string> {
	const token = fieldError(tokenSchema, v.mapkitToken);
	return token ? { mapkitToken: token } : {};
}

interface MapKitSectionProps {
	mapkitEnabled: boolean;
	mapkitToken: string;
	onMapkitEnabledChange: (v: boolean) => void;
	onMapkitTokenChange: (v: string) => void;
}

/** Controlled like the other settings sections; the Integrations page owns the form scope. */
export function MapKitSection({
	mapkitEnabled,
	mapkitToken,
	onMapkitEnabledChange,
	onMapkitTokenChange,
}: MapKitSectionProps) {
	const errors = mapkitErrors({ mapkitToken });
	return (
		<div className="space-y-3">
			<div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
				<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<p className="text-micro text-muted-foreground">
					Not yet functional — Location blocks currently use map links and don&apos;t require a
					token.
				</p>
			</div>

			<p className="text-micro text-muted-foreground">
				Requires an Apple Developer account and a MapKit JS JWT token.
			</p>

			<div className="flex items-center gap-3">
				<Switch
					id="s-mapkit-enabled"
					checked={mapkitEnabled}
					onCheckedChange={onMapkitEnabledChange}
					aria-label="Enable MapKit JS"
				/>
				<Label htmlFor="s-mapkit-enabled">Enable MapKit JS</Label>
			</div>

			{mapkitEnabled && (
				<div className="space-y-1.5">
					<Label htmlFor="s-mapkit-token">MapKit JS JWT Token</Label>
					<Input
						id="s-mapkit-token"
						value={mapkitToken}
						onChange={(e) => onMapkitTokenChange(e.target.value)}
						placeholder="eyJ..."
						className="font-mono text-xs"
						aria-invalid={!!errors.mapkitToken}
						aria-describedby={errors.mapkitToken ? "s-mapkit-token-error" : undefined}
					/>
					<FieldError id="s-mapkit-token-error" error={errors.mapkitToken} />
				</div>
			)}
		</div>
	);
}
