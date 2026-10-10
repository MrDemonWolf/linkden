"use client";

import { MAX_BLOCKS } from "@linkden/validators/blocks";
import { themePresetFromName } from "@linkden/validators/settings-registry";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, FileJson, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/utils/trpc";
import {
	isLinkStackExport,
	type PreparedLinkStackImport,
	prepareLinkStackImport,
} from "./linkstack-payload";
import { mutationErrorMessage } from "./mutation-error";

type WizardStep = "upload" | "options" | "importing" | "done";

interface ImportStats {
	linksImported: number;
	settingsUpdated: boolean;
}

interface LinkStackImportWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImportComplete: () => void;
}

export function LinkStackImportWizard({
	open,
	onOpenChange,
	onImportComplete,
}: LinkStackImportWizardProps) {
	const [step, setStep] = useState<WizardStep>("upload");
	const [parsedData, setParsedData] = useState<PreparedLinkStackImport | null>(null);
	const [importLinks, setImportLinks] = useState(true);
	const [importProfile, setImportProfile] = useState(true);
	const [importTheme, setImportTheme] = useState(true);
	const [stats, setStats] = useState<ImportStats | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const importMutation = useMutation(trpc.backup.importLinkStack.mutationOptions());

	const reset = useCallback(() => {
		setStep("upload");
		setParsedData(null);
		setImportLinks(true);
		setImportProfile(true);
		setImportTheme(true);
		setStats(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, []);

	// Reset when dialog closes
	useEffect(() => {
		if (!open) {
			// Small delay so animation finishes before reset
			const timer = setTimeout(reset, 200);
			return () => clearTimeout(timer);
		}
	}, [open, reset]);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		// Same cap as the backup import: refuse before reading it into memory.
		if (file.size > 10 * 1024 * 1024) {
			toast.error("That file is too large to be a LinkStack export (max 10 MB).");
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		try {
			const text = await file.text();
			const parsed = JSON.parse(text);

			if (!isLinkStackExport(parsed)) {
				toast.error(
					"This doesn't look like a LinkStack export file. Make sure it contains links and profile data.",
				);
				if (fileInputRef.current) fileInputRef.current.value = "";
				return;
			}

			setParsedData(prepareLinkStackImport(parsed));
		} catch {
			toast.error("Failed to parse file. Make sure it is valid JSON.");
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const data = parsedData?.payload;
	// Only http(s) links become blocks, so count what will actually be imported.
	const linkCount = data?.links.length ?? 0;
	const skippedCount = parsedData?.linksSkipped ?? 0;
	const tooManyLinks = linkCount > MAX_BLOCKS;
	const hasProfile = !!(data?.littlelink_name || data?.littlelink_description);
	// A theme is carried over only when its name is a LinkDen preset (the
	// server applies the same rule and writes it to theme_preset).
	const themePreset = themePresetFromName(data?.theme);
	const hasTheme = themePreset !== null;
	const willImportLinks = importLinks && linkCount > 0 && !tooManyLinks;
	const willImportProfile = importProfile && hasProfile;
	const willImportTheme = importTheme && hasTheme;
	const nothingSelected = !willImportLinks && !willImportProfile && !willImportTheme;
	const nothingImported = !!stats && stats.linksImported === 0 && !stats.settingsUpdated;

	const handleImport = async () => {
		if (!parsedData) return;

		setStep("importing");

		try {
			const result = await importMutation.mutateAsync({
				data: parsedData.payload,
				options: {
					importLinks: willImportLinks,
					importProfile: willImportProfile,
					importTheme: willImportTheme,
				},
			});
			setStats(result.stats);
			setStep("done");
			onImportComplete();
		} catch (err) {
			// The router's reason (e.g. the block limit) beats a generic retry prompt.
			toast.error(mutationErrorMessage(err, "Import failed. Nothing was changed."));
			setStep("options");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				{step === "upload" && (
					<>
						<DialogHeader>
							<DialogTitle>Select File</DialogTitle>
							<DialogDescription>Upload your LinkStack export JSON file.</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							{!parsedData ? (
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 p-8 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
								>
									<Upload className="h-8 w-8" />
									<span className="text-sm font-medium">Click to select file</span>
									<span className="text-xs">JSON files only</span>
								</button>
							) : (
								<div className="rounded-lg border border-border/50 p-4 space-y-2">
									<div className="flex items-center gap-2">
										<FileJson className="h-4 w-4 text-primary" />
										<span className="text-sm font-medium">File parsed successfully</span>
									</div>
									<div className="text-xs text-muted-foreground space-y-1">
										{data?.littlelink_name && <p>Profile: {data.littlelink_name}</p>}
										<p>
											Links to import: {linkCount}
											{skippedCount > 0 &&
												` (${skippedCount} skipped: only http/https links can be imported)`}
										</p>
										{hasTheme && <p>Theme: {data?.theme}</p>}
									</div>
									<Button
										variant="ghost"
										size="xs"
										onClick={() => {
											setParsedData(null);
											if (fileInputRef.current) fileInputRef.current.value = "";
										}}
									>
										Choose different file
									</Button>
								</div>
							)}
							<input
								ref={fileInputRef}
								type="file"
								accept=".json"
								onChange={handleFileSelect}
								className="hidden"
								aria-label="Select LinkStack export file"
							/>
						</div>

						<DialogFooter>
							<Button size="sm" disabled={!parsedData} onClick={() => setStep("options")}>
								Next
								<ArrowRight className="ml-1.5 h-3 w-3" />
							</Button>
						</DialogFooter>
					</>
				)}

				{step === "options" && (
					<>
						<DialogHeader>
							<DialogTitle>What to Import</DialogTitle>
							<DialogDescription>
								Choose what data to import from your LinkStack export.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-3">
							<label
								className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors ${linkCount > 0 && !tooManyLinks ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"}`}
							>
								<input
									type="checkbox"
									checked={willImportLinks}
									onChange={(e) => setImportLinks(e.target.checked)}
									disabled={linkCount === 0 || tooManyLinks}
									className="h-4 w-4 rounded border-border accent-primary"
								/>
								<div>
									<p className="text-sm font-medium">Import Links</p>
									<p className="text-xs text-muted-foreground">
										{tooManyLinks
											? `${linkCount} links is more than the ${MAX_BLOCKS}-block limit`
											: linkCount === 0
												? "No http/https links found"
												: `${linkCount} link${linkCount !== 1 ? "s" : ""} added to your page — nothing existing is removed`}
										{skippedCount > 0 && linkCount > 0 && `; ${skippedCount} non-web skipped`}
									</p>
								</div>
							</label>

							<label
								className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors ${hasProfile ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"}`}
							>
								<input
									type="checkbox"
									checked={importProfile && hasProfile}
									onChange={(e) => setImportProfile(e.target.checked)}
									disabled={!hasProfile}
									className="h-4 w-4 rounded border-border accent-primary"
								/>
								<div>
									<p className="text-sm font-medium">Import Profile</p>
									<p className="text-xs text-muted-foreground">
										{hasProfile ? "Replaces your current name and bio" : "No profile data found"}
									</p>
								</div>
							</label>

							<label
								className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors ${hasTheme ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"}`}
							>
								<input
									type="checkbox"
									checked={importTheme && hasTheme}
									onChange={(e) => setImportTheme(e.target.checked)}
									disabled={!hasTheme}
									className="h-4 w-4 rounded border-border accent-primary"
								/>
								<div>
									<p className="text-sm font-medium">Import Theme</p>
									<p className="text-xs text-muted-foreground">
										{hasTheme
											? `Switches your theme preset to "${themePreset}"`
											: data?.theme
												? `"${data.theme}" has no matching LinkDen preset, so it will be skipped`
												: "No theme data found"}
									</p>
								</div>
							</label>
						</div>

						<DialogFooter className="flex-row justify-between sm:justify-between">
							<Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
								<ArrowLeft className="mr-1.5 h-3 w-3" />
								Back
							</Button>
							<Button size="sm" disabled={nothingSelected} onClick={handleImport}>
								Import
								<ArrowRight className="ml-1.5 h-3 w-3" />
							</Button>
						</DialogFooter>
					</>
				)}

				{step === "importing" && (
					<>
						<DialogHeader>
							<DialogTitle>Importing...</DialogTitle>
							<DialogDescription>Please wait while your data is being imported.</DialogDescription>
						</DialogHeader>

						{/* One round trip — an indeterminate spinner is the honest shape.
						    The old bar animated through three fabricated stages. */}
						<div className="flex flex-col items-center gap-3 py-8">
							<Spinner className="h-5 w-5 text-muted-foreground" />
							<p className="text-center text-xs text-muted-foreground">
								Writing your LinkStack data…
							</p>
						</div>
					</>
				)}

				{step === "done" && (
					<>
						<DialogHeader>
							<DialogTitle>{nothingImported ? "Nothing Imported" : "Import Complete"}</DialogTitle>
							<DialogDescription>
								{nothingImported
									? "The file had nothing LinkDen could use for the options you picked."
									: "Your LinkStack data has been imported."}
							</DialogDescription>
						</DialogHeader>

						<div className="flex flex-col items-center gap-4 py-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
								<CheckCircle2 className="h-6 w-6 text-primary" />
							</div>

							{stats && (
								<div className="text-center text-sm space-y-1">
									{stats.linksImported > 0 && (
										<p>
											{stats.linksImported} link
											{stats.linksImported !== 1 ? "s" : ""} imported
										</p>
									)}
									{stats.settingsUpdated && <p>Profile settings updated</p>}
								</div>
							)}
						</div>

						<DialogFooter>
							<Button size="sm" onClick={() => onOpenChange(false)}>
								Close
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
