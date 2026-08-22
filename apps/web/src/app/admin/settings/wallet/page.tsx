"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Settings2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DeviceFrame } from "@/components/admin/device-frame";
import { SectionCard } from "@/components/admin/section-header";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { SigningKeysSection } from "@/components/admin/wallet/signing-keys-section";
import {
	WalletBuilderSection,
	type WalletLiveState,
} from "@/components/admin/wallet/wallet-builder-section";
import { type PassZone, WalletPassPreview } from "@/components/admin/wallet-pass-preview";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

// Server-side .pkpass signing/issuance is live: GET /api/wallet-pass signs and
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

	useUnsavedChanges(isDirty);

	// Header switch: instant save (same pattern as the magic-link toggle on Account).
	const enabled = configQuery.data?.wallet_pass_enabled === "true";
	const handleToggle = async (next: boolean) => {
		try {
			await updateConfig.mutateAsync({ enabled: next });
			qc.invalidateQueries({ queryKey: trpc.wallet.getConfig.queryOptions().queryKey });
			toast.success(`Wallet pass button ${next ? "shown" : "hidden"} on your page`);
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

	const handleDiscard = () => {
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

	return (
		<div className="space-y-6">
			{/* Sub-header: status + the one switch that puts the button on the public page */}
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
					<Label htmlFor="wallet-enabled" className="text-xs text-muted-foreground">
						Show on page
					</Label>
					<Switch
						id="wallet-enabled"
						checked={enabled}
						onCheckedChange={handleToggle}
						disabled={configQuery.isLoading || updateConfig.isPending}
						aria-label="Show the Add to Apple Wallet button on the public page"
					/>
				</div>
			</div>

			{/* Below lg: centered stack, the editor sheet overlaps the frame bottom.
			    lg+: two columns — sticky preview left, editor right. */}
			<div className="mx-auto w-full max-w-[420px] lg:flex lg:max-w-none lg:items-start lg:gap-6">
				<div className="flex justify-center lg:sticky lg:top-[calc(52px+1.5rem)] lg:shrink-0">
					<DeviceFrame width={300} height="auto" previewDark>
						{/* pb-14 leaves room for the overlapping sheet; no overlap at lg+ */}
						<div className="px-3 pb-14 pt-1 lg:pb-4">
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
				</div>

				<section
					aria-label="Pass editor"
					className="relative z-10 -mt-10 rounded-t-3xl border border-b-0 border-border bg-card px-4 pb-2 pt-2 lg:mt-0 lg:min-w-0 lg:flex-1 lg:rounded-2xl lg:border-b lg:pb-4 lg:pt-4"
				>
					{/* Grabber */}
					<span
						aria-hidden="true"
						className="mx-auto mb-3 block h-1 w-9 rounded-full bg-border lg:hidden"
					/>
					<WalletBuilderSection
						onPreviewChange={setLive}
						onZoneFocus={setHighlightedZone}
						onDirtyChange={setIsDirty}
						saveRef={saveRef}
					/>
					<p className="mt-4 pb-1 text-center text-micro text-muted-foreground">
						QR code links to your public profile page
					</p>
				</section>
			</div>

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
