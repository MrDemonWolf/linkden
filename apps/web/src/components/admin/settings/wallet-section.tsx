"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "./field-group";

function SigningStatusBanner() {
	const statusQuery = useQuery(trpc.wallet.getSigningStatus.queryOptions());

	if (statusQuery.isLoading) {
		return <Skeleton className="h-16 w-full" />;
	}

	if (!statusQuery.data) return null;

	const { signerCert, signerKey, wwdrCert } = statusQuery.data;
	const allSet = signerCert && signerKey && wwdrCert;

	const items = [
		{ label: "Signer Certificate", ok: signerCert },
		{ label: "Signer Key", ok: signerKey },
		{ label: "WWDR Certificate", ok: wwdrCert },
	];

	return (
		<div className="space-y-1.5">
			<Label>Signing Status</Label>
			<div
				className={`rounded-md border px-3 py-2.5 text-xs ${
					allSet
						? "border-emerald-500/30 bg-emerald-500/5"
						: "border-amber-500/30 bg-amber-500/5"
				}`}
			>
				<div className="flex flex-wrap gap-x-4 gap-y-1">
					{items.map((item) => (
						<span key={item.label} className="inline-flex items-center gap-1">
							{item.ok ? (
								<CheckCircle2 className="h-3 w-3 text-emerald-500" />
							) : (
								<XCircle className="h-3 w-3 text-red-500" />
							)}
							<span className="text-muted-foreground">{item.label}</span>
						</span>
					))}
				</div>
				{!allSet && (
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						Set signing certificates as environment variables. See the docs for
						setup instructions.
					</p>
				)}
			</div>
		</div>
	);
}

