"use client";

import { useState, useRef } from "react";
import { Settings2, Save, Undo2, Info, Smartphone, CreditCard, KeyRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { DeviceFrame } from "@/components/admin/device-frame";
import { WalletPassPreview, type PassZone } from "@/components/admin/wallet-pass-preview";
import {
	WalletBuilderSection,
	type WalletLiveState,
} from "@/components/admin/wallet/wallet-builder-section";
import { SigningKeysSection } from "@/components/admin/wallet/signing-keys-section";

// Server-side .pkpass signing/issuance is not wired up yet. Until it ships, the
// builder is a design surface only — so we hide the cert-upload flow and mark
// the page as "Preview only". Flip this to true when issuance lands.
const WALLET_ISSUANCE_ENABLED: boolean = false;

export default function WalletPage() {
	const qc = useQueryClient();
	const previewQuery = useQuery(trpc.wallet.generatePreview.queryOptions());
	const signingQuery = useQuery(trpc.wallet.getSigningStatus.queryOptions());

	const [live, setLive] = useState<WalletLiveState | null>(null);
	const [highlightedZone, setHighlightedZone] = useState<PassZone | null>(null);
	const [isDirty, setIsDirty] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const saveRef = useRef<(() => Promise<void>) | null>(null);

	useUnsavedChanges(isDirty);

	const handleSave = async () => {
		if (!saveRef.current) return;
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
		<div className="space-y-6 duration-300 animate-in fade-in-0 slide-in-from-bottom-2 ease-out">
			<PageHeader
				title="Wallet Pass"
				description={
					isDirty
						? "You have unsaved changes"
						: "Design an Apple Wallet pass — pass.mk-style builder"
				}
				badge={
					WALLET_ISSUANCE_ENABLED ? (
						<Badge
							variant="outline"
							className={
								isConfigured
									? "gap-1 border-success/30 text-success"
									: "gap-1 border-warning/30 text-warning"
							}
						>
							<Settings2 className="h-3 w-3" />
							{isConfigured ? "Ready" : "Setup Required"}
						</Badge>
					) : (
						<Badge variant="outline" className="gap-1 border-border text-muted-foreground">
							<Info className="h-3 w-3" />
							Preview only
						</Badge>
					)
				}
				actions={
					<>
						{isDirty && (
							<Button variant="ghost" size="sm" onClick={handleDiscard}>
								<Undo2 className="mr-1.5 h-3.5 w-3.5" />
								Discard
							</Button>
						)}
						<Button
							size="sm"
							variant={isDirty ? "default" : "outline"}
							disabled={!isDirty || isSaving}
							onClick={handleSave}
						>
							<Save className="mr-1.5 h-3.5 w-3.5" />
							{isSaving ? "Saving…" : "Save changes"}
						</Button>
					</>
				}
			/>

			<div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
				{/* Left: Builder */}
				<div className="space-y-6">
					{/* Preview-only notice */}
					<div className="relative overflow-hidden rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5">
						<div className="absolute inset-y-0 left-0 w-0.5 bg-warning" />
						<div className="flex items-start gap-2.5 pl-1.5">
							<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
							<p className="text-xs leading-relaxed text-muted-foreground">
								<span className="font-medium text-foreground">Preview only.</span> Issuing a signed{" "}
								<span className="font-mono">.pkpass</span> is coming soon. The design you save here
								is stored and ready — you&apos;ll be able to issue passes from this page once the
								signing endpoint ships.
							</p>
						</div>
					</div>

					<SectionCard
						icon={CreditCard}
						title="Pass Builder"
						description="Template, identity, images, colors, and field zones"
					>
						<WalletBuilderSection
							onPreviewChange={setLive}
							onZoneFocus={setHighlightedZone}
							onDirtyChange={setIsDirty}
							saveRef={saveRef}
						/>
					</SectionCard>

					{/* Signing keys / cert upload — hidden until issuance is wired up */}
					{WALLET_ISSUANCE_ENABLED && (
						<SectionCard
							icon={KeyRound}
							title="Signing Keys"
							description="Apple Developer certs required to issue real .pkpass files"
						>
							<SigningKeysSection />
						</SectionCard>
					)}
				</div>

				{/* Right: Sticky preview */}
				<div className="lg:sticky lg:top-20">
					<SectionCard
						icon={Smartphone}
						title="Live Preview"
						description="Focus a field to highlight its zone"
					>
						<div className="flex justify-center py-2">
							<DeviceFrame width={300} height="auto" previewDark>
								<div className="px-3 pb-4 pt-1">
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

						<p className="mt-2 text-center text-[11px] text-muted-foreground">
							QR code links to your public profile page
						</p>
					</SectionCard>
				</div>
			</div>
		</div>
	);
}
