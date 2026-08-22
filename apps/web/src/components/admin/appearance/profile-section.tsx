"use client";

import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "@/components/admin/image-upload-field";

export function ProfileSection({
	profileName,
	profileBio,
	profileAvatar,
	onNameChange,
	onBioChange,
	onAvatarChange,
}: {
	profileName: string;
	profileBio: string;
	profileAvatar: string;
	onNameChange: (value: string) => void;
	onBioChange: (value: string) => void;
	onAvatarChange: (url: string) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Profile
					</CardTitle>
				</h2>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Avatar upload */}
				<div className="flex flex-col items-center gap-3">
					<ImageUploadField
						value={profileAvatar}
						purpose="avatar"
						aspectRatio="square"
						onUploadComplete={onAvatarChange}
					/>
					<p className="text-micro text-muted-foreground">Recommended: 400x400px, max 5MB</p>
				</div>

				{/* Name field */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<Label htmlFor="a-name" className="text-xs">
							Display Name
						</Label>
						<span className="text-micro tabular-nums text-muted-foreground">
							{profileName.length}/50
						</span>
					</div>
					<Input
						id="a-name"
						value={profileName}
						onChange={(e) => onNameChange(e.target.value.slice(0, 50))}
						maxLength={50}
						placeholder="Your display name"
					/>
				</div>

				{/* Bio field */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<Label htmlFor="a-bio" className="text-xs">
							Bio
						</Label>
						<span className="text-micro tabular-nums text-muted-foreground">
							{profileBio.length}/300
						</span>
					</div>
					<textarea
						id="a-bio"
						value={profileBio}
						onChange={(e) => onBioChange(e.target.value.slice(0, 300))}
						rows={4}
						maxLength={300}
						placeholder="A short bio about you"
						className="dark:bg-input/30 border-input w-full rounded-md border bg-transparent backdrop-blur-sm px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
					/>
				</div>
			</CardContent>
		</Card>
	);
}
