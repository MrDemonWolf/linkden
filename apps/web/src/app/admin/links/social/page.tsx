"use client";

import { useState } from "react";
import { type SocialLive, SocialTab } from "@/components/admin/builder/social-tab";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

/** Links → Social: the icon row, mirrored live into the shell preview. */
export default function LinksSocialPage() {
	const [dirty, setDirty] = useState(false);
	const [live, setLive] = useState<SocialLive[] | null>(null);
	useUnsavedChanges(dirty);
	usePreviewSlot({ overrides: live ? { socialNetworks: live } : undefined });
	return <SocialTab onDirtyChange={setDirty} onLiveChange={setLive} />;
}
