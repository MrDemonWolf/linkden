"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, Upload } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "./field-group";
import { ImageUploadField } from "../image-upload-field";

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// Remove data URL prefix to get pure base64
			const base64 = result.includes(",") ? result.split(",")[1] : result;
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function CertFileInput({
	label,
	hasValue,
	onFileSelect,
	onPaste,
	accept,
}: {
	label: string;
	hasValue: boolean;
	onFileSelect: (base64: string) => void;
	onPaste: (value: string) => void;
	accept: string;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [showPaste, setShowPaste] = useState(false);
	const [pasteValue, setPasteValue] = useState("");

	return (
		<div className="space-y-1.5">
			<div className="flex items-center gap-2">
				<Label>{label}</Label>
				{hasValue ? (
					<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
				) : (
					<CircleAlert className="h-3.5 w-3.5 text-amber-400" />
				)}
			</div>
			<div className="flex gap-2">
				<input
					ref={fileRef}
					type="file"
					accept={accept}
					className="hidden"
					onChange={async (e) => {
						const file = e.target.files?.[0];
						if (!file) return;
						const base64 = await fileToBase64(file);
						onFileSelect(base64);
					}}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="flex-1"
					onClick={() => fileRef.current?.click()}
				>
					<Upload className="mr-1.5 h-3.5 w-3.5" />
					{hasValue ? "Replace file" : "Upload file"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => setShowPaste(!showPaste)}
				>
					Paste
				</Button>
			</div>
			{showPaste && (
				<div className="space-y-1.5">
					<textarea
						value={pasteValue}
						onChange={(e) => setPasteValue(e.target.value)}
						placeholder="Paste PEM content here..."
						rows={4}
						className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
					/>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => {
							const base64 = btoa(pasteValue);
							onPaste(base64);
							setShowPaste(false);
							setPasteValue("");
						}}
					>
						Apply
					</Button>
				</div>
			)}
		</div>
	);
}

function SigningKeysSection() {
	const qc = useQueryClient();
	const keysQuery = useQuery(trpc.wallet.getSigningKeys.queryOptions());
	const statusQuery = useQuery(trpc.wallet.getSigningStatus.queryOptions());
	const updateKeys = useMutation(trpc.wallet.updateSigningKeys.mutationOptions());

	const [teamId, setTeamId] = useState("");
	const [passTypeId, setPassTypeId] = useState("");
	const [signerCert, setSignerCert] = useState<string | undefined>();
	const [signerKey, setSignerKey] = useState<string | undefined>();
	const [wwdrCert, setWwdrCert] = useState<string | undefined>();
	const [savedTeamId, setSavedTeamId] = useState("");
	const [savedPassTypeId, setSavedPassTypeId] = useState("");

	useEffect(() => {
		if (keysQuery.data) {
			setTeamId(keysQuery.data.teamId);
			setPassTypeId(keysQuery.data.passTypeId);
			setSavedTeamId(keysQuery.data.teamId);
			setSavedPassTypeId(keysQuery.data.passTypeId);
		}
	}, [keysQuery.data]);

	const isDirty =
		teamId !== savedTeamId ||
		passTypeId !== savedPassTypeId ||
		signerCert !== undefined ||
		signerKey !== undefined ||
		wwdrCert !== undefined;

	const handleSaveKeys = async () => {
		try {
			await updateKeys.mutateAsync({
				teamId,
				passTypeId,
				signerCert,
				signerKey,
				wwdrCert,
			});
			setSavedTeamId(teamId);
			setSavedPassTypeId(passTypeId);
			setSignerCert(undefined);
			setSignerKey(undefined);
			setWwdrCert(undefined);
			qc.invalidateQueries({ queryKey: trpc.wallet.getSigningKeys.queryOptions().queryKey });
			qc.invalidateQueries({ queryKey: trpc.wallet.getSigningStatus.queryOptions().queryKey });
			toast.success("Signing keys saved");
		} catch {
			toast.error("Failed to save signing keys");
		}
	};

	if (keysQuery.isLoading) {
		return <Skeleton className="h-24 w-full" />;
	}

	const status = statusQuery.data;
	const allSet = status?.signerCert && status?.signerKey && status?.wwdrCert && status?.teamId && status?.passTypeId;

	return (
		<div className="space-y-3">
			<h2 className="text-sm font-semibold">Signing Keys</h2>

			{/* Status banner */}
			<div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs">
				<div className={`absolute inset-y-0 left-0 w-0.5 ${allSet ? "bg-emerald-500" : "bg-amber-400"}`} />
				<div className="flex flex-wrap gap-x-4 gap-y-1 pl-1.5">
					{[
						{ label: "Signer Certificate", ok: status?.signerCert, src: status?.source?.signerCert },
						{ label: "Signer Key", ok: status?.signerKey, src: status?.source?.signerKey },
						{ label: "WWDR Certificate", ok: status?.wwdrCert, src: status?.source?.wwdrCert },
						{ label: "Team ID", ok: status?.teamId, src: status?.source?.teamId },
						{ label: "Pass Type ID", ok: status?.passTypeId, src: status?.source?.passTypeId },
					].map((item) => (
						<span key={item.label} className="inline-flex items-center gap-1">
							{item.ok ? (
								<CheckCircle2 className="h-3 w-3 text-emerald-500" />
							) : (
								<CircleAlert className="h-3 w-3 text-amber-400" />
							)}
							<span className="text-muted-foreground">
								{item.label}
								{item.src && item.src !== "missing" && (
									<span className="ml-0.5 text-[10px] opacity-60">({item.src})</span>
								)}
							</span>
						</span>
					))}
				</div>
				{!allSet && (
					<p className="mt-1.5 pl-1.5 text-[11px] leading-relaxed text-muted-foreground">
						Upload signing keys below or set them as environment variables.
					</p>
				)}
			</div>

			<FieldGroup columns={2}>
				<div className="space-y-1.5">
					<Label htmlFor="s-wallet-team-id">Team ID</Label>
					<Input
						id="s-wallet-team-id"
						value={teamId}
						onChange={(e) => setTeamId(e.target.value)}
						placeholder="ABC123DEF4"
						maxLength={20}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="s-wallet-pass-type-id">Pass Type ID</Label>
					<Input
						id="s-wallet-pass-type-id"
						value={passTypeId}
						onChange={(e) => setPassTypeId(e.target.value)}
						placeholder="pass.com.example.linkden"
						maxLength={100}
					/>
				</div>
			</FieldGroup>

			<CertFileInput
				label="Signer Certificate"
				hasValue={!!keysQuery.data?.hasSignerCert || signerCert !== undefined}
				onFileSelect={setSignerCert}
				onPaste={setSignerCert}
				accept=".pem,.cer,.crt"
			/>
			<CertFileInput
				label="Signer Key"
				hasValue={!!keysQuery.data?.hasSignerKey || signerKey !== undefined}
				onFileSelect={setSignerKey}
				onPaste={setSignerKey}
				accept=".pem,.key,.p12"
			/>
			<CertFileInput
				label="WWDR Certificate"
				hasValue={!!keysQuery.data?.hasWwdrCert || wwdrCert !== undefined}
				onFileSelect={setWwdrCert}
				onPaste={setWwdrCert}
				accept=".pem,.cer,.crt"
			/>

			{isDirty && (
				<Button
					onClick={handleSaveKeys}
					disabled={updateKeys.isPending}
					className="w-full"
				>
					{updateKeys.isPending ? "Saving..." : "Save Signing Keys"}
				</Button>
			)}
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
			<SigningKeysSection />

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
