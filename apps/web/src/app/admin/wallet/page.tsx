"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, Save, Undo2, Info, Smartphone, CreditCard } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
	WalletSection,
	type WalletLivePreview,
} from "@/components/admin/settings/wallet-section";
import { WalletPassPreview } from "@/components/admin/wallet-pass-preview";
import { DeviceFrame } from "@/components/admin/device-frame";

export default function WalletPage() {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const previewQuery = useQuery(trpc.wallet.generatePreview.queryOptions());
	const signingQuery = useQuery(trpc.wallet.getSigningStatus.queryOptions());

	const [livePreview, setLivePreview] = useState<WalletLivePreview | null>(
		null,
	);
	const handlePreviewChange = useCallback((state: WalletLivePreview) => {
		setLivePreview(state);
	}, []);

	const [isDirty, setIsDirty] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const walletSaveRef = useRef<(() => Promise<void>) | null>(null);

	useUnsavedChanges(isDirty);

	const handleSave = async () => {
		if (!walletSaveRef.current) return;
		setIsSaving(true);
		try {
			await walletSaveRef.current();
		} finally {
			setIsSaving(false);
		}
	};

	const handleDiscard = () => {
		qc.invalidateQueries({
			queryKey: trpc.wallet.getConfig.queryOptions().queryKey,
		});
	};

	const organizationName = configQuery.data?.wallet_organization_name ?? "";
	const isConfigured = !!(
		organizationName &&
		signingQuery.data?.signerCert &&
		signingQuery.data?.signerKey &&
		signingQuery.data?.wwdrCert &&
		signingQuery.data?.teamId &&
		signingQuery.data?.passTypeId
	);

	const publicProfileUrl =
		typeof window !== "undefined"
			? `${window.location.origin}`
			: undefined;

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6">
			<PageHeader
				title="Wallet Pass"
				description={
					isDirty
						? "You have unsaved changes"
						: "Generate Apple Wallet passes for your page"
				}
				badge={
					<Badge
						variant="outline"
						className={isConfigured
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
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDiscard}
							>
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

			{/* Two-column: Config + Preview */}
			<div className="grid items-start gap-6 lg:grid-cols-[1fr_auto]">
				{/* Left: Configuration */}
				<div className="space-y-6">
					<Card className="overflow-hidden">
						<CardContent className="pt-0">
							<div className="flex items-start gap-3 border-b border-border/50 py-4 -mx-6 px-6 mb-4">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
									<CreditCard className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<h2 className="text-sm font-semibold">Pass Configuration</h2>
									<p className="mt-0.5 text-[11px] text-muted-foreground">
										Signing keys, pass details, and appearance
									</p>
								</div>
							</div>
							<WalletSection
								onPreviewChange={handlePreviewChange}
								onDirtyChange={setIsDirty}
								saveRef={walletSaveRef}
							/>
						</CardContent>
					</Card>

					{/* Download section */}
					{isConfigured ? (
						<Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent">
							<CardContent className="flex flex-col items-center py-6">
								<p className="mb-4 text-xs font-medium text-muted-foreground">
									Your wallet pass is ready to download
								</p>
								<a
									href="/api/wallet-pass"
									className="transition-opacity hover:opacity-80"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="240"
										height="40"
										viewBox="0 0 240 40"
										role="img"
										aria-label="Add to Apple Wallet"
									>
										<rect
											width="240"
											height="40"
											rx="6"
											className="fill-black dark:fill-white"
										/>
										<rect
											x="0.75"
											y="0.75"
											width="238.5"
											height="38.5"
											rx="5.25"
											className="fill-black dark:fill-[#0d0d0d]"
										/>
										<text
											x="120"
											y="23"
											textAnchor="middle"
											dominantBaseline="middle"
											className="fill-white dark:fill-black"
											fontFamily="system-ui, -apple-system, sans-serif"
											fontSize="13"
											fontWeight="500"
										>
											Add to Apple Wallet
										</text>
									</svg>
								</a>
							</CardContent>
						</Card>
					) : (
						<div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
							<div className="absolute inset-y-0 left-0 w-0.5 bg-primary/50" />
							<div className="flex items-start gap-2.5 pl-1.5">
								<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								<p className="text-xs leading-relaxed text-muted-foreground">
									Complete the configuration above to enable
									wallet pass generation.
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Right: Sticky Preview with phone frame */}
				<div className="lg:sticky lg:top-20">
					<Card className="overflow-hidden">
						<CardContent className="pt-0">
							<div className="flex items-start gap-3 border-b border-border/50 py-4 -mx-6 px-6 mb-4">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
									<Smartphone className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<h2 className="text-sm font-semibold">Live Preview</h2>
									<p className="mt-0.5 text-[11px] text-muted-foreground">
										How the pass looks on a device
									</p>
								</div>
							</div>

							{/* Unified device frame (shared with Appearance + Builder previews) */}
							<div className="flex justify-center py-2">
								<DeviceFrame width={300} height="auto" previewDark>
									<div className="px-3 pt-1 pb-4">
										<WalletPassPreview
											backgroundColor={
												livePreview?.backgroundColor ??
												previewQuery.data?.backgroundColor
											}
											foregroundColor={
												livePreview?.foregroundColor ??
												previewQuery.data?.foregroundColor
											}
											labelColor={
												livePreview?.labelColor ?? previewQuery.data?.labelColor
											}
											logoUrl={
												livePreview?.logoUrl ??
												previewQuery.data?.logoUrl ??
												undefined
											}
											organizationName={
												livePreview?.organizationName ??
												previewQuery.data?.organizationName
											}
											profileName={
												previewQuery.data?.profile?.name ?? undefined
											}
											profileEmail={
												previewQuery.data?.profile?.email ?? undefined
											}
											profileImage={
												previewQuery.data?.profile?.image ?? undefined
											}
											passDescription={
												livePreview?.passDescription ??
												previewQuery.data?.passDescription
											}
											qrUrl={publicProfileUrl}
											showEmail={
												livePreview?.showEmail ??
												previewQuery.data?.showEmail
											}
											showName={
												livePreview?.showName ??
												previewQuery.data?.showName
											}
											showQrCode={
												livePreview?.showQrCode ??
												previewQuery.data?.showQrCode
											}
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