export function WalletSection() {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const updateConfig = useMutation(trpc.wallet.updateConfig.mutationOptions());

	const [enabled, setEnabled] = useState(false);
	const [teamId, setTeamId] = useState("");
	const [passTypeId, setPassTypeId] = useState("");
	const [customQrUrl, setCustomQrUrl] = useState("");
	const [organizationName, setOrganizationName] = useState("");
	const [passDescription, setPassDescription] = useState("");
	const [backgroundColor, setBackgroundColor] = useState("");
	const [foregroundColor, setForegroundColor] = useState("");
	const [labelColor, setLabelColor] = useState("");
	const [logoUrl, setLogoUrl] = useState("");

	const [savedEnabled, setSavedEnabled] = useState(false);
	const [savedTeamId, setSavedTeamId] = useState("");
	const [savedPassTypeId, setSavedPassTypeId] = useState("");
	const [savedCustomQrUrl, setSavedCustomQrUrl] = useState("");
	const [savedOrganizationName, setSavedOrganizationName] = useState("");
	const [savedPassDescription, setSavedPassDescription] = useState("");
	const [savedBackgroundColor, setSavedBackgroundColor] = useState("");
	const [savedForegroundColor, setSavedForegroundColor] = useState("");
	const [savedLabelColor, setSavedLabelColor] = useState("");
	const [savedLogoUrl, setSavedLogoUrl] = useState("");

	useEffect(() => {
		if (configQuery.data) {
			const d = configQuery.data;
			const e = d.wallet_pass_enabled === "true";
			const t = d.wallet_team_id ?? "";
			const p = d.wallet_pass_type_id ?? "";
			const q = d.wallet_custom_qr_url ?? "";
			const on = d.wallet_organization_name ?? "";
			const pd = d.wallet_pass_description ?? "";
			const bg = d.wallet_background_color ?? "";
			const fg = d.wallet_foreground_color ?? "";
			const lc = d.wallet_label_color ?? "";
			const lu = d.wallet_logo_url ?? "";
			setEnabled(e);
			setTeamId(t);
			setPassTypeId(p);
			setCustomQrUrl(q);
			setOrganizationName(on);
			setPassDescription(pd);
			setBackgroundColor(bg);
			setForegroundColor(fg);
			setLabelColor(lc);
			setLogoUrl(lu);
			setSavedEnabled(e);
			setSavedTeamId(t);
			setSavedPassTypeId(p);
			setSavedCustomQrUrl(q);
			setSavedOrganizationName(on);
			setSavedPassDescription(pd);
			setSavedBackgroundColor(bg);
			setSavedForegroundColor(fg);
			setSavedLabelColor(lc);
			setSavedLogoUrl(lu);
		}
	}, [configQuery.data]);

	const isDirty =
		enabled !== savedEnabled ||
		teamId !== savedTeamId ||
		passTypeId !== savedPassTypeId ||
		customQrUrl !== savedCustomQrUrl ||
		organizationName !== savedOrganizationName ||
		passDescription !== savedPassDescription ||
		backgroundColor !== savedBackgroundColor ||
		foregroundColor !== savedForegroundColor ||
		labelColor !== savedLabelColor ||
		logoUrl !== savedLogoUrl;

	const handleSave = async () => {
		try {
			await updateConfig.mutateAsync({
				enabled,
				teamId,
				passTypeId,
				customQrUrl,
				organizationName,
				passDescription,
				backgroundColor,
				foregroundColor,
				labelColor,
				logoUrl,
			});
			setSavedEnabled(enabled);
			setSavedTeamId(teamId);
			setSavedPassTypeId(passTypeId);
			setSavedCustomQrUrl(customQrUrl);
			setSavedOrganizationName(organizationName);
			setSavedPassDescription(passDescription);
			setSavedBackgroundColor(backgroundColor);
			setSavedForegroundColor(foregroundColor);
			setSavedLabelColor(labelColor);
			setSavedLogoUrl(logoUrl);
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
				<>
					{/* Signing Status */}
					<SigningStatusBanner />

					{/* Identity */}
					<div className="space-y-1.5">
						<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Identity
						</Label>
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
							<div className="space-y-1.5">
								<Label htmlFor="s-wallet-org-name">Organization Name</Label>
								<Input
									id="s-wallet-org-name"
									value={organizationName}
									onChange={(e) => setOrganizationName(e.target.value)}
									placeholder="Your Company"
									maxLength={100}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-wallet-pass-desc">Pass Description</Label>
								<Input
									id="s-wallet-pass-desc"
									value={passDescription}
									onChange={(e) => setPassDescription(e.target.value)}
									placeholder="Contact card for John Doe"
									maxLength={200}
								/>
							</div>
						</FieldGroup>
					</div>

					{/* Appearance */}
					<div className="space-y-1.5">
						<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Appearance
						</Label>
						<FieldGroup columns={2}>
							<div className="space-y-1.5">
								<Label htmlFor="s-wallet-bg-color">Background Color</Label>
								<div className="flex gap-2">
									<Input
										id="s-wallet-bg-color"
										value={backgroundColor}
										onChange={(e) => setBackgroundColor(e.target.value)}
										placeholder="#FFFFFF"
										className="flex-1"
									/>
									<input
										type="color"
										value={backgroundColor || "#ffffff"}
										onChange={(e) => setBackgroundColor(e.target.value.toUpperCase())}
										className="h-8 w-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-wallet-fg-color">Foreground Color</Label>
								<div className="flex gap-2">
									<Input
										id="s-wallet-fg-color"
										value={foregroundColor}
										onChange={(e) => setForegroundColor(e.target.value)}
										placeholder="#000000"
										className="flex-1"
									/>
									<input
										type="color"
										value={foregroundColor || "#000000"}
										onChange={(e) => setForegroundColor(e.target.value.toUpperCase())}
										className="h-8 w-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-wallet-label-color">Label Color</Label>
								<div className="flex gap-2">
									<Input
										id="s-wallet-label-color"
										value={labelColor}
										onChange={(e) => setLabelColor(e.target.value)}
										placeholder="#666666"
										className="flex-1"
									/>
									<input
										type="color"
										value={labelColor || "#666666"}
										onChange={(e) => setLabelColor(e.target.value.toUpperCase())}
										className="h-8 w-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-wallet-logo-url">Logo URL</Label>
								<Input
									id="s-wallet-logo-url"
									value={logoUrl}
									onChange={(e) => setLogoUrl(e.target.value)}
									placeholder="https://example.com/logo.png"
								/>
							</div>
						</FieldGroup>
						<div className="mt-3 space-y-1.5">
							<Label htmlFor="s-wallet-qr">Custom QR URL</Label>
							<Input
								id="s-wallet-qr"
								value={customQrUrl}
								onChange={(e) => setCustomQrUrl(e.target.value)}
								placeholder="https://yoursite.com"
							/>
							<p className="text-[11px] text-muted-foreground">
								URL encoded in the pass QR code. Leave empty to use your page
								URL.
							</p>
						</div>
					</div>
				</>
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
