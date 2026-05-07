"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, User } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader } from "@/components/admin/section-header";
import { ImageUploadField } from "@/components/admin/image-upload-field";

interface ProfileTabProps {
	onDirtyChange: (dirty: boolean) => void;
}

export function ProfileTab({ onDirtyChange }: ProfileTabProps) {
	const qc = useQueryClient();
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());

	const [profileName, setProfileName] = useState("");
	const [bio, setBio] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");

	const [savedProfileName, setSavedProfileName] = useState("");
	const [savedBio, setSavedBio] = useState("");
	const [savedAvatarUrl, setSavedAvatarUrl] = useState("");

	useEffect(() => {
		if (settingsQuery.data) {
			const s = settingsQuery.data;
			const name = s.profile_name ?? "";
			const b = s.bio ?? "";
			const avatar = s.avatar_url ?? "";
			setProfileName(name);
			setBio(b);
			setAvatarUrl(avatar);
			setSavedProfileName(name);
			setSavedBio(b);
			setSavedAvatarUrl(avatar);
		}
	}, [settingsQuery.data]);

	const profileDirty =
		profileName !== savedProfileName || bio !== savedBio || avatarUrl !== savedAvatarUrl;

	useEffect(() => {
		onDirtyChange(profileDirty);
	}, [profileDirty, onDirtyChange]);

	const handleSaveProfile = async () => {
		const changes: Array<{ key: string; value: string }> = [];
		if (profileName !== savedProfileName) changes.push({ key: "profile_name", value: profileName });
		if (bio !== savedBio) changes.push({ key: "bio", value: bio });
		if (avatarUrl !== savedAvatarUrl) changes.push({ key: "avatar_url", value: avatarUrl });

		if (changes.length === 0) return;

		try {
			await updateSettings.mutateAsync(changes as Parameters<typeof updateSettings.mutateAsync>[0]);
			await qc.invalidateQueries({ queryKey: trpc.settings.getAll.queryOptions().queryKey });
			setSavedProfileName(profileName);
			setSavedBio(bio);
			setSavedAvatarUrl(avatarUrl);
			toast.success("Profile updated");
		} catch {
			toast.error("Failed to save profile");
		}
	};

	return (
		<div className="space-y-4">
			<Card>
				<SectionHeader icon={User} title="Profile Info" variant="primary" />
				<CardContent className="space-y-5">
					<ImageUploadField
						label="Avatar"
						value={avatarUrl}
						purpose="avatar"
						onUploadComplete={(url) => setAvatarUrl(url)}
						aspectRatio="square"
					/>

					<div className="space-y-1.5">
						<Label
							htmlFor="profileName"
							className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
						>
							Display Name
						</Label>
						<Input
							id="profileName"
							value={profileName}
							onChange={(e) => setProfileName(e.target.value)}
							placeholder="Your name"
							maxLength={50}
						/>
						<p className="text-[10px] text-muted-foreground text-right">{profileName.length}/50</p>
					</div>

					<div className="space-y-1.5">
						<Label
							htmlFor="bio"
							className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
						>
							Bio
						</Label>
						<Textarea
							id="bio"
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							placeholder="Tell visitors about yourself..."
							maxLength={300}
							rows={3}
						/>
						<p className="text-[10px] text-muted-foreground text-right">{bio.length}/300</p>
					</div>

					{profileDirty && (
						<Button
							size="sm"
							onClick={handleSaveProfile}
							disabled={updateSettings.isPending}
							className="w-full"
						>
							<Save className="mr-1.5 h-3.5 w-3.5" />
							{updateSettings.isPending ? "Saving..." : "Save Profile"}
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
