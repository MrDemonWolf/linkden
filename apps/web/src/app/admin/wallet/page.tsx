"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Settings2,
	Save,
	Undo2,
	Info,
	Smartphone,
	CreditCard,
	KeyRound,
	AlertTriangle,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { DeviceFrame } from "@/components/admin/device-frame";
import { WalletPassPreview, type PassZone } from "@/components/admin/wallet-pass-preview";
import {
	WalletBuilderSection,
	type WalletLiveState,
} from "@/components/admin/wallet/wallet-builder-section";
import { SigningKeysSection } from "@/components/admin/wallet/signing-keys-section";

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
					<Badge
						variant="outline"
						className={
							isConfigured
								? "gap-1 border-emerald-500/30 text-emerald-500"
								: "gap-1 border-amber-500/30 text-amber-500"
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
							{isSaving ? "Saving..." : "Save"}
						</Button>
					</>
				}
			/>

			<div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
				{/* Left: Builder */}
				<div className="space-y-6">
					<Card className="overflow-hidden">
						<CardContent className="pt-0">
							<div className="-mx-6 mb-4 flex items-start gap-3 border-b border-border/50 px-6 py-4">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
									<CreditCard className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<h2 className="text-sm font-semibold">Pass Builder</h2>
									<p className="mt-0.5 text-[11px] text-muted-foreground">
										Template, identity, images, colors, and field zones
									</p>
								</div>
							</div>
							<WalletBuilderSection
								onPreviewChange={setLive}
								onZoneFocus={setHighlightedZone}
								onDirtyChange={setIsDirty}
								saveRef={saveRef}
							/>
						</CardContent>
					</Card>

					<Card className="overflow-hidden">
						<CardContent className="pt-0">
							<div className="-mx-6 mb-4 flex items-start gap-3 border-b border-border/50 px-6 py-4">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
									<KeyRound className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<h2 className="text-sm font-semibold">Signing Keys</h2>
									<p className="mt-0.5 text-[11px] text-muted-foreground">
										Apple Developer certs required to issue real .pkpass files
									</p>
								</div>
							</div>
							<SigningKeysSection />
						</CardContent>
					</Card>

					{/* Status / download */}
					<div className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3.5 py-2.5">
						<div className="absolute inset-y-0 left-0 w-0.5 bg-amber-400/60" />
						<div className="flex items-start gap-2.5 pl-1.5">
							<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
							<p className="text-xs leading-relaxed text-muted-foreground">
								Pass <span className="font-mono">.pkpass</span> generation runs on the server and is{" "}
								<span className="font-medium text-foreground">not yet wired up</span>. The design
								you save here is stored and ready — once the signing endpoint ships you can issue
								passes from this page.
							</p>
						</div>
					</div>

					{!isConfigured && (
						<div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
							<div className="absolute inset-y-0 left-0 w-0.5 bg-primary/50" />
							<div className="flex items-start gap-2.5 pl-1.5">
								<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								<p className="text-xs leading-relaxed text-muted-foreground">
									Add Apple Developer signing keys above to mark your wallet pass as ready.
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Right: Sticky preview */}
				<div className="lg:sticky lg:top-20">
					<Card className="overflow-hidden">
						<CardContent className="pt-0">
							<div className="-mx-6 mb-4 flex items-start gap-3 border-b border-border/50 px-6 py-4">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
									<Smartphone className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<h2 className="text-sm font-semibold">Live Preview</h2>
									<p className="mt-0.5 text-[11px] text-muted-foreground">
										Focus a field to highlight its zone
									</p>
								</div>
							</div>

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
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
