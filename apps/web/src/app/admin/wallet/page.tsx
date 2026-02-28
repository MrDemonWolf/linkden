"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, Save, Undo2, Info } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
	WalletSection,
	type WalletLivePreview,
} from "@/components/admin/settings/wallet-section";
import { WalletPassPreview } from "@/components/admin/wallet-pass-preview";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

export default function WalletPage() {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const previewQuery = useQuery(trpc.wallet.generatePreview.queryOptions());
	const signingQuery = useQuery(trpc.wallet.getSigningStatus.queryOptions());
	const { getAnimationProps } = useEntranceAnimation(!configQuery.isLoading);

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

	const headerAnim = getAnimationProps(0);
	const statsAnim = getAnimationProps(1);
	const contentAnim = getAnimationProps(2);

	return (
		<div className="space-y-4">
			<PageHeader
				title="Wallet Pass"
				className={cn(headerAnim.className)}
				style={headerAnim.style}
				description={
					isDirty
						? "You have unsaved changes"
						: "Generate Apple Wallet passes for your page"
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

			{/* Status card */}
			<div
				className={cn("grid gap-3 sm:grid-cols-1", statsAnim.className)}
				style={statsAnim.style}
			>
				<StatCard
					icon={Settings2}
					label="Config Status"
					value={isConfigured ? "Ready" : "Incomplete"}
					iconColor={isConfigured ? "text-emerald-500" : "text-amber-500"}
					iconBg={isConfigured ? "bg-emerald-500/10" : "bg-amber-500/10"}
				/>
			</div>

			{/* Two-column: Config + Preview */}
			<div
				className={cn(
					"grid items-start gap-4 lg:grid-cols-[1fr_auto]",
					contentAnim.className,
				)}
				style={contentAnim.style}
			>
				{/* Left: General Settings + Download */}
				<Card>
					<CardContent className="space-y-6 pt-2">
						<WalletSection
							onPreviewChange={handlePreviewChange}
							onDirtyChange={setIsDirty}
							saveRef={walletSaveRef}
						/>

						{/* Download — Apple guidelines: use official badge, never show dimmed state */}
						{isConfigured ? (
							<div className="flex justify-center">
								<a
									href="/api/wallet-pass"
									className="transition-opacity hover:opacity-80"
								>
									{/* Official Apple "Add to Apple Wallet" badge */}
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
							</div>
						) : (
							<div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
								<div className="absolute inset-y-0 left-0 w-0.5 bg-primary/50" />
								<div className="flex items-start gap-2.5 pl-1.5">
									<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									<p className="text-xs leading-relaxed text-muted-foreground">
										Complete the environment configuration above to enable
										wallet pass generation.
									</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Right: Sticky Preview */}
				<div className="lg:sticky lg:top-20">
					<Card>
						<CardContent className="space-y-4 pt-2">
							<h2 className="text-sm font-semibold">Preview</h2>
							<div className="flex justify-center py-4">
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
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
