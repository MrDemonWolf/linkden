"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Save,
	Undo2,
	Eye,
	EyeOff,
	Loader2,
	QrCode,
	Shield,
	ShieldOff,
	Key,
	Globe,
	Search,
	Plus,
	Trash2,
	User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { socialBrands } from "@linkden/ui/social-brands";
import { getAccessibleIconFill, isLowLuminance } from "@linkden/ui/color-contrast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { SectionHeader } from "@/components/admin/section-header";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { NetworkRow } from "@/components/admin/social/network-row";
import {
	type NetworkDraft,
	CATEGORY_LABELS,
} from "@/components/admin/social/social-constants";
import { cn, getAdminThemeColors } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

export default function ProfilePage() {
	const qc = useQueryClient();
	const { resolvedTheme } = useTheme();
	const { data: session } = authClient.useSession();
	const user = session?.user;

	// ─── Profile State ─────────────────────────────────────────────────────
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());

	const [profileName, setProfileName] = useState("");
	const [bio, setBio] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");

	const [savedProfileName, setSavedProfileName] = useState("");
	const [savedBio, setSavedBio] = useState("");
	const [savedAvatarUrl, setSavedAvatarUrl] = useState("");

	// Sync from settings query
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
		profileName !== savedProfileName ||
		bio !== savedBio ||
		avatarUrl !== savedAvatarUrl;

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

	const handleDiscardProfile = () => {
		setProfileName(savedProfileName);
		setBio(savedBio);
		setAvatarUrl(savedAvatarUrl);
	};

	// ─── Social Networks State ─────────────────────────────────────────────
	const socialsQuery = useQuery(trpc.social.list.queryOptions());
	const updateBulk = useMutation(trpc.social.updateBulk.mutationOptions());

	const [drafts, setDrafts] = useState<Record<string, NetworkDraft>>({});
	const [socialInitialized, setSocialInitialized] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const dbRows = socialsQuery.data ?? [];

	// Initialize social drafts from DB
	useEffect(() => {
		if (!socialInitialized && !socialsQuery.isLoading) {
			const initial: Record<string, NetworkDraft> = {};
			for (const brand of socialBrands) {
				initial[brand.slug] = { url: "", isActive: false };
			}
			for (const row of dbRows) {
				if (initial[row.slug] !== undefined) {
					initial[row.slug] = { url: row.url, isActive: row.isActive };
				}
			}
			setDrafts(initial);
			setSocialInitialized(true);
		}
	}, [dbRows, socialsQuery.isLoading, socialInitialized]);

	// Build merged list
	const allItems = useMemo(() => {
		return socialBrands.map((brand) => {
			const draft = drafts[brand.slug] ?? { url: "", isActive: false };
			return { ...brand, ...draft };
		});
	}, [drafts]);

	// Active networks
	const activeNetworks = useMemo(() => {
		const list = allItems.filter((s) => s.isActive && s.url);
		list.sort((a, b) => a.name.localeCompare(b.name));
		return list;
	}, [allItems]);

	// Available networks for add (not active, filtered by search)
	const availableNetworks = useMemo(() => {
		const activeSlugs = new Set(activeNetworks.map((s) => s.slug));
		let inactive = allItems.filter((s) => !activeSlugs.has(s.slug));

		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			inactive = inactive.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.slug.toLowerCase().includes(q) ||
					s.category.toLowerCase().includes(q),
			);
		}

		inactive.sort((a, b) => a.name.localeCompare(b.name));
		return inactive.slice(0, 20);
	}, [allItems, activeNetworks, searchQuery]);

	// Detect social changes vs DB
	const socialDirty = useMemo(() => {
		const dbMap = new Map(dbRows.map((r) => [r.slug, r]));

		for (const brand of socialBrands) {
			const draft = drafts[brand.slug];
			if (!draft) continue;
			const db = dbMap.get(brand.slug);

			if (draft.url) {
				if (!db || db.url !== draft.url || db.isActive !== draft.isActive) {
					return true;
				}
			} else {
				if (db) return true;
			}
		}
		return false;
	}, [dbRows, drafts]);

	const handleUrlChange = (slug: string, url: string) => {
		setDrafts((prev) => ({
			...prev,
			[slug]: { ...prev[slug], url },
		}));
	};

	const handleToggle = (slug: string) => {
		setDrafts((prev) => {
			const current = prev[slug];
			if (!current) return prev;
			return {
				...prev,
				[slug]: { ...current, isActive: !current.isActive },
			};
		});
	};

	const handleActivateNetwork = (slug: string) => {
		setDrafts((prev) => ({
			...prev,
			[slug]: { ...prev[slug], isActive: true },
		}));
		setSearchQuery("");
	};

	const handleRemoveNetwork = (slug: string) => {
		setDrafts((prev) => ({
			...prev,
			[slug]: { url: "", isActive: false },
		}));
	};

	const handleDiscardSocial = () => {
		const initial: Record<string, NetworkDraft> = {};
		for (const brand of socialBrands) {
			initial[brand.slug] = { url: "", isActive: false };
		}
		for (const row of dbRows) {
			if (initial[row.slug] !== undefined) {
				initial[row.slug] = { url: row.url, isActive: row.isActive };
			}
		}
		setDrafts(initial);
	};

	const handleSaveSocial = async () => {
		const dbMap = new Map(dbRows.map((r) => [r.slug, r]));
		const changes: Array<{ slug: string; url: string; isActive: boolean }> = [];

		for (const brand of socialBrands) {
			const draft = drafts[brand.slug];
			if (!draft) continue;
			const db = dbMap.get(brand.slug);

			if (draft.url) {
				if (!db || db.url !== draft.url || db.isActive !== draft.isActive) {
					changes.push({ slug: brand.slug, url: draft.url, isActive: draft.isActive });
				}
			} else if (db) {
				changes.push({ slug: brand.slug, url: "", isActive: false });
			}
		}

		if (changes.length === 0) return;

		try {
			await updateBulk.mutateAsync(changes);
			await qc.invalidateQueries({ queryKey: trpc.social.list.queryOptions().queryKey });
			setSocialInitialized(false);
			toast.success(`${changes.length} network${changes.length > 1 ? "s" : ""} updated`);
		} catch {
			toast.error("Failed to save social links");
		}
	};

	// Combined dirty tracking
	const hasChanges = profileDirty || socialDirty;
	useUnsavedChanges(hasChanges);

	// ─── Change Password ─────────────────────────────────────────────────
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showCurrentPw, setShowCurrentPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [isChangingPw, setIsChangingPw] = useState(false);

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}
		if (newPassword.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		setIsChangingPw(true);
		try {
			await authClient.changePassword(
				{ currentPassword, newPassword },
				{
					onSuccess: () => {
						toast.success("Password updated");
						setCurrentPassword("");
						setNewPassword("");
						setConfirmPassword("");
					},
					onError: (err) => {
						toast.error(err.error.message || "Failed to update password");
					},
				},
			);
		} finally {
			setIsChangingPw(false);
		}
	};

	// ─── Two-Factor Auth ─────────────────────────────────────────────────
	const [twoFaPassword, setTwoFaPassword] = useState("");
	const [twoFaCode, setTwoFaCode] = useState("");
	const [totpUri, setTotpUri] = useState<string | null>(null);
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [is2faEnabled, setIs2faEnabled] = useState(false);
	const [is2faLoading, setIs2faLoading] = useState(false);
	const [showTwoFaSetup, setShowTwoFaSetup] = useState(false);

	useEffect(() => {
		if (user && "twoFactorEnabled" in user) {
			setIs2faEnabled(!!(user as Record<string, unknown>).twoFactorEnabled);
		}
	}, [user]);

	useEffect(() => {
		if (!totpUri) {
			setQrDataUrl(null);
			return;
		}
		import("qrcode").then((QRCode) => {
			QRCode.toDataURL(totpUri, { width: 200 }).then(setQrDataUrl);
		});
	}, [totpUri]);

	const handleEnable2FA = async () => {
		if (!twoFaPassword) {
			toast.error("Enter your current password to enable 2FA");
			return;
		}
		setIs2faLoading(true);
		try {
			const result = await authClient.twoFactor.enable({ password: twoFaPassword });
			if (result.data) {
				const data = result.data as Record<string, unknown>;
				setTotpUri((data.totpURI as string | null) ?? null);
				setBackupCodes((data.backupCodes as string[]) ?? []);
				setShowTwoFaSetup(true);
				toast.success("Scan the QR code with your authenticator app");
			}
		} catch {
			toast.error("Failed to enable 2FA");
		} finally {
			setIs2faLoading(false);
		}
	};

	const handleVerify2FA = async () => {
		if (!twoFaCode) {
			toast.error("Enter the 6-digit code from your authenticator");
			return;
		}
		setIs2faLoading(true);
		try {
			await authClient.twoFactor.verifyTotp(
				{ code: twoFaCode },
				{
					onSuccess: () => {
						setIs2faEnabled(true);
						setShowTwoFaSetup(false);
						setTotpUri(null);
						setBackupCodes([]);
						setTwoFaPassword("");
						setTwoFaCode("");
						toast.success("Two-factor authentication enabled");
					},
					onError: (err) => {
						toast.error(err.error.message || "Invalid code");
					},
				},
			);
		} finally {
			setIs2faLoading(false);
		}
	};

	const handleDisable2FA = async () => {
		if (!twoFaPassword) {
			toast.error("Enter your current password to disable 2FA");
			return;
		}
		setIs2faLoading(true);
		try {
			await authClient.twoFactor.disable(
				{ password: twoFaPassword },
				{
					onSuccess: () => {
						setIs2faEnabled(false);
						setTwoFaPassword("");
						toast.success("Two-factor authentication disabled");
					},
					onError: (err) => {
						toast.error(err.error.message || "Failed to disable 2FA");
					},
				},
			);
		} finally {
			setIs2faLoading(false);
		}
	};

	// ─── Magic Link Toggle ─────────────────────────────────────────────
	const magicLinkQuery = useQuery(trpc.settings.get.queryOptions({ key: "magic_link_enabled" }));
	const updateSettingsMl = useMutation(trpc.settings.updateBulk.mutationOptions());
	const [magicLinkEnabled, setMagicLinkEnabled] = useState(true);

	useEffect(() => {
		if (magicLinkQuery.data !== undefined) {
			setMagicLinkEnabled(magicLinkQuery.data?.value !== "false");
		}
	}, [magicLinkQuery.data]);

	const handleMagicLinkToggle = async (enabled: boolean) => {
		setMagicLinkEnabled(enabled);
		try {
			await updateSettingsMl.mutateAsync([
				{ key: "magic_link_enabled", value: String(enabled) },
			]);
			qc.invalidateQueries({ queryKey: trpc.settings.get.queryOptions({ key: "magic_link_enabled" }).queryKey });
			toast.success(`Magic link sign-in ${enabled ? "enabled" : "disabled"}`);
		} catch {
			setMagicLinkEnabled(!enabled);
			toast.error("Failed to update setting");
		}
	};

	const activeCount = Object.values(drafts).filter((d) => d.isActive && d.url).length;
	const isLoading = settingsQuery.isLoading || socialsQuery.isLoading;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<PageHeader title="Profile" description="Manage your profile, social links, and account security" />
				<div className="grid gap-6 lg:grid-cols-2">
					<div className="space-y-6">
						<Card><CardContent className="pt-4 space-y-4">
							<div className="h-24 w-24 mx-auto rounded-full bg-muted animate-pulse" />
							<div className="h-8 w-full rounded bg-muted animate-pulse" />
							<div className="h-20 w-full rounded bg-muted animate-pulse" />
						</CardContent></Card>
					</div>
					<div className="space-y-6">
						<Card><CardContent className="pt-4 space-y-4">
							<div className="h-8 w-full rounded bg-muted animate-pulse" />
							<div className="h-8 w-full rounded bg-muted animate-pulse" />
							<div className="h-8 w-full rounded bg-muted animate-pulse" />
						</CardContent></Card>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Profile"
				description="Manage your profile, social links, and account security"
				badge={
					activeCount > 0 ? (
						<Badge variant="outline" className="gap-1 border-primary/30 text-primary">
							<Globe className="h-3 w-3" aria-hidden="true" />
							{activeCount} social link{activeCount !== 1 ? "s" : ""}
						</Badge>
					) : undefined
				}
				actions={
					hasChanges ? (
						<>
							<Button variant="ghost" size="sm" onClick={() => { handleDiscardProfile(); handleDiscardSocial(); }}>
								<Undo2 className="mr-1.5 h-3.5 w-3.5" />
								Discard
							</Button>
							<Button
								size="sm"
								onClick={async () => {
									if (profileDirty) await handleSaveProfile();
									if (socialDirty) await handleSaveSocial();
								}}
								disabled={updateSettings.isPending || updateBulk.isPending}
								className="shadow-lg shadow-primary/25 ring-2 ring-primary/20"
							>
								<Save className="mr-1.5 h-3.5 w-3.5" />
								{updateSettings.isPending || updateBulk.isPending ? "Saving..." : "Save All"}
							</Button>
						</>
					) : undefined
				}
			/>

			{/* ── Two-Column Layout ─────────────────────────────────────────── */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* ── Left Column: Profile Info ──────────────────────────────── */}
				<div className="space-y-6">
					{/* Avatar + Name + Bio */}
					<Card>
						<SectionHeader icon={User} title="Profile Info" variant="primary" />
						<CardContent className="space-y-5">
							{/* Avatar Upload */}
							<ImageUploadField
								label="Avatar"
								value={avatarUrl}
								purpose="avatar"
								onUploadComplete={(url) => setAvatarUrl(url)}
								aspectRatio="square"
							/>

							{/* Display Name */}
							<div className="space-y-1.5">
								<Label htmlFor="profileName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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

							{/* Bio */}
							<div className="space-y-1.5">
								<Label htmlFor="bio" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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

							{/* Profile-specific save button */}
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

					{/* ── Security Section ──────────────────────────────────── */}
					<Card>
						<SectionHeader icon={Shield} title="Security" variant="muted" />
						<CardContent className="space-y-6">
							{/* Change Password */}
							<div className="space-y-3">
								<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Change Password</h3>
								<form onSubmit={handleChangePassword} className="space-y-3">
									<div className="space-y-1.5">
										<Label htmlFor="currentPw" className="text-xs text-muted-foreground">Current Password</Label>
										<div className="relative">
											<Input
												id="currentPw"
												type={showCurrentPw ? "text" : "password"}
												value={currentPassword}
												onChange={(e) => setCurrentPassword(e.target.value)}
												autoComplete="current-password"
												className="pr-10"
											/>
											<button
												type="button"
												className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
												onClick={() => setShowCurrentPw(!showCurrentPw)}
												aria-label={showCurrentPw ? "Hide password" : "Show password"}
											>
												{showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
											</button>
										</div>
									</div>

									<div className="space-y-1.5">
										<Label htmlFor="newPw" className="text-xs text-muted-foreground">New Password</Label>
										<div className="relative">
											<Input
												id="newPw"
												type={showNewPw ? "text" : "password"}
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												autoComplete="new-password"
												className="pr-10"
											/>
											<button
												type="button"
												className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
												onClick={() => setShowNewPw(!showNewPw)}
												aria-label={showNewPw ? "Hide password" : "Show password"}
											>
												{showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
											</button>
										</div>
									</div>

									<div className="space-y-1.5">
										<Label htmlFor="confirmPw" className="text-xs text-muted-foreground">Confirm New Password</Label>
										<Input
											id="confirmPw"
											type="password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											autoComplete="new-password"
										/>
									</div>

									<Button
										type="submit"
										size="sm"
										disabled={isChangingPw || !currentPassword || !newPassword || !confirmPassword}
									>
										{isChangingPw ? (
											<><Loader2 className="h-4 w-4 animate-spin" /> Updating...</>
										) : (
											"Update Password"
										)}
									</Button>
								</form>
							</div>

							{/* Two-Factor Auth */}
							<div className="space-y-3 border-t border-border/50 pt-4">
								<div className="flex items-center justify-between">
									<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Two-Factor Authentication</h3>
									<Badge variant={is2faEnabled ? "default" : "secondary"} className="text-[10px]">
										{is2faEnabled ? "Enabled" : "Disabled"}
									</Badge>
								</div>

								<p className="text-[11px] text-muted-foreground">
									Add an extra layer of security by requiring a code from your authenticator app when signing in.
								</p>

								{!showTwoFaSetup ? (
									<div className="space-y-3">
										<div className="space-y-1.5">
											<Label htmlFor="twoFaPw" className="text-xs text-muted-foreground">Current Password</Label>
											<Input
												id="twoFaPw"
												type="password"
												value={twoFaPassword}
												onChange={(e) => setTwoFaPassword(e.target.value)}
												autoComplete="current-password"
												placeholder="Required to change 2FA settings"
											/>
										</div>
										{is2faEnabled ? (
											<Button variant="destructive" size="sm" onClick={handleDisable2FA} disabled={is2faLoading || !twoFaPassword}>
												{is2faLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
												Disable 2FA
											</Button>
										) : (
											<Button variant="outline" size="sm" onClick={handleEnable2FA} disabled={is2faLoading || !twoFaPassword}>
												{is2faLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
												Enable 2FA
											</Button>
										)}
									</div>
								) : (
									<div className="space-y-4">
										<div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
											<p className="text-xs font-medium flex items-center gap-1.5">
												<QrCode className="h-3.5 w-3.5" />
												Scan this QR code with your authenticator app
											</p>
											{qrDataUrl ? (
												<img src={qrDataUrl} alt="TOTP QR code" className="rounded-md" />
											) : (
												<div className="h-[200px] w-[200px] flex items-center justify-center">
													<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
												</div>
											)}
											{totpUri && (
												<details className="text-xs">
													<summary className="cursor-pointer text-muted-foreground hover:text-foreground">Manual entry key</summary>
													<code className="mt-1 block break-all rounded bg-muted px-2 py-1 text-[10px]">{totpUri}</code>
												</details>
											)}
										</div>

										{backupCodes.length > 0 && (
											<div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
												<p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
													<Key className="h-3.5 w-3.5" />
													Save your backup codes
												</p>
												<div className="grid grid-cols-2 gap-1">
													{backupCodes.map((code) => (
														<code key={code} className="text-[10px] font-mono text-muted-foreground">{code}</code>
													))}
												</div>
											</div>
										)}

										<div className="space-y-1.5">
											<Label htmlFor="twoFaCode" className="text-xs text-muted-foreground">Verification Code</Label>
											<Input
												id="twoFaCode"
												type="text"
												inputMode="numeric"
												maxLength={6}
												value={twoFaCode}
												onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
												placeholder="123456"
											/>
										</div>

										<div className="flex gap-2">
											<Button size="sm" onClick={handleVerify2FA} disabled={is2faLoading || twoFaCode.length !== 6}>
												{is2faLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
												Verify & Activate
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => {
													setShowTwoFaSetup(false);
													setTotpUri(null);
													setBackupCodes([]);
													setTwoFaCode("");
													setTwoFaPassword("");
												}}
											>
												Cancel
											</Button>
										</div>
									</div>
								)}
							</div>

							{/* Magic Link Toggle */}
							<div className="space-y-3 border-t border-border/50 pt-4">
								<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Magic Link Sign-In</h3>
								<div className="flex items-start justify-between gap-4">
									<div className="space-y-1">
										<p className="text-xs font-medium">Allow Magic Link Login</p>
										<p className="text-[11px] text-muted-foreground">
											Allow signing in via a one-time email link instead of a password. Requires email to be configured in Settings.
										</p>
									</div>
									<Switch
										checked={magicLinkEnabled}
										onCheckedChange={handleMagicLinkToggle}
										disabled={updateSettingsMl.isPending}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* ── Right Column: Social Links ────────────────────────────── */}
				<div className="space-y-6">
					{/* Active Social Links */}
					<Card className="border-t-2 border-t-primary bg-gradient-to-b from-primary/5 to-transparent">
						<SectionHeader icon={Globe} title="Active Social Links" count={activeCount} variant="primary" />
						<CardContent className="space-y-3">
							{activeNetworks.length === 0 ? (
								<div className="py-8 text-center">
									<Globe className="mx-auto h-8 w-8 text-muted-foreground/40" />
									<p className="mt-2 text-xs text-muted-foreground">No social links yet</p>
									<p className="mt-1 text-[11px] text-muted-foreground">
										Search below to add your first social network
									</p>
								</div>
							) : (
								<div className="space-y-2.5" role="list" aria-label="Active social networks">
									{activeNetworks.map((social) => {
										const draft = drafts[social.slug] ?? { url: "", isActive: false };
										const brand = socialBrands.find((b) => b.slug === social.slug)!;
										return (
											<div key={social.slug} id={`network-${social.slug}`} className="group relative rounded-xl transition-all">
												<NetworkRow
													social={brand}
													draft={draft}
													onUrlChange={handleUrlChange}
													onToggle={handleToggle}
												/>
												<button
													type="button"
													onClick={() => handleRemoveNetwork(social.slug)}
													className="absolute -right-1 -top-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-opacity"
													aria-label={`Remove ${social.name}`}
												>
													<Trash2 className="h-3 w-3" />
												</button>
											</div>
										);
									})}
								</div>
							)}

							{/* Social-specific save */}
							{socialDirty && (
								<div className="flex gap-2 pt-2 border-t border-border/30">
									<Button variant="ghost" size="sm" onClick={handleDiscardSocial} className="flex-1">
										<Undo2 className="mr-1.5 h-3.5 w-3.5" />
										Discard
									</Button>
									<Button
										size="sm"
										onClick={handleSaveSocial}
										disabled={updateBulk.isPending}
										className="flex-1 shadow-lg shadow-primary/25"
									>
										<Save className="mr-1.5 h-3.5 w-3.5" />
										{updateBulk.isPending ? "Saving..." : "Save Social Links"}
									</Button>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Add Social Network */}
					<Card>
						<SectionHeader icon={Plus} title="Add Social Network" variant="muted" />
						<CardContent className="space-y-3">
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="Search networks..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-8"
									aria-label="Search social networks to add"
								/>
							</div>

							{availableNetworks.length === 0 ? (
								<p className="py-4 text-center text-xs text-muted-foreground">
									{searchQuery ? "No matching networks found" : "All networks are active"}
								</p>
							) : (
								<div className="grid gap-1.5 max-h-[400px] overflow-y-auto pr-1">
									{availableNetworks.map((network) => {
										const { bg, fg } = getAdminThemeColors(resolvedTheme);
										const fill = getAccessibleIconFill(network.hex, bg, fg);
										const needsRing = isLowLuminance(network.hex);
										return (
											<button
												key={network.slug}
												type="button"
												onClick={() => handleActivateNetwork(network.slug)}
												className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50 group/item"
											>
												<div
													className={cn(
														"flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
														needsRing && "ring-1 ring-border dark:ring-white/20",
													)}
													style={{ backgroundColor: `${network.hex}15` }}
												>
													<svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
														<path d={network.svgPath} fill={fill} />
													</svg>
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-xs font-medium truncate">{network.name}</p>
													<p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[network.category] || network.category}</p>
												</div>
												<Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
											</button>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
