"use client";

import { Info } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSettingsForm } from "@/hooks/use-settings-form";

interface MapKitState {
	enabled: boolean;
	token: string;
}

export function MapKitSection() {
	const form = useSettingsForm<MapKitState>({
		parse: useCallback(
			(d) => ({ enabled: d.mapkit_enabled === "true", token: d.mapkit_token ?? "" }),
			[],
		),
		serialize: useCallback(
			(s) => [
				{ key: "mapkit_enabled", value: String(s.enabled) },
				{ key: "mapkit_token", value: s.token },
			],
			[],
		),
		successMessage: "MapKit settings saved",
		errorMessage: "Failed to save MapKit settings",
	});

	if (form.isLoading || !form.state) {
		return <Skeleton className="h-16 w-full" />;
	}

	const { state, setState } = form;

	return (
		<div className="space-y-3">
			<div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
				<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<p className="text-[11px] text-muted-foreground">
					Not yet functional — Location blocks currently use map links and don&apos;t require a
					token.
				</p>
			</div>

			<p className="text-[11px] text-muted-foreground">
				Requires an Apple Developer account and a MapKit JS JWT token.
			</p>

			<div className="flex items-center gap-3">
				<Switch
					checked={state.enabled}
					onCheckedChange={(enabled) => setState({ ...state, enabled })}
					aria-label="Enable MapKit JS"
				/>
				<Label>Enable MapKit JS</Label>
			</div>

			{state.enabled && (
				<div className="space-y-1.5">
					<Label htmlFor="s-mapkit-token">MapKit JS JWT Token</Label>
					<Input
						id="s-mapkit-token"
						value={state.token}
						onChange={(e) => setState({ ...state, token: e.target.value })}
						placeholder="eyJ..."
						className="font-mono text-xs"
					/>
				</div>
			)}

			{form.isDirty && (
				<Button onClick={form.save} disabled={form.isSaving} size="sm">
					{form.isSaving ? "Saving..." : "Save MapKit Settings"}
				</Button>
			)}
		</div>
	);
}
