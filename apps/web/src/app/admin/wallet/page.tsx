"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Save, Settings2, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { DeviceFrame } from "@/components/admin/device-frame";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { SectionCard } from "@/components/admin/section-header";
import { SigningKeysSection } from "@/components/admin/wallet/signing-keys-section";
import {
	WalletBuilderSection,
	type WalletLiveState,
} from "@/components/admin/wallet/wallet-builder-section";
import { type PassZone, WalletPassPreview } from "@/components/admin/wallet-pass-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

// Server-side .pkpass signing/issuance is live: GET /api/wallet-pass signs and
// serves the pass from the saved design + certs (503 if certs are missing), so
// the cert-upload flow is always shown and there is no "coming soon" state.

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

	const panelRef = useRef<HTMLElement>(null);

	const handleSave = async () => {
		if (!saveRef.current || isSaving) return;
		setIsSaving(true);
		try {
			await saveRef.current();
		} finally {
			setIsSaving(false);
			// The sheet's Save chip unmounts once the state is clean; if the
			// focused element was removed, land focus on the panel instead of body.
			requestAnimationFrame(() => {
				if (document.activeElement === document.body) panelRef.current?.focus();
			});
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
		<PageShell>
			<PageHeader
				title="Wallet Pass"
				description={
					isDirty
						? "You have unsaved changes"
						: "Design an Apple Wallet pass — pass.mk-style builder"
				}
				badge={
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

			{/* Centered iOS-Wallet-style editor: pass preview hero + editing panel */}
			<div className="mx-auto w-full max-w-[420px] lg:max-w-[460px]">
				{/* Preview stage */}
				<div className="flex justify-center">
					<DeviceFrame width={300} height="auto" previewDark>
						<div className="px-3 pb-14 pt-1">
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

				{/* Editing panel — non-modal, in-flow sheet overlapping the frame bottom */}
				<section
					ref={panelRef}
					tabIndex={-1}
					aria-label="Pass editor"
					className="relative z-10 -mt-10 rounded-t-3xl border border-b-0 border-border bg-background/85 px-4 pb-2 pt-2 shadow-2xl outline-none backdrop-blur-xl"
				>
					<div className="mb-3 flex items-center justify-between">
						{/* Grabber */}
						<span aria-hidden="true" className="mx-auto block h-1 w-9 rounded-full bg-border" />
					</div>
					{isDirty && (
						// Solid background: text-warning over the translucent panel composited
						// on the dark device frame measured ~3:1 (fails AA at 11px).
						<div className="mb-3 flex items-center justify-between rounded-full border border-warning/40 bg-background py-1 pl-3 pr-1">
							<span className="text-micro font-medium text-warning">Unsaved changes</span>
							<Button size="sm" variant="default" onClick={handleSave}>
								{isSaving ? "Saving…" : "Save"}
							</Button>
						</div>
					)}
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

			{/* Signing keys / cert upload — required to issue real .pkpass files */}
			<SectionCard
				icon={KeyRound}
				title="Signing Keys"
				description="Apple Developer certs required to issue real .pkpass files"
			>
				<SigningKeysSection />
			</SectionCard>
		</PageShell>
	);
}
