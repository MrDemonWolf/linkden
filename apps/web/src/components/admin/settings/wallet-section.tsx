"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "./field-group";
import { ImageUploadField } from "../image-upload-field";

function EnvironmentCheckBanner() {
	const statusQuery = useQuery(trpc.wallet.getSigningStatus.queryOptions());

	if (statusQuery.isLoading) {
		return <Skeleton className="h-16 w-full" />;
	}

	if (!statusQuery.data) return null;

	const { signerCert, signerKey, wwdrCert, teamId, passTypeId } =
		statusQuery.data;
	const allSet = signerCert && signerKey && wwdrCert && teamId && passTypeId;

	const items = [
		{ label: "Signer Certificate", ok: signerCert },
		{ label: "Signer Key", ok: signerKey },
		{ label: "WWDR Certificate", ok: wwdrCert },
		{ label: "Team ID", ok: teamId },
		{ label: "Pass Type ID", ok: passTypeId },
	];

	return (
		<div className="space-y-1.5">
			<h2 className="text-sm font-semibold">Environment Check</h2>
			<div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs">
				<div
					className={`absolute inset-y-0 left-0 w-0.5 ${allSet ? "bg-emerald-500" : "bg-amber-400"}`}
				/>
				<div className="flex flex-wrap gap-x-4 gap-y-1 pl-1.5">
					{items.map((item) => (
						<span key={item.label} className="inline-flex items-center gap-1">
							{item.ok ? (
								<CheckCircle2 className="h-3 w-3 text-emerald-500" />
							) : (
								<CircleAlert className="h-3 w-3 text-amber-400" />
							)}
							<span className="text-muted-foreground">{item.label}</span>
						</span>
					))}
				</div>
				{!allSet && (
					<p className="mt-1.5 pl-1.5 text-[11px] leading-relaxed text-muted-foreground">
						Set missing values as environment variables to enable the Add to
						Apple Wallet button. See the docs for setup instructions.
					</p>
				)}
			</div>
		</div>
	);
}

export interface WalletLivePreview {
	backgroundColor: string;
	foregroundColor: string;
	labelColor: string;
	logoUrl: string;
	organizationName: string;
	passDescription: string;
	showEmail: boolean;
	showName: boolean;
	showQrCode: boolean;
}

