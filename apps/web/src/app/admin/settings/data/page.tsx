"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownUp, Clock, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { SectionCard, SectionHeader } from "@/components/admin/section-header";
import { DangerConfirmDialog } from "@/components/admin/settings/danger-confirm-dialog";
import { DataSection } from "@/components/admin/settings/data-section";
import { MigrationSection } from "@/components/admin/settings/migration-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

/** "12 blocks, 34 settings, 5 social links" — only the parts the file carries. */
function describeImport(data: {
	blocks?: unknown[];
	settings?: Record<string, string>;
	socialNetworks?: unknown[];
	contactSubmissions?: unknown[];
}): string {
	const parts: string[] = [];
	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
	if (data.blocks?.length) parts.push(plural(data.blocks.length, "block", "blocks"));
	const settingCount = Object.keys(data.settings ?? {}).length;
	if (settingCount) parts.push(plural(settingCount, "setting", "settings"));
	if (data.socialNetworks?.length)
		parts.push(plural(data.socialNetworks.length, "social link", "social links"));
	if (data.contactSubmissions?.length)
		parts.push(plural(data.contactSubmissions.length, "message", "messages"));
	if (parts.length === 0) return "This file carries no data — nothing";
	return parts.join(", ");
}

// Mirrors DEFAULT_RETENTION in packages/db/src/retention.ts (daily cron).
const RETENTION = [
	["Page views & link clicks", "365 days"],
	["Contact-form messages", "365 days"],
	["Audit log", "180 days"],
] as const;

