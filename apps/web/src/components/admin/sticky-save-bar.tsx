"use client";

import { Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Unsaved-changes pill that sticks to the bottom of the page while a form is
 * dirty. `bottom-20` on mobile keeps it above the bottom nav bar.
 */
export function StickySaveBar({
	isDirty,
	isSaving,
	onSave,
	onDiscard,
	message = "You have unsaved changes",
}: {
	isDirty: boolean;
	isSaving: boolean;
	onSave: () => void;
	onDiscard: () => void;
	message?: string;
}) {
	if (!isDirty) return null;
	return (
		<div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-lg border border-primary/60 bg-background/95 px-4 py-2.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] backdrop-blur md:bottom-4">
			<span className="text-xs text-muted-foreground">{message}</span>
			<div className="flex gap-2">
				<Button variant="ghost" size="sm" onClick={onDiscard}>
					<Undo2 className="mr-1.5 h-3.5 w-3.5" />
					Discard
				</Button>
				<Button size="sm" disabled={isSaving} onClick={onSave}>
					<Save className="mr-1.5 h-3.5 w-3.5" />
					{isSaving ? "Saving…" : "Save changes"}
				</Button>
			</div>
		</div>
	);
}