interface WalletSectionProps {
	onPreviewChange?: (state: WalletLivePreview) => void;
	onDirtyChange?: (dirty: boolean) => void;
	saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export function WalletSection({
	onPreviewChange,
	onDirtyChange,
	saveRef,
}: WalletSectionProps) {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const updateConfig = useMutation(trpc.wallet.updateConfig.mutationOptions());

	const [showEmail, setShowEmail] = useState(true);
	const [showName, setShowName] = useState(true);
	const [showQrCode, setShowQrCode] = useState(true);
	const [organizationName, setOrganizationName] = useState("");
	const [passDescription, setPassDescription] = useState("");
	const [backgroundColor, setBackgroundColor] = useState("");
	const [foregroundColor, setForegroundColor] = useState("");
	const [labelColor, setLabelColor] = useState("");
	const [logoUrl, setLogoUrl] = useState("");

	const [savedShowEmail, setSavedShowEmail] = useState(true);
	const [savedShowName, setSavedShowName] = useState(true);
	const [savedShowQrCode, setSavedShowQrCode] = useState(true);
	const [savedOrganizationName, setSavedOrganizationName] = useState("");
	const [savedPassDescription, setSavedPassDescription] = useState("");
	const [savedBackgroundColor, setSavedBackgroundColor] = useState("");
	const [savedForegroundColor, setSavedForegroundColor] = useState("");
	const [savedLabelColor, setSavedLabelColor] = useState("");
	const [savedLogoUrl, setSavedLogoUrl] = useState("");

	useEffect(() => {
		if (configQuery.data) {
			const d = configQuery.data;
			const se = d.wallet_show_email !== "false";
			const sn = d.wallet_show_name !== "false";
			const sq = d.wallet_show_qr_code !== "false";
			const on = d.wallet_organization_name ?? "";
			const pd = d.wallet_pass_description ?? "";
			const bg = d.wallet_background_color ?? "";
			const fg = d.wallet_foreground_color ?? "";
			const lc = d.wallet_label_color ?? "";
			const lu = d.wallet_logo_url ?? "";
			setShowEmail(se);
			setShowName(sn);
			setShowQrCode(sq);
			setOrganizationName(on);
			setPassDescription(pd);
			setBackgroundColor(bg);
			setForegroundColor(fg);
			setLabelColor(lc);
			setLogoUrl(lu);
			setSavedShowEmail(se);
			setSavedShowName(sn);
			setSavedShowQrCode(sq);
			setSavedOrganizationName(on);
			setSavedPassDescription(pd);
			setSavedBackgroundColor(bg);
			setSavedForegroundColor(fg);
			setSavedLabelColor(lc);
			setSavedLogoUrl(lu);
		}
	}, [configQuery.data]);

	const isDirty =
		showEmail !== savedShowEmail ||
		showName !== savedShowName ||
		showQrCode !== savedShowQrCode ||
		organizationName !== savedOrganizationName ||
		passDescription !== savedPassDescription ||
		backgroundColor !== savedBackgroundColor ||
		foregroundColor !== savedForegroundColor ||
		labelColor !== savedLabelColor ||
		logoUrl !== savedLogoUrl;

	useEffect(() => {
		onPreviewChange?.({
			backgroundColor,
			foregroundColor,
			labelColor,
			logoUrl,
			organizationName,
			passDescription,
			showEmail,
			showName,
			showQrCode,
		});
	}, [
		backgroundColor,
		foregroundColor,
		labelColor,
		logoUrl,
		organizationName,
		passDescription,
		showEmail,
		showName,
		showQrCode,
		onPreviewChange,
	]);

	useEffect(() => {
		onDirtyChange?.(isDirty);
	}, [isDirty, onDirtyChange]);

	const handleSave = useCallback(async () => {
		try {
			await updateConfig.mutateAsync({
				showEmail,
				showName,
				showQrCode,
				organizationName,
				passDescription,
				backgroundColor,
				foregroundColor,
				labelColor,
				logoUrl,
			});
			setSavedShowEmail(showEmail);
			setSavedShowName(showName);
			setSavedShowQrCode(showQrCode);
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
	}, [
		updateConfig,
		showEmail,
		showName,
		showQrCode,
		organizationName,
		passDescription,
		backgroundColor,
		foregroundColor,
		labelColor,
		logoUrl,
		qc,
	]);

	useEffect(() => {
		if (saveRef) saveRef.current = handleSave;
	}, [saveRef, handleSave]);

	if (configQuery.isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-8 w-full" />
				<Skeleton className="h-8 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<EnvironmentCheckBanner />

			{/* Pass Details */}
			<div className="space-y-3">
				<h2 className="text-sm font-semibold">Pass Details</h2>
				<FieldGroup columns={2}>
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

			{/* Appearance & Branding */}
			<div className="space-y-3">
				<h2 className="text-sm font-semibold">Appearance & Branding</h2>
				<div className="grid gap-4 lg:grid-cols-[3fr_2fr_2fr]">
					{/* Colors */}
					<div className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="s-wallet-bg-color">Background Color</Label>
							<div className="flex gap-2">
								<Input
									id="s-wallet-bg-color"
									value={backgroundColor}
									onChange={(e) => setBackgroundColor(e.target.value)}
									placeholder="#091533"
									className="flex-1"
								/>
								<input
									type="color"
									value={backgroundColor || "#091533"}
									onChange={(e) =>
										setBackgroundColor(e.target.value.toUpperCase())
									}
									className="h-8 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
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
									placeholder="#FFFFFF"
									className="flex-1"
								/>
								<input
									type="color"
									value={foregroundColor || "#FFFFFF"}
									onChange={(e) =>
										setForegroundColor(e.target.value.toUpperCase())
									}
									className="h-8 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
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
									placeholder="#0FACED"
									className="flex-1"
								/>
								<input
									type="color"
									value={labelColor || "#0FACED"}
									onChange={(e) =>
										setLabelColor(e.target.value.toUpperCase())
									}
									className="h-8 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-none"
								/>
							</div>
						</div>
					</div>

					{/* Toggles */}
					<div className="space-y-3">
						<Label>Pass Fields</Label>
						<div className="flex items-center gap-3">
							<Switch
								checked={showEmail}
								onCheckedChange={setShowEmail}
								aria-label="Show email on pass"
							/>
							<div className="space-y-0.5">
								<Label>Show Email</Label>
								<p className="text-[11px] text-muted-foreground">
									Display email on the pass
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Switch
								checked={showName}
								onCheckedChange={setShowName}
								aria-label="Show name on pass"
							/>
							<div className="space-y-0.5">
								<Label>Show Name</Label>
								<p className="text-[11px] text-muted-foreground">
									Display name on the pass
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Switch
								checked={showQrCode}
								onCheckedChange={setShowQrCode}
								aria-label="Show QR code on pass"
							/>
							<div className="space-y-0.5">
								<Label>Show QR Code</Label>
								<p className="text-[11px] text-muted-foreground">
									Display QR code on the pass
								</p>
							</div>
						</div>
					</div>

					{/* Logo */}
					<div className="space-y-1.5 [&>div]:items-start">
						<Label>Logo Image</Label>
						<ImageUploadField
							purpose="wallet_logo"
							value={logoUrl}
							onUploadComplete={setLogoUrl}
							aspectRatio="logo"
						/>
					</div>
				</div>
			</div>

		</div>
	);
}
