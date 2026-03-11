"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkStackImportWizard } from "./linkstack-import-wizard";

interface MigrationSectionProps {
	onImportComplete: () => void;
}

export function MigrationSection({ onImportComplete }: MigrationSectionProps) {
	const [wizardOpen, setWizardOpen] = useState(false);

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-border/50 p-4 space-y-3">
				<div className="flex items-center gap-2">
					<ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
					<h3 className="text-sm font-medium">Import from LinkStack</h3>
				</div>
				<p className="text-xs text-muted-foreground">
					Migrate your links, profile, and theme from a LinkStack export
					file. Your existing data will not be overwritten.
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setWizardOpen(true)}
				>
					Start Migration
				</Button>
			</div>

			<LinkStackImportWizard
				open={wizardOpen}
				onOpenChange={setWizardOpen}
				onImportComplete={onImportComplete}
			/>
		</div>
	);
}
