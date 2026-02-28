import { type RefObject } from "react";
import { Download, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataSectionProps {
	onExport: () => void;
	onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
	isExporting: boolean;
	isImporting: boolean;
	fileInputRef: RefObject<HTMLInputElement | null>;
	versionCheck: {
		current?: string;
		hasUpdate?: boolean;
		latest?: string;
		releaseUrl?: string | null;
	} | null;
	onCheckUpdates: () => void;
}

export function DataSection({
	onExport,
	onImport,
	isExporting,
	isImporting,
	fileInputRef,
	versionCheck,
	onCheckUpdates,
}: DataSectionProps) {
	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onExport}
					disabled={isExporting}
				>
					<Download className="mr-1.5 h-3 w-3" />
					{isExporting ? "Exporting..." : "Export"}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => fileInputRef.current?.click()}
					disabled={isImporting}
				>
					<Upload className="mr-1.5 h-3 w-3" />
					{isImporting ? "Importing..." : "Import"}
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					onChange={onImport}
					className="hidden"
					aria-label="Import backup file"
				/>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<p className="text-[11px] text-muted-foreground">Current Version</p>
					<p className="text-sm font-semibold tabular-nums">
						{versionCheck?.current ?? "0.1.0"}
					</p>
				</div>
				{versionCheck?.hasUpdate ? (
					<a
						href={versionCheck.releaseUrl ?? "#"}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button size="sm">
							Update to {versionCheck.latest}
							<ExternalLink className="ml-1.5 h-3 w-3" />
						</Button>
					</a>
				) : (
					<Button size="sm" variant="outline" onClick={onCheckUpdates}>
						Check for updates
					</Button>
				)}
			</div>
			<a
				href="https://github.com/mrdemonwolf/LinkDen"
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
			>
				GitHub Repository
				<ExternalLink className="h-3 w-3" />
			</a>
		</div>
	);
}
