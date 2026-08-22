"use client";

import { useState } from "react";
import { type ProfileLive, ProfileTab } from "@/components/admin/builder/profile-tab";
import { usePreviewSlot } from "@/components/admin/preview-slot";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

/** Links → Profile: name, bio and avatar, mirrored live into the shell preview. */
export default function LinksProfilePage() {
	const [dirty, setDirty] = useState(false);
	const [live, setLive] = useState<ProfileLive | null>(null);
	useUnsavedChanges(dirty);
	usePreviewSlot({ overrides: live ? { profile: live } : undefined });
	return <ProfileTab onDirtyChange={setDirty} onLiveChange={setLive} />;
}
