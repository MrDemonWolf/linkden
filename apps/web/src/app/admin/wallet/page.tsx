"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Wallet,
	CheckCircle2,
	XCircle,
	Download,
	Settings2,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/admin/empty-state";
import {
	WalletSection,
	type WalletLivePreview,
} from "@/components/admin/settings/wallet-section";
import { WalletPassPreview } from "@/components/admin/wallet-pass-preview";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

export default function WalletPage() {
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const previewQuery = useQuery(trpc.wallet.generatePreview.queryOptions());
	const { getAnimationProps } = useEntranceAnimation(!configQuery.isLoading);

	const [livePreview, setLivePreview] = useState<WalletLivePreview | null>(
		null,
	);
	const handlePreviewChange = useCallback((state: WalletLivePreview) => {
		setLivePreview(state);
	}, []);

	const isEnabled = configQuery.data?.wallet_pass_enabled === "true";
	const teamId = configQuery.data?.wallet_team_id ?? "";
	const passTypeId = configQuery.data?.wallet_pass_type_id ?? "";
	const organizationName = configQuery.data?.wallet_organization_name ?? "";
	const isConfigured = !!(teamId && passTypeId && organizationName);

	const headerAnim = getAnimationProps(0);
	const statsAnim = getAnimationProps(1);
	const contentAnim = getAnimationProps(2);

	return (
		<div className="space-y-4">
			<PageHeader
				title="Wallet Pass"
				className={cn(headerAnim.className)}
				style={headerAnim.style}
				badge={
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
							isEnabled
								? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
								: "bg-muted text-muted-foreground",
						)}
					>
						{isEnabled ? (
							<>
								<CheckCircle2 className="h-3 w-3" />
								Enabled
							</>
						) : (
							<>
								<XCircle className="h-3 w-3" />
								Disabled
							</>
						)}
					</span>
				}
				description="Generate Apple/Google Wallet passes for your page"
			/>

			{/* Status cards */}
			<div
				className={cn("grid gap-3 sm:grid-cols-2", statsAnim.className)}
				style={statsAnim.style}
			>
				<StatCard
					icon={Wallet}
					label="Wallet Status"
					value={isEnabled ? "Enabled" : "Disabled"}
					iconColor={isEnabled ? "text-emerald-500" : "text-muted-foreground"}
					iconBg={isEnabled ? "bg-emerald-500/10" : "bg-muted"}
				/>
				<StatCard
					icon={Settings2}
					label="Configuration"
					value={isConfigured ? "Complete" : "Incomplete"}
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
				{/* Left: Configuration + Download */}
				<Card>
					<CardContent className="space-y-4 pt-2">
						<h2 className="text-sm font-semibold">Configuration</h2>
						<WalletSection onPreviewChange={handlePreviewChange} />

						{/* Download */}
						<div className="space-y-3 border-t pt-4">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Download
							</p>
							{isEnabled && isConfigured ? (
								<div className="space-y-3">
									<a
										href="/api/wallet-pass"
										className="inline-flex items-center gap-2 rounded-lg border border-border bg-primary/5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10"
									>
										<Download className="h-4 w-4" />
										Download Wallet Pass
									</a>
									{configQuery.data?.wallet_custom_qr_url && (
										<p className="text-xs text-muted-foreground">
											QR URL: {configQuery.data.wallet_custom_qr_url}
										</p>
									)}
								</div>
							) : (
								<EmptyState
									icon={Wallet}
									title="Not ready"
									description={
										!isEnabled
											? "Enable Wallet Pass to make it available to visitors"
											: "Configure your Team ID and Pass Type ID above"
									}
								/>
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
									qrUrl={
										livePreview?.qrUrl ??
										previewQuery.data?.qrUrl ??
										undefined
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
