"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "./field-group";

export function WalletSection() {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const updateConfig = useMutation(trpc.wallet.updateConfig.mutationOptions());

	const [enabled, setEnabled] = useState(false);
	const [teamId, setTeamId] = useState("");
	const [passTypeId, setPassTypeId] = useState("");
	const [customQrUrl, setCustomQrUrl] = useState("");

	const [savedEnabled, setSavedEnabled] = useState(false);
	const [savedTeamId, setSavedTeamId] = useState("");
	const [savedPassTypeId, setSavedPassTypeId] = useState("");
	const [savedCustomQrUrl, setSavedCustomQrUrl] = useState("");

	useEffect(() => {
		if (configQuery.data) {
			const d = configQuery.data;
			const e = d.wallet_pass_enabled === "true";
			const t = d.wallet_team_id ?? "";
			const p = d.wallet_pass_type_id ?? "";
			const q = d.wallet_custom_qr_url ?? "";
			setEnabled(e);
			setTeamId(t);
			setPassTypeId(p);
			setCustomQrUrl(q);
			setSavedEnabled(e);
			setSavedTeamId(t);
			setSavedPassTypeId(p);
			setSavedCustomQrUrl(q);
		}
	}, [configQuery.data]);

	const isDirty =
		enabled !== savedEnabled ||
		teamId !== savedTeamId ||
		passTypeId !== savedPassTypeId ||
		customQrUrl !== savedCustomQrUrl;

	const handleSave = async () => {
		try {
			await updateConfig.mutateAsync({
				enabled,
				teamId,
				passTypeId,
				customQrUrl,
			});
			setSavedEnabled(enabled);
			setSavedTeamId(teamId);
			setSavedPassTypeId(passTypeId);
			setSavedCustomQrUrl(customQrUrl);
			qc.invalidateQueries({
				queryKey: trpc.wallet.getConfig.queryOptions().queryKey,
			});
			toast.success("Wallet Pass settings saved");
		} catch {
			toast.error("Failed to save Wallet Pass settings");
		}
	};

	if (configQuery.isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-8 w-full" />
				<Skeleton className="h-8 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Enable Wallet Pass</Label>
					<p className="text-[11px] text-muted-foreground">
						Generate Apple/Google Wallet passes for your page
					</p>
				</div>
				<Switch
					checked={enabled}
					onCheckedChange={setEnabled}
					aria-label="Enable wallet pass"
				/>
			</div>

			{enabled && (
				<FieldGroup columns={2}>
					<div className="space-y-1.5">
						<Label htmlFor="s-wallet-team">Team ID</Label>
						<Input
							id="s-wallet-team"
							value={teamId}
							onChange={(e) => setTeamId(e.target.value)}
							placeholder="ABCDEF1234"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="s-wallet-pass-type">Pass Type ID</Label>
						<Input
							id="s-wallet-pass-type"
							value={passTypeId}
							onChange={(e) => setPassTypeId(e.target.value)}
							placeholder="pass.com.example.linkden"
						/>
					</div>
				</FieldGroup>
			)}

			{enabled && (
				<div className="space-y-1.5">
					<Label htmlFor="s-wallet-qr">Custom QR URL</Label>
					<Input
						id="s-wallet-qr"
						value={customQrUrl}
						onChange={(e) => setCustomQrUrl(e.target.value)}
						placeholder="https://yoursite.com"
					/>
					<p className="text-[11px] text-muted-foreground">
						URL encoded in the pass QR code. Leave empty to use your page URL.
					</p>
				</div>
			)}

			{isDirty && (
				<Button
					size="sm"
					onClick={handleSave}
					disabled={updateConfig.isPending}
				>
					<Save className="mr-1.5 h-3.5 w-3.5" />
					{updateConfig.isPending ? "Saving..." : "Save Wallet Settings"}
				</Button>
			)}
		</div>
	);
}
