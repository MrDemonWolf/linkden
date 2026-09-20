"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, KeyRound, Settings2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DeviceFrame } from "@/components/admin/device-frame";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { SectionCard } from "@/components/admin/section-header";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { SigningKeysSection } from "@/components/admin/wallet/signing-keys-section";
import {
	WalletBuilderSection,
	type WalletLiveState,
} from "@/components/admin/wallet/wallet-builder-section";
import { type PassZone, WalletPassPreview } from "@/components/admin/wallet-pass-preview";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

// Server-side .pkpass signing/issuance is live: GET /api/admin/wallet-pass signs and
// serves the pass from the saved design + certs (503 if certs are missing), so
// the cert-upload flow is always shown and there is no "coming soon" state.

export default function WalletSettingsPage() {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const previewQuery = useQuery(trpc.wallet.generatePreview.queryOptions());
	const signingQuery = useQuery(trpc.wallet.getSigningStatus.queryOptions());
	const updateConfig = useMutation(trpc.wallet.updateConfig.mutationOptions());

	const [live, setLive] = useState<WalletLiveState | null>(null);
	const [highlightedZone, setHighlightedZone] = useState<PassZone | null>(null);
	const [isDirty, setIsDirty] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const saveRef = useRef<(() => Promise<void>) | null>(null);
	const resetRef = useRef<(() => void) | null>(null);

	useUnsavedChanges(isDirty);

	// Header switch: instant save (same pattern as the magic-link toggle on Account).
	const enabled = configQuery.data?.wallet_pass_enabled === "true";
	const handleToggle = async (next: boolean) => {
		try {
			await updateConfig.mutateAsync({ enabled: next });
			qc.invalidateQueries({ queryKey: trpc.wallet.getConfig.queryOptions().queryKey });
			toast.success(`Wallet pass downloads ${next ? "enabled" : "disabled"}`);
		} catch {
			toast.error("Failed to update setting");
		}
	};

	const handleSave = async () => {
		if (!saveRef.current || isSaving) return;
		setIsSaving(true);
		try {
			await saveRef.current();
		} finally {
			setIsSaving(false);
		}
	};

	// A real revert: the builder puts its own state back to the last saved row.
	// Invalidating alone left the editor showing the discarded edits, because
	// the section only seeds from the query on first load.
	const handleDiscard = () => {
		resetRef.current?.();
		qc.invalidateQueries({ queryKey: trpc.wallet.getConfig.queryOptions().queryKey });
	};

	const isConfigured = !!(
		signingQuery.data?.signerCert &&
		signingQuery.data?.signerKey &&
		signingQuery.data?.wwdrCert &&
		signingQuery.data?.teamId &&
		signingQuery.data?.passTypeId
	);

	const publicProfileUrl = typeof window !== "undefined" ? window.location.origin : undefined;

	const view = live ?? {
		templatePreset: previewQuery.data?.templatePreset ?? "contact-card",
		organizationName: previewQuery.data?.organizationName ?? "",
		passDescription: previewQuery.data?.passDescription ?? "",
		backgroundColor: previewQuery.data?.backgroundColor ?? "",
		foregroundColor: previewQuery.data?.foregroundColor ?? "",
		labelColor: previewQuery.data?.labelColor ?? "",
		logoUrl: previewQuery.data?.logoUrl ?? "",
		iconUrl: previewQuery.data?.iconUrl ?? "",
		thumbnailUrl: previewQuery.data?.thumbnailUrl ?? "",
		stripUrl: previewQuery.data?.stripUrl ?? "",
		headerFields: previewQuery.data?.headerFields ?? [],
		primaryFields: previewQuery.data?.primaryFields ?? [],
		secondaryFields: previewQuery.data?.secondaryFields ?? [],
		auxiliaryFields: previewQuery.data?.auxiliaryFields ?? [],
		backFields: previewQuery.data?.backFields ?? [],
		showQrCode: previewQuery.data?.showQrCode ?? true,
	};
	const walletPreview = (
		<DeviceFrame width={393} height="auto" previewDark>
			<div className="p-4">
				<WalletPassPreview
					backgroundColor={view.backgroundColor || undefined}
					foregroundColor={view.foregroundColor || undefined}
					labelColor={view.labelColor || undefined}
					logoUrl={view.logoUrl || undefined}
					iconUrl={view.iconUrl || undefined}
					thumbnailUrl={view.thumbnailUrl || undefined}
					stripUrl={view.stripUrl || undefined}
					organizationName={view.organizationName}
					profileImage={previewQuery.data?.profile?.image ?? undefined}
					headerFields={view.headerFields}
					primaryFields={view.primaryFields}
					secondaryFields={view.secondaryFields}
					auxiliaryFields={view.auxiliaryFields}
					backFields={view.backFields}
					qrUrl={publicProfileUrl}
					showQrCode={view.showQrCode}
					highlightedZone={highlightedZone}
				/>
			</div>
		</DeviceFrame>
	);
	usePreviewSlot({ preview: walletPreview, size: "wide" });

	return (
		<div className="space-y-6">
			{/* Sub-header: status, admin download, and availability switch. */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">Apple Wallet pass</h2>
					<Badge
						variant="outline"
						className={
							isConfigured
								? "gap-1 border-success/30 text-success"
								: "gap-1 border-warning/30 text-warning"
						}
					>
						<Settings2 className="h-3 w-3" />
						{isConfigured ? "Ready" : "Setup required"}
					</Badge>
				</div>
				<div className="flex items-center gap-3">
					{enabled && isConfigured && (
						<a href="/api/admin/wallet-pass" download className={buttonVariants({ size: "sm" })}>
							<Download className="h-4 w-4" aria-hidden="true" />
							Download pass
						</a>
					)}
					<Label htmlFor="wallet-enabled" className="text-xs text-muted-foreground">
						Downloads enabled
					</Label>
					<Switch
						id="wallet-enabled"
						checked={enabled}
						onCheckedChange={handleToggle}
						disabled={configQuery.isLoading || updateConfig.isPending}
						aria-label="Enable authenticated Wallet pass downloads"
					/>
				</div>
			</div>

			<section aria-label="Pass editor" className="rounded-2xl border border-border bg-card p-4">
				<WalletBuilderSection
					onPreviewChange={setLive}
					onZoneFocus={setHighlightedZone}
					onDirtyChange={setIsDirty}
					saveRef={saveRef}
					resetRef={resetRef}
				/>
				<p className="mt-4 text-center text-micro text-muted-foreground">
					QR code links to your public profile page
				</p>
			</section>

			<SectionCard
				icon={KeyRound}
				title="Signing keys"
				description="Apple Developer certs required to issue real .pkpass files"
			>
				<SigningKeysSection />
			</SectionCard>

			<StickySaveBar
				isDirty={isDirty}
				isSaving={isSaving}
				onSave={handleSave}
				onDiscard={handleDiscard}
			/>
		</div>
	);
}
