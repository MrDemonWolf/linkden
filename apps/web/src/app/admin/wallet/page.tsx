"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Settings2 } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import {
	WalletSection,
	type WalletLivePreview,
} from "@/components/admin/settings/wallet-section";
import { WalletPassPreview } from "@/components/admin/wallet-pass-preview";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

export default function WalletPage() {
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
				description="Generate Apple Wallet passes for your page"
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
						<WalletSection onPreviewChange={handlePreviewChange} />

						{/* Download */}
						<div>
							{isConfigured ? (
								<a
									href="/api/wallet-pass"
									className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
								>
									<Wallet className="h-4 w-4" />
									Add to Apple Wallet
								</a>
							) : (
								<button
									type="button"
									disabled
									className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black/40 px-5 py-2.5 text-sm font-medium text-white/60 cursor-not-allowed dark:bg-white/20 dark:text-white/40"
								>
									<Wallet className="h-4 w-4" />
									Add to Apple Wallet
								</button>
							)}
						</div>
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
