"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	Eye,
	EyeOff,
	Key,
	Loader2,
	Lock,
	Mail,
	QrCode,
	Save,
	Shield,
	Undo2,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProfileSection } from "@/components/admin/appearance/profile-section";
import { PageHeader } from "@/components/admin/page-header";
import { SectionHeader } from "@/components/admin/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { DangerConfirmDialog } from "./danger-confirm-dialog";

// ─── Account Page — Stacked Sections ───────────────────────────────────────
// Single-column layout: Profile → Login & Security → Danger zone.
// Profile fields persist via the same site_settings keys used by the public
// page renderer (profile_name, bio, avatar_url) so changes propagate live.

function relativeDays(date: Date | null | undefined): string {
	if (!date) return "never changed";
	const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
	if (days === 0) return "changed today";
	if (days === 1) return "changed yesterday";
	return `last changed ${days} days ago`;
}

export default function AccountPage() {
	const qc = useQueryClient();
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const user = session?.user;
	const { getAnimationProps } = useEntranceAnimation();

	// ─── Profile (settings-backed) ───────────────────────────────────────
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());
	const settings = settingsQuery.data ?? {};

	const [profileName, setProfileName] = useState("");
	const [profileBio, setProfileBio] = useState("");
	const [profileAvatar, setProfileAvatar] = useState("");
	const [savedProfile, setSavedProfile] = useState({ name: "", bio: "", avatar: "" });

	useEffect(() => {
		if (settingsQuery.data) {
			const name = settings.profile_name ?? "";
			const bio = settings.bio ?? "";
			const avatar = settings.avatar_url ?? "";
			setProfileName(name);
			setProfileBio(bio);
			setProfileAvatar(avatar);
			setSavedProfile({ name, bio, avatar });
		}
	}, [settingsQuery.data, settings.profile_name, settings.bio, settings.avatar_url]);

	const profileDirty =
		profileName !== savedProfile.name ||
		profileBio !== savedProfile.bio ||
		profileAvatar !== savedProfile.avatar;

	useUnsavedChanges(profileDirty);

	const handleSaveProfile = async () => {
		try {
			await updateSettings.mutateAsync([
				{ key: "profile_name", value: profileName },
				{ key: "bio", value: profileBio },
				{ key: "avatar_url", value: profileAvatar },
			]);
			setSavedProfile({ name: profileName, bio: profileBio, avatar: profileAvatar });
			qc.invalidateQueries({ queryKey: trpc.settings.getAll.queryOptions().queryKey });
			toast.success("Profile saved");
		} catch {
			toast.error("Failed to save profile");
		}
	};

	const handleDiscardProfile = () => {
		setProfileName(savedProfile.name);
		setProfileBio(savedProfile.bio);
		setProfileAvatar(savedProfile.avatar);
	};

	// ─── Email change ────────────────────────────────────────────────────
	const [emailEditing, setEmailEditing] = useState(false);
	const [newEmail, setNewEmail] = useState("");
	const [emailError, setEmailError] = useState<string | null>(null);
	const [isChangingEmail, setIsChangingEmail] = useState(false);

	const validateEmail = (value: string): string | null => {
		if (!value.trim()) return "Enter an email address";
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
		return null;
	};

	const handleChangeEmail = async () => {
		const err = validateEmail(newEmail);
		if (err) {
			setEmailError(err);
			return;
		}
		setEmailError(null);
		setIsChangingEmail(true);
		try {
			await (
				authClient as unknown as {
					changeEmail: (args: {
						newEmail: string;
						callbackURL: string;
					}) => Promise<{ error?: { message?: string } }>;
				}
			).changeEmail({
				newEmail,
				callbackURL: "/admin/account",
			});
			toast.success("Verification email sent to your current address");
			setEmailEditing(false);
			setNewEmail("");
			setEmailError(null);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to change email";
			toast.error(msg);
		} finally {
			setIsChangingEmail(false);
		}
	};

	// ─── Password change ─────────────────────────────────────────────────
	const [passwordOpen, setPasswordOpen] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showCurrentPw, setShowCurrentPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [isChangingPw, setIsChangingPw] = useState(false);
	const [newPwError, setNewPwError] = useState<string | null>(null);
	const [confirmPwError, setConfirmPwError] = useState<string | null>(null);

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		const newErr = newPassword.length < 8 ? "Password must be at least 8 characters" : null;
		const confirmErr = newPassword !== confirmPassword ? "Passwords do not match" : null;
		setNewPwError(newErr);
		setConfirmPwError(confirmErr);
		if (newErr || confirmErr) return;
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
						setNewPwError(null);
						setConfirmPwError(null);
						setPasswordOpen(false);
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

	// ─── 2FA ──────────────────────────────────────────────────────────────
	const [twoFaPassword, setTwoFaPassword] = useState("");
	const [twoFaCode, setTwoFaCode] = useState("");
	const [totpUri, setTotpUri] = useState<string | null>(null);
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [is2faEnabled, setIs2faEnabled] = useState(false);
	const [is2faLoading, setIs2faLoading] = useState(false);
	const [twoFaModalOpen, setTwoFaModalOpen] = useState(false);
	const [twoFaMode, setTwoFaMode] = useState<"enable" | "disable" | "verify">("enable");
	const twoFaDialogRef = useRef<HTMLDivElement>(null);
	const twoFaCloseRef = useRef<HTMLButtonElement>(null);
	const twoFaTriggerRef = useRef<HTMLElement | null>(null);

	const handleTwoFaKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape" && !is2faLoading) {
				setTwoFaModalOpen(false);
			}
			// Focus trap
			if (e.key === "Tab" && twoFaDialogRef.current) {
				const focusable = twoFaDialogRef.current.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
				);
				const first = focusable[0];
				const last = focusable[focusable.length - 1];

				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		},
		[is2faLoading],
	);

	useEffect(() => {
		if (twoFaModalOpen) {
			twoFaTriggerRef.current = document.activeElement as HTMLElement | null;
			document.addEventListener("keydown", handleTwoFaKeyDown);
			// Focus the close button on open
			requestAnimationFrame(() => twoFaCloseRef.current?.focus());
			return () => {
				document.removeEventListener("keydown", handleTwoFaKeyDown);
				twoFaTriggerRef.current?.focus();
				twoFaTriggerRef.current = null;
			};
		}
	}, [twoFaModalOpen, handleTwoFaKeyDown]);

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

	const open2faModal = (mode: "enable" | "disable") => {
		setTwoFaMode(mode);
		setTwoFaPassword("");
		setTwoFaCode("");
		setTotpUri(null);
		setBackupCodes([]);
		setTwoFaModalOpen(true);
	};

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
				setTwoFaMode("verify");
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
			toast.error("Enter the 6-digit code");
			return;
		}
		setIs2faLoading(true);
		try {
			await authClient.twoFactor.verifyTotp(
				{ code: twoFaCode },
				{
					onSuccess: () => {
						setIs2faEnabled(true);
						setTwoFaModalOpen(false);
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
						setTwoFaModalOpen(false);
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

	// ─── Magic Link Toggle ──────────────────────────────────────────────
	const magicLinkQuery = useQuery(trpc.settings.get.queryOptions({ key: "magic_link_enabled" }));
	const updateSettingsMl = useMutation(trpc.settings.updateBulk.mutationOptions());
	const [magicLinkEnabled, setMagicLinkEnabled] = useState(false);

	useEffect(() => {
		if (magicLinkQuery.data !== undefined) {
			setMagicLinkEnabled(magicLinkQuery.data?.value === "true");
		}
	}, [magicLinkQuery.data]);

	const handleMagicLinkToggle = async (enabled: boolean) => {
		setMagicLinkEnabled(enabled);
		try {
			await updateSettingsMl.mutateAsync([{ key: "magic_link_enabled", value: String(enabled) }]);
			qc.invalidateQueries({
				queryKey: trpc.settings.get.queryOptions({ key: "magic_link_enabled" }).queryKey,
			});
			toast.success(`Magic link sign-in ${enabled ? "enabled" : "disabled"}`);
		} catch {
			setMagicLinkEnabled(!enabled);
			toast.error("Failed to update setting");
		}
	};

	// ─── Danger zone ─────────────────────────────────────────────────────
	const deleteAllContent = useMutation(trpc.danger.deleteAllContent.mutationOptions());
	const resetEverything = useMutation(trpc.danger.resetEverything.mutationOptions());
	const [deleteContentOpen, setDeleteContentOpen] = useState(false);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);

	const handleDeleteAllContent = async () => {
		try {
			await deleteAllContent.mutateAsync();
			toast.success("All content removed");
			qc.invalidateQueries();
			setDeleteContentOpen(false);
		} catch {
			toast.error("Failed to delete content");
		}
	};

	const handleResetEverything = async () => {
		try {
			await resetEverything.mutateAsync();
			await authClient.signOut();
			toast.success("LinkDen reset — restarting setup");
			router.push("/admin/setup");
		} catch {
			toast.error("Failed to reset");
		}
	};

	// updatedAt as a proxy for "last password change" — auth doesn't track this separately.
	const userUpdatedAt = user?.updatedAt ? new Date(user.updatedAt) : null;

	if (settingsQuery.isLoading) {
		return (
			<div
				className="space-y-6 max-w-2xl"
				aria-busy="true"
				role="status"
				aria-label="Loading account"
			>
				<Skeleton className="h-12 w-64" />
				<Skeleton className="h-48" />
				<Skeleton className="h-64" />
				<Skeleton className="h-40" />
			</div>
		);
	}

	return (
		<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6 max-w-2xl">
			<PageHeader
				title="Account"
				description={
					profileDirty
						? "You have unsaved profile changes"
						: "Manage your profile, sign-in, and destructive operations"
				}
				badge={
					profileDirty ? (
						<Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
							Unsaved
						</Badge>
					) : undefined
				}
				actions={
					<Button
						size="sm"
						variant={profileDirty ? "default" : "outline"}
						onClick={handleSaveProfile}
						disabled={!profileDirty || updateSettings.isPending}
					>
						<Save className="mr-1.5 h-3.5 w-3.5" />
						{updateSettings.isPending ? "Saving…" : "Save changes"}
					</Button>
				}
			/>

			<div className="space-y-5">
				{/* ─── Profile ─── */}
				<div {...getAnimationProps(0)}>
					<ProfileSection
						profileName={profileName}
						profileBio={profileBio}
						profileAvatar={profileAvatar}
						onNameChange={setProfileName}
						onBioChange={setProfileBio}
						onAvatarChange={setProfileAvatar}
					/>
				</div>

				{/* ─── Login & Security ─── */}
				<div {...getAnimationProps(1)}>
					<Card>
						<SectionHeader icon={Lock} title="Login & Security" variant="muted" />
						<CardContent className="space-y-0 pt-0">
							{/* Email row */}
							<div className="grid grid-cols-[1fr_auto] gap-3 items-center py-3 border-b border-dashed border-border">
								<div className="min-w-0">
									<div className="text-xs font-medium flex items-center gap-1.5">
										<Mail className="h-3 w-3 text-muted-foreground" />
										Email
									</div>
									<div className="text-[11px] font-mono text-muted-foreground truncate">
										{user?.email ?? "—"}
									</div>
								</div>
								{!emailEditing ? (
									<Button size="sm" variant="outline" onClick={() => setEmailEditing(true)}>
										Change
									</Button>
								) : (
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											setEmailEditing(false);
											setNewEmail("");
										}}
										aria-label="Cancel email change"
									>
										<X className="h-3.5 w-3.5" />
									</Button>
								)}
							</div>
							{emailEditing && (
								<div className="py-3 space-y-2 border-b border-dashed border-border">
									<Label htmlFor="newEmail" className="text-xs text-muted-foreground">
										New email address
									</Label>
									<div className="flex gap-2">
										<Input
											id="newEmail"
											type="email"
											value={newEmail}
											onChange={(e) => {
												setNewEmail(e.target.value);
												if (emailError) setEmailError(null);
											}}
											onBlur={() => setEmailError(newEmail ? validateEmail(newEmail) : null)}
											placeholder="you@example.com"
											autoComplete="email"
											aria-invalid={emailError ? true : undefined}
											aria-describedby={emailError ? "newEmail-error" : undefined}
										/>
										<Button
											size="sm"
											onClick={handleChangeEmail}
											disabled={isChangingEmail || !newEmail}
										>
											{isChangingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send"}
										</Button>
									</div>
									{emailError ? (
										<p id="newEmail-error" role="alert" className="text-[11px] text-destructive">
											{emailError}
										</p>
									) : (
										<p className="text-[10px] text-muted-foreground">
											A verification link will be sent to your current email.
										</p>
									)}
								</div>
							)}

							{/* Password row */}
							<div className="grid grid-cols-[1fr_auto] gap-3 items-center py-3 border-b border-dashed border-border">
								<div className="min-w-0">
									<div className="text-xs font-medium">Password</div>
									<div className="text-[11px] text-muted-foreground">
										{relativeDays(userUpdatedAt)}
									</div>
								</div>
								<Button
									size="sm"
									variant={passwordOpen ? "ghost" : "outline"}
									onClick={() => setPasswordOpen((v) => !v)}
									aria-label={passwordOpen ? "Close password form" : undefined}
								>
									{passwordOpen ? <X className="h-3.5 w-3.5" /> : "Change"}
								</Button>
							</div>
							{passwordOpen && (
								<form
									onSubmit={handleChangePassword}
									className="space-y-3 py-3 border-b border-dashed border-border"
								>
									<div className="space-y-1.5">
										<Label htmlFor="currentPw" className="text-xs text-muted-foreground">
											Current password
										</Label>
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
												{showCurrentPw ? (
													<EyeOff className="h-3.5 w-3.5" />
												) : (
													<Eye className="h-3.5 w-3.5" />
												)}
											</button>
										</div>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="newPw" className="text-xs text-muted-foreground">
											New password
										</Label>
										<div className="relative">
											<Input
												id="newPw"
												type={showNewPw ? "text" : "password"}
												value={newPassword}
												onChange={(e) => {
													setNewPassword(e.target.value);
													if (newPwError) setNewPwError(null);
												}}
												onBlur={() =>
													setNewPwError(
														newPassword && newPassword.length < 8
															? "Password must be at least 8 characters"
															: null,
													)
												}
												autoComplete="new-password"
												aria-invalid={newPwError ? true : undefined}
												aria-describedby={newPwError ? "newPw-error" : undefined}
												className="pr-10"
											/>
											<button
												type="button"
												className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
												onClick={() => setShowNewPw(!showNewPw)}
												aria-label={showNewPw ? "Hide password" : "Show password"}
											>
												{showNewPw ? (
													<EyeOff className="h-3.5 w-3.5" />
												) : (
													<Eye className="h-3.5 w-3.5" />
												)}
											</button>
										</div>
										{newPwError && (
											<p id="newPw-error" role="alert" className="text-[11px] text-destructive">
												{newPwError}
											</p>
										)}
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="confirmPw" className="text-xs text-muted-foreground">
											Confirm new password
										</Label>
										<Input
											id="confirmPw"
											type="password"
											value={confirmPassword}
											onChange={(e) => {
												setConfirmPassword(e.target.value);
												if (confirmPwError) setConfirmPwError(null);
											}}
											onBlur={() =>
												setConfirmPwError(
													confirmPassword && confirmPassword !== newPassword
														? "Passwords do not match"
														: null,
												)
											}
											autoComplete="new-password"
											aria-invalid={confirmPwError ? true : undefined}
											aria-describedby={confirmPwError ? "confirmPw-error" : undefined}
										/>
										{confirmPwError && (
											<p id="confirmPw-error" role="alert" className="text-[11px] text-destructive">
												{confirmPwError}
											</p>
										)}
									</div>
									<Button
										type="submit"
										size="sm"
										disabled={isChangingPw || !currentPassword || !newPassword || !confirmPassword}
									>
										{isChangingPw ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
										Update password
									</Button>
								</form>
							)}

							{/* 2FA row */}
							<div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-3 border-b border-dashed border-border">
								<div className="min-w-0">
									<div className="text-xs font-medium">Two-factor authentication</div>
									<div className="text-[11px] text-muted-foreground">
										TOTP via authenticator app
									</div>
								</div>
								<Badge variant={is2faEnabled ? "default" : "secondary"} className="text-[10px]">
									{is2faEnabled ? "enabled" : "disabled"}
								</Badge>
								<Switch
									checked={is2faEnabled}
									onCheckedChange={(checked) => open2faModal(checked ? "enable" : "disable")}
									aria-label="Two-factor authentication"
								/>
							</div>

							{/* Magic link row */}
							<div className="grid grid-cols-[1fr_auto] gap-3 items-center py-3">
								<div className="min-w-0">
									<div className="text-xs font-medium">Magic link sign-in</div>
									<div className="text-[11px] text-muted-foreground">passwordless · email-only</div>
								</div>
								<Switch
									checked={magicLinkEnabled}
									onCheckedChange={handleMagicLinkToggle}
									disabled={updateSettingsMl.isPending}
									aria-label="Magic link sign-in"
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* ─── Danger zone ─── */}
				<div {...getAnimationProps(2)}>
					<Card className="border-destructive/40 bg-destructive/5">
						<SectionHeader icon={AlertTriangle} title="Danger zone" variant="muted" />
						<CardContent className="space-y-3 pt-0">
							<div className="grid grid-cols-[1fr_auto] gap-3 items-center">
								<div className="min-w-0">
									<div className="text-xs font-medium">Delete all content</div>
									<div className="text-[11px] text-muted-foreground">
										removes blocks + analytics · keeps account
									</div>
								</div>
								<Button size="sm" variant="outline" onClick={() => setDeleteContentOpen(true)}>
									Delete
								</Button>
							</div>

							<div className="grid grid-cols-[1fr_auto] gap-3 items-center pt-3 border-t border-dashed border-destructive/30">
								<div className="min-w-0">
									<div className="text-xs font-medium">Reset everything</div>
									<div className="text-[11px] text-muted-foreground">
										full wipe · returns to setup wizard
									</div>
								</div>
								<Button size="sm" variant="destructive" onClick={() => setResetDialogOpen(true)}>
									Reset…
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sticky profile save bar — mirrors the Settings sticky-pill pattern */}
				{profileDirty && (
					<div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border border-primary/60 bg-background/95 px-4 py-2.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] backdrop-blur">
						<span className="text-xs text-muted-foreground">You have unsaved profile changes</span>
						<div className="flex gap-2">
							<Button variant="ghost" size="sm" onClick={handleDiscardProfile}>
								<Undo2 className="mr-1.5 h-3.5 w-3.5" />
								Discard
							</Button>
							<Button size="sm" disabled={updateSettings.isPending} onClick={handleSaveProfile}>
								<Save className="mr-1.5 h-3.5 w-3.5" />
								{updateSettings.isPending ? "Saving…" : "Save changes"}
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* ─── 2FA Modal ─── */}
			{twoFaModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<button
						type="button"
						aria-label="Close"
						className="fixed inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => !is2faLoading && setTwoFaModalOpen(false)}
					/>
					<div
						ref={twoFaDialogRef}
						role="dialog"
						aria-modal="true"
						aria-labelledby="twofa-dialog-title"
						className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-white dark:bg-neutral-900 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
					>
						<div className="flex items-center justify-between mb-4">
							<h2
								id="twofa-dialog-title"
								className="text-sm font-semibold flex items-center gap-1.5"
							>
								<Key className="h-4 w-4" />
								{twoFaMode === "disable"
									? "Disable two-factor"
									: twoFaMode === "verify"
										? "Verify authenticator"
										: "Enable two-factor"}
							</h2>
							<Button
								ref={twoFaCloseRef}
								size="sm"
								variant="ghost"
								onClick={() => setTwoFaModalOpen(false)}
								disabled={is2faLoading}
								aria-label="Close dialog"
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>

						{twoFaMode !== "verify" && (
							<div className="space-y-4">
								<p className="text-xs text-muted-foreground">
									{twoFaMode === "disable"
										? "Confirm your password to disable two-factor authentication."
										: "Add an extra layer of security by requiring a code from your authenticator app when signing in."}
								</p>
								<div className="space-y-1.5">
									<Label htmlFor="twoFaPw" className="text-xs text-muted-foreground">
										Current password
									</Label>
									<Input
										id="twoFaPw"
										type="password"
										value={twoFaPassword}
										onChange={(e) => setTwoFaPassword(e.target.value)}
										autoComplete="current-password"
									/>
								</div>
								<div className="flex justify-end gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setTwoFaModalOpen(false)}
										disabled={is2faLoading}
									>
										Cancel
									</Button>
									{twoFaMode === "disable" ? (
										<Button
											variant="destructive"
											size="sm"
											onClick={handleDisable2FA}
											disabled={is2faLoading || !twoFaPassword}
										>
											{is2faLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
											Disable
										</Button>
									) : (
										<Button
											size="sm"
											onClick={handleEnable2FA}
											disabled={is2faLoading || !twoFaPassword}
										>
											{is2faLoading ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<Shield className="h-3.5 w-3.5" />
											)}
											Continue
										</Button>
									)}
								</div>
							</div>
						)}

						{twoFaMode === "verify" && (
							<div className="space-y-4">
								<div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
									<p className="text-xs font-medium flex items-center gap-1.5">
										<QrCode className="h-3.5 w-3.5" />
										Scan with your authenticator app
									</p>
									{qrDataUrl ? (
										<img src={qrDataUrl} alt="TOTP QR code" className="rounded-md mx-auto" />
									) : (
										<div className="h-[200px] w-[200px] mx-auto flex items-center justify-center">
											<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
										</div>
									)}
									{totpUri && (
										<details className="text-xs">
											<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
												Manual entry key
											</summary>
											<code className="mt-1 block break-all rounded bg-muted px-2 py-1 text-[10px]">
												{totpUri}
											</code>
										</details>
									)}
								</div>
								{backupCodes.length > 0 && (
									<div className="rounded-lg border border-warning/30 bg-warning/10 p-3 space-y-2">
										<p className="text-xs font-medium text-warning flex items-center gap-1.5">
											<Key className="h-3.5 w-3.5" />
											Save your backup codes
										</p>
										<div className="grid grid-cols-2 gap-1">
											{backupCodes.map((code) => (
												<code key={code} className="text-[10px] font-mono text-muted-foreground">
													{code}
												</code>
											))}
										</div>
									</div>
								)}
								<div className="space-y-1.5">
									<Label htmlFor="twoFaCode" className="text-xs text-muted-foreground">
										Verification code
									</Label>
									<Input
										id="twoFaCode"
										type="text"
										inputMode="numeric"
										autoComplete="one-time-code"
										maxLength={6}
										value={twoFaCode}
										onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
										placeholder="123456"
									/>
								</div>
								<div className="flex justify-end gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setTwoFaModalOpen(false)}
										disabled={is2faLoading}
									>
										Cancel
									</Button>
									<Button
										size="sm"
										onClick={handleVerify2FA}
										disabled={is2faLoading || twoFaCode.length !== 6}
									>
										{is2faLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
										Verify & activate
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ─── Danger-zone confirm dialogs (identical type-to-confirm ceremony) ─── */}
			<DangerConfirmDialog
				open={deleteContentOpen}
				onOpenChange={setDeleteContentOpen}
				title="Delete all content?"
				description="This permanently removes every block, analytics row, and form submission. Your account, settings, and theme stay intact. This cannot be undone."
				confirmWord="DELETE"
				confirmLabel="Delete content"
				isPending={deleteAllContent.isPending}
				onConfirm={handleDeleteAllContent}
			/>

			<DangerConfirmDialog
				open={resetDialogOpen}
				onOpenChange={setResetDialogOpen}
				title="Reset LinkDen completely?"
				description="This wipes all content, analytics, settings, social links, AND your user account. You will be signed out and the setup wizard will start fresh. This cannot be undone."
				confirmWord="RESET"
				confirmLabel="Reset everything"
				isPending={resetEverything.isPending}
				onConfirm={handleResetEverything}
			/>
		</div>
	);
}
