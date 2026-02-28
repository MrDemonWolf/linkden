"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, CheckCircle2, FileJson, ArrowLeft, ArrowRight } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

type WizardStep = "upload" | "options" | "importing" | "done";

interface LinkStackData {
	name?: string;
	littlelink_name?: string;
	littlelink_description?: string;
	theme?: string;
	links?: Array<{
		button_id?: string;
		link?: string;
		title?: string;
		order?: number;
	}>;
	profile_image?: string;
}

interface ImportStats {
	linksImported: number;
	settingsUpdated: boolean;
}

interface LinkStackImportWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImportComplete: () => void;
}

function isLinkStackFormat(data: unknown): data is LinkStackData {
	if (typeof data !== "object" || data === null) return false;
	const obj = data as Record<string, unknown>;
	return (
		("littlelink_name" in obj || "littlelink_description" in obj) &&
		Array.isArray(obj.links)
	);
}

export function LinkStackImportWizard({
	open,
	onOpenChange,
	onImportComplete,
}: LinkStackImportWizardProps) {
	const [step, setStep] = useState<WizardStep>("upload");
	const [parsedData, setParsedData] = useState<LinkStackData | null>(null);
	const [importLinks, setImportLinks] = useState(true);
	const [importProfile, setImportProfile] = useState(true);
	const [importTheme, setImportTheme] = useState(true);
	const [progress, setProgress] = useState(0);
	const [stats, setStats] = useState<ImportStats | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const importMutation = useMutation(
		trpc.backup.importLinkStack.mutationOptions(),
	);

	const reset = useCallback(() => {
		setStep("upload");
		setParsedData(null);
		setImportLinks(true);
		setImportProfile(true);
		setImportTheme(true);
		setProgress(0);
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

		try {
			const text = await file.text();
			const parsed = JSON.parse(text);

			if (!isLinkStackFormat(parsed)) {
				toast.error(
					"This doesn't look like a LinkStack export file. Make sure it contains links and profile data.",
				);
				if (fileInputRef.current) fileInputRef.current.value = "";
				return;
			}

			setParsedData(parsed);
		} catch {
			toast.error("Failed to parse file. Make sure it is valid JSON.");
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleImport = async () => {
		if (!parsedData) return;

		setStep("importing");
		setProgress(20);

		try {
			setProgress(50);
			const result = await importMutation.mutateAsync({
				data: parsedData,
				options: { importLinks, importProfile, importTheme },
			});
			setProgress(100);
			setStats(result.stats);
			// Brief pause so user sees 100%
			setTimeout(() => setStep("done"), 400);
			onImportComplete();
		} catch {
			toast.error("Import failed. Please try again.");
			setStep("options");
			setProgress(0);
		}
	};

	const linkCount = parsedData?.links?.filter((l) => l.link).length ?? 0;
	const hasProfile = !!(parsedData?.littlelink_name || parsedData?.littlelink_description);
	const hasTheme = !!parsedData?.theme;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				{step === "upload" && (
					<>
						<DialogHeader>
							<DialogTitle>Select File</DialogTitle>
							<DialogDescription>
								Upload your LinkStack export JSON file.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							{!parsedData ? (
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 p-8 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
								>
									<Upload className="h-8 w-8" />
									<span className="text-sm font-medium">
										Click to select file
									</span>
									<span className="text-xs">JSON files only</span>
								</button>
							) : (
								<div className="rounded-lg border border-border/50 p-4 space-y-2">
									<div className="flex items-center gap-2">
										<FileJson className="h-4 w-4 text-primary" />
										<span className="text-sm font-medium">
											File parsed successfully
										</span>
									</div>
									<div className="text-xs text-muted-foreground space-y-1">
										{parsedData.littlelink_name && (
											<p>Profile: {parsedData.littlelink_name}</p>
										)}
										<p>Links found: {linkCount}</p>
										{hasTheme && <p>Theme: {parsedData.theme}</p>}
									</div>
									<Button
										variant="ghost"
										size="xs"
										onClick={() => {
											setParsedData(null);
											if (fileInputRef.current)
												fileInputRef.current.value = "";
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
							<Button
								size="sm"
								disabled={!parsedData}
								onClick={() => setStep("options")}
							>
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
								Choose what data to import from your LinkStack
								export.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-3">
							<label className="flex items-center gap-3 rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
								<input
									type="checkbox"
									checked={importLinks}
									onChange={(e) => setImportLinks(e.target.checked)}
									className="h-4 w-4 rounded border-border accent-primary"
								/>
								<div>
									<p className="text-sm font-medium">
										Import Links
									</p>
									<p className="text-xs text-muted-foreground">
										{linkCount} link{linkCount !== 1 ? "s" : ""} found
									</p>
								</div>
							</label>

							<label className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors ${hasProfile ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"}`}>
								<input
									type="checkbox"
									checked={importProfile && hasProfile}
									onChange={(e) => setImportProfile(e.target.checked)}
									disabled={!hasProfile}
									className="h-4 w-4 rounded border-border accent-primary"
								/>
								<div>
									<p className="text-sm font-medium">
										Import Profile
									</p>
									<p className="text-xs text-muted-foreground">
										{hasProfile
											? "Name and bio"
											: "No profile data found"}
									</p>
								</div>
							</label>

							<label className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors ${hasTheme ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"}`}>
								<input
									type="checkbox"
									checked={importTheme && hasTheme}
									onChange={(e) => setImportTheme(e.target.checked)}
									disabled={!hasTheme}
									className="h-4 w-4 rounded border-border accent-primary"
								/>
								<div>
									<p className="text-sm font-medium">
										Import Theme
									</p>
									<p className="text-xs text-muted-foreground">
										{hasTheme
											? `Theme: ${parsedData?.theme}`
											: "No theme data found"}
									</p>
								</div>
							</label>
						</div>

						<DialogFooter className="flex-row justify-between sm:justify-between">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setStep("upload")}
							>
								<ArrowLeft className="mr-1.5 h-3 w-3" />
								Back
							</Button>
							<Button
								size="sm"
								disabled={!importLinks && !importProfile && !importTheme}
								onClick={handleImport}
							>
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
							<DialogDescription>
								Please wait while your data is being imported.
							</DialogDescription>
						</DialogHeader>

						<div className="py-6 space-y-3">
							<Progress value={progress} />
							<p className="text-center text-xs text-muted-foreground">
								{progress < 50
									? "Preparing data..."
									: progress < 100
										? "Importing..."
										: "Finishing up..."}
							</p>
						</div>
					</>
				)}

				{step === "done" && (
					<>
						<DialogHeader>
							<DialogTitle>Import Complete</DialogTitle>
							<DialogDescription>
								Your LinkStack data has been imported
								successfully.
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
											{stats.linksImported !== 1 ? "s" : ""}{" "}
											imported
										</p>
									)}
									{stats.settingsUpdated && (
										<p>Profile settings updated</p>
									)}
								</div>
							)}
						</div>

						<DialogFooter>
							<Button
								size="sm"
								onClick={() => onOpenChange(false)}
							>
								Close
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
