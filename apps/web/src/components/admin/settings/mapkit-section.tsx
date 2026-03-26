"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function MapKitSection() {
	const qc = useQueryClient();
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateBulk = useMutation(trpc.settings.updateBulk.mutationOptions());

	const [enabled, setEnabled] = useState(false);
	const [token, setToken] = useState("");
	const [savedEnabled, setSavedEnabled] = useState(false);
	const [savedToken, setSavedToken] = useState("");

	useEffect(() => {
		if (settingsQuery.data) {
			const en = settingsQuery.data.mapkit_enabled === "true";
			const tk = settingsQuery.data.mapkit_token ?? "";
			setEnabled(en);
			setToken(tk);
			setSavedEnabled(en);
			setSavedToken(tk);
		}
	}, [settingsQuery.data]);

	const isDirty = enabled !== savedEnabled || token !== savedToken;

	const handleSave = async () => {
		try {
			await updateBulk.mutateAsync([
				{ key: "mapkit_enabled", value: String(enabled) },
				{ key: "mapkit_token", value: token },
			]);
			setSavedEnabled(enabled);
			setSavedToken(token);
			qc.invalidateQueries({ queryKey: trpc.settings.getAll.queryOptions().queryKey });
			toast.success("MapKit settings saved");
		} catch {
			toast.error("Failed to save MapKit settings");
		}
	};

	if (settingsQuery.isLoading) {
		return <Skeleton className="h-16 w-full" />;
	}

	return (
		<div className="space-y-3">
			<h2 className="text-sm font-semibold">Apple MapKit JS</h2>
			<p className="text-[11px] text-muted-foreground">
				Enable MapKit JS for address autocomplete in location blocks. Requires an Apple Developer account and a MapKit JS JWT token.
			</p>

			<div className="flex items-center gap-3">
				<Switch
					checked={enabled}
					onCheckedChange={setEnabled}
					aria-label="Enable MapKit JS"
				/>
				<Label>Enable MapKit JS</Label>
			</div>

			{enabled && (
				<div className="space-y-1.5">
					<Label htmlFor="s-mapkit-token">MapKit JS JWT Token</Label>
					<Input
						id="s-mapkit-token"
						value={token}
						onChange={(e) => setToken(e.target.value)}
						placeholder="eyJ..."
						className="font-mono text-xs"
					/>
				</div>
			)}

			{isDirty && (
				<Button
					onClick={handleSave}
					disabled={updateBulk.isPending}
					size="sm"
				>
					{updateBulk.isPending ? "Saving..." : "Save MapKit Settings"}
				</Button>
			)}
		</div>
	);
}
