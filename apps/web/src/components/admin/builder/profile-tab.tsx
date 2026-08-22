"use client";

import { SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CharCount, FieldError } from "@/components/admin/field-feedback";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SectionHeader } from "@/components/admin/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldError } from "@/lib/validate";
import { trpc } from "@/utils/trpc";

// Same caps the server applies (it truncates silently past them).
const NAME_MAX = SETTING_REGISTRY.profile_name?.maxLength ?? 50;
const BIO_MAX = SETTING_REGISTRY.bio?.maxLength ?? 300;
const nameSchema = z.string().max(NAME_MAX);
const bioSchema = z.string().max(BIO_MAX);

export interface ProfileLive {
	name: string;
	bio: string | null;
	image: string | null;
}

interface ProfileTabProps {
	onDirtyChange: (dirty: boolean) => void;
	/** In-progress values for the live preview (`overrides.profile`); null once everything is saved. */
	onLiveChange?: (profile: ProfileLive | null) => void;
}

export function ProfileTab({ onDirtyChange, onLiveChange }: ProfileTabProps) {
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

	useEffect(() => {
		onLiveChange?.(
			profileDirty ? { name: profileName, bio: bio || null, image: avatarUrl || null } : null,
		);
		return () => onLiveChange?.(null);
	}, [profileDirty, profileName, bio, avatarUrl, onLiveChange]);

	const nameError = fieldError(nameSchema, profileName);
	const bioError = fieldError(bioSchema, bio);
	const hasErrors = !!(nameError || bioError);

	const handleSaveProfile = async () => {
		if (hasErrors) return;
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
							aria-invalid={!!nameError}
							aria-describedby={nameError ? "profileName-error" : undefined}
						/>
						<CharCount value={profileName} max={NAME_MAX} />
						<FieldError id="profileName-error" error={nameError} />
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
							rows={3}
							aria-invalid={!!bioError}
							aria-describedby={bioError ? "bio-error" : undefined}
						/>
						<CharCount value={bio} max={BIO_MAX} />
						<FieldError id="bio-error" error={bioError} />
					</div>

					{profileDirty && (
						<Button
							size="sm"
							onClick={handleSaveProfile}
							disabled={updateSettings.isPending || hasErrors}
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