export default function DataSettingsPage() {
	const qc = useQueryClient();
	const router = useRouter();
	const versionCheck = useQuery(trpc.version.checkUpdate.queryOptions());
	const exportData = useQuery({ ...trpc.backup.export.queryOptions(), enabled: false });
	const importData = useMutation(trpc.backup.import.mutationOptions());
	type ImportPayload = Parameters<typeof importData.mutateAsync>[0]["data"];
	const fileInputRef = useRef<HTMLInputElement>(null);

	const invalidateSettings = () =>
		qc.invalidateQueries({ queryKey: trpc.settings.getAll.queryOptions().queryKey });

	const handleExport = async () => {
		try {
			const result = await exportData.refetch();
			if (result.data) {
				const blob = new Blob([JSON.stringify(result.data, null, 2)], {
					type: "application/json",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `linkden-backup-${new Date().toISOString().slice(0, 10)}.json`;
				a.click();
				URL.revokeObjectURL(url);
				toast.success("Export downloaded");
			}
		} catch {
			toast.error("Failed to export");
		}
	};

	// Import overwrites blocks, settings and social links by id/key. Picking the
	// file used to be the point of no return; it now only parses and asks.
	const [pendingImport, setPendingImport] = useState<ImportPayload | null>(null);

	const clearFileInput = () => {
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			if (!parsed.data) {
				toast.error("Invalid LinkDen export file.");
				clearFileInput();
				return;
			}
			setPendingImport(parsed.data as ImportPayload);
		} catch {
			toast.error("Failed to read the file. Make sure it is valid JSON.");
			clearFileInput();
		}
	};

	const runImport = async (data: ImportPayload) => {
		setPendingImport(null);
		try {
			const result = await importData.mutateAsync({ mode: "merge", data });
			invalidateSettings();
			// Settings are skipped for the same reasons rows are (unknown key, value
			// the sanitizer rejects), so they belong in the same count.
			const skipped =
				result.skipped.blocks + result.skipped.socialNetworks + result.skipped.settings;
			if (skipped > 0) {
				toast.warning(`Imported with ${skipped} invalid item${skipped === 1 ? "" : "s"} skipped`);
			} else {
				toast.success("Import successful");
			}
		} catch {
			toast.error("Failed to import. Make sure the file is a LinkDen export.");
		}
		clearFileInput();
	};

	// ─── Danger zone ─────────────────────────────────────────────────────
	const deleteAllContent = useMutation(trpc.danger.deleteAllContent.mutationOptions());
	const resetEverything = useMutation(trpc.danger.resetEverything.mutationOptions());
	const [deleteContentOpen, setDeleteContentOpen] = useState(false);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);

	const handleDeleteAllContent = async () => {
		try {
			await deleteAllContent.mutateAsync();
			toast.success("All content removed");
			qc.invalidateQueries();
			setDeleteContentOpen(false);
		} catch {
			toast.error("Failed to delete content");
		}
	};

	const handleResetEverything = async () => {
		try {
			await resetEverything.mutateAsync();
			await authClient.signOut();
			toast.success("LinkDen reset — restarting setup");
			router.push("/admin/setup");
		} catch {
			toast.error("Failed to reset");
		}
	};

	return (
		<div className="space-y-6">
			<SectionCard
				icon={Database}
				title="Backup & version"
				description="Export or import your data and check for updates"
			>
				<DataSection
					onExport={handleExport}
					onImport={handleImport}
					isExporting={exportData.isFetching}
					isImporting={importData.isPending}
					fileInputRef={fileInputRef}
					versionCheck={versionCheck.data ?? null}
					onCheckUpdates={() =>
						qc.invalidateQueries({ queryKey: trpc.version.checkUpdate.queryOptions().queryKey })
					}
				/>
			</SectionCard>

			<SectionCard
				icon={ArrowDownUp}
				title="Migration"
				description="Import data from other link-in-bio platforms"
			>
				<MigrationSection onImportComplete={invalidateSettings} />
			</SectionCard>

			<SectionCard
				icon={Clock}
				title="Retention"
				description="A daily job prunes old rows and unreferenced images automatically"
			>
				<dl className="divide-y divide-dashed divide-border text-xs">
					{RETENTION.map(([label, days]) => (
						<div key={label} className="flex items-center justify-between py-2">
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="font-mono tabular-nums">{days}</dd>
						</div>
					))}
				</dl>
			</SectionCard>

			{/* Danger zone last, on purpose. */}
			<Card className="border-destructive/40 bg-destructive/5">
				<SectionHeader icon={AlertTriangle} title="Danger zone" variant="muted" />
				<CardContent className="space-y-3 pt-0">
					<div className="grid grid-cols-[1fr_auto] items-center gap-3">
						<div className="min-w-0">
							<div className="text-xs font-medium">Delete all content</div>
							<div className="text-micro text-muted-foreground">
								removes blocks + analytics · keeps account
							</div>
						</div>
						<Button size="sm" variant="outline" onClick={() => setDeleteContentOpen(true)}>
							Delete
						</Button>
					</div>
					<div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-dashed border-destructive/30 pt-3">
						<div className="min-w-0">
							<div className="text-xs font-medium">Reset everything</div>
							<div className="text-micro text-muted-foreground">
								full wipe · returns to setup wizard
							</div>
						</div>
						<Button size="sm" variant="destructive" onClick={() => setResetDialogOpen(true)}>
							Reset…
						</Button>
					</div>
				</CardContent>
			</Card>

			<DangerConfirmDialog
				open={deleteContentOpen}
				onOpenChange={setDeleteContentOpen}
				title="Delete all content?"
				description="This permanently removes every block, analytics row, and form submission. Your account, settings, and theme stay intact. This cannot be undone."
				confirmWord="DELETE"
				confirmLabel="Delete content"
				isPending={deleteAllContent.isPending}
				onConfirm={handleDeleteAllContent}
			/>
			<DangerConfirmDialog
				open={resetDialogOpen}
				onOpenChange={setResetDialogOpen}
				title="Reset LinkDen completely?"
				description="This wipes all content, analytics, settings, social links, AND your user account. You will be signed out and the setup wizard will start fresh. This cannot be undone."
				confirmWord="RESET"
				confirmLabel="Reset everything"
				isPending={resetEverything.isPending}
				onConfirm={handleResetEverything}
			/>

			<ConfirmDialog
				open={pendingImport !== null}
				onOpenChange={(open) => {
					if (!open) {
						setPendingImport(null);
						clearFileInput();
					}
				}}
				title="Restore this backup?"
				description={
					pendingImport
						? `${describeImport(pendingImport)} will be written over your current values. Blocks, settings and social links with matching ids are replaced; nothing else is deleted.`
						: ""
				}
				confirmLabel="Restore"
				isPending={importData.isPending}
				onConfirm={() => {
					if (pendingImport) void runImport(pendingImport);
				}}
			/>
		</div>
	);
}
