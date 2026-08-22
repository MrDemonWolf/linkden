"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Key, Loader2, Lock, Mail, QrCode, Settings2, Shield, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SectionCard, SectionHeader } from "@/components/admin/section-header";
import {
	PreferencesSection,
	parsePreferences,
	serializePreferences,
} from "@/components/admin/settings/preferences-section";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

// ─── Settings → Account ────────────────────────────────────────────────────
// Login & Security (email, password, 2FA, magic link) → Preferences (timezone,
// admin branding, login page). The public profile is edited on Links → Profile
// and the danger zone lives on Settings → Data.

function relativeDays(date: Date | null | undefined): string {
	if (!date) return "never changed";
	const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
	if (days === 0) return "changed today";
	if (days === 1) return "changed yesterday";
	return `last changed ${days} days ago`;
}

export function AccountTab() {
	const qc = useQueryClient();
	const { data: session } = authClient.useSession();
	const user = session?.user;

	// ─── Preferences (settings-backed, own save scope) ───────────────────
	const prefs = useSettingsForm({
		parse: parsePreferences,
		serialize: serializePreferences,
		successMessage: "Preferences saved",
		onSaved: useCallback(() => {
			for (const key of ["admin_branding_enabled", "timezone"] as const) {
				qc.invalidateQueries({ queryKey: trpc.settings.get.queryOptions({ key }).queryKey });
			}
		}, [qc]),
	});

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
				callbackURL: "/admin/settings",
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
				// A password change is usually "someone else may have my session":
				// drop every other session so a stolen one stops working.
				{ currentPassword, newPassword, revokeOtherSessions: true },
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

	// ─── Magic Link Toggle (instant save) ───────────────────────────────
	const magicLinkQuery = useQuery(trpc.settings.get.queryOptions({ key: "magic_link_enabled" }));
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	// Secrets come back masked, so "non-empty" is all we can (and need to) know.
	const emailConfigured = !!settingsQuery.data?.email_api_key;
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

	// updatedAt as a proxy for "last password change" — auth doesn't track this separately.
	const userUpdatedAt = user?.updatedAt ? new Date(user.updatedAt) : null;

	if (prefs.isLoading || !prefs.state) {
		return (
			<div className="space-y-6" aria-busy="true" role="status" aria-label="Loading account">
				<Skeleton className="h-64" />
				<Skeleton className="h-48" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* ─── Login & Security ─── */}
			<Card>
				<SectionHeader icon={Lock} title="Login & Security" variant="muted" />
				<CardContent className="space-y-0 pt-0">
					{/* Email row */}
					<div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-dashed border-border py-3">
						<div className="min-w-0">
							<div className="flex items-center gap-1.5 text-xs font-medium">
								<Mail className="h-3 w-3 text-muted-foreground" />
								Email
							</div>
							<div className="truncate font-mono text-micro text-muted-foreground">
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
						<div className="space-y-2 border-b border-dashed border-border py-3">
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
								<p id="newEmail-error" role="alert" className="text-micro text-destructive">
									{emailError}
								</p>
							) : (
								<p className="text-micro text-muted-foreground">
									A verification link will be sent to your current email.
								</p>
							)}
						</div>
					)}

					{/* Password row */}
					<div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-dashed border-border py-3">
						<div className="min-w-0">
							<div className="text-xs font-medium">Password</div>
							<div className="text-micro text-muted-foreground">{relativeDays(userUpdatedAt)}</div>
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
							className="space-y-3 border-b border-dashed border-border py-3"
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
										className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground md:h-9 md:w-9"
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
										className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground md:h-9 md:w-9"
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
									<p id="newPw-error" role="alert" className="text-micro text-destructive">
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
									<p id="confirmPw-error" role="alert" className="text-micro text-destructive">
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
					<div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-dashed border-border py-3">
						<div className="min-w-0">
							<div className="text-xs font-medium">Two-factor authentication</div>
							<div className="text-micro text-muted-foreground">TOTP via authenticator app</div>
						</div>
						<Badge variant={is2faEnabled ? "default" : "secondary"} className="text-micro">
							{is2faEnabled ? "enabled" : "disabled"}
						</Badge>
						<Switch
							checked={is2faEnabled}
							onCheckedChange={(checked) => open2faModal(checked ? "enable" : "disable")}
							aria-label="Two-factor authentication"
						/>
					</div>

					{/* Magic link row */}
					<div className="grid grid-cols-[1fr_auto] items-center gap-3 py-3">
						<div className="min-w-0">
							<div className="text-xs font-medium">Magic link sign-in</div>
							<div className="text-micro text-muted-foreground">
								{emailConfigured ? (
									"passwordless · email-only"
								) : (
									<>
										Needs an email provider —{" "}
										<Link href="/admin/settings/email" className="text-primary hover:underline">
											configure Email
										</Link>
									</>
								)}
							</div>
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

			{/* ─── Preferences ─── */}
			<SectionCard
				icon={Settings2}
				title="Preferences"
				description="Timezone, admin branding, and the login screen"
			>
				<PreferencesSection state={prefs.state} onChange={prefs.setState} />
			</SectionCard>

			<StickySaveBar
				isDirty={prefs.isDirty}
				isSaving={prefs.isSaving}
				onSave={prefs.save}
				onDiscard={prefs.reset}
			/>

			{/* ─── 2FA Modal ─── */}
			<Dialog
				open={twoFaModalOpen}
				onOpenChange={(v) => !v && !is2faLoading && setTwoFaModalOpen(false)}
			>
				<DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-1.5 text-sm font-semibold">
							<Key className="h-4 w-4" />
							{twoFaMode === "disable"
								? "Disable two-factor"
								: twoFaMode === "verify"
									? "Verify authenticator"
									: "Enable two-factor"}
						</DialogTitle>
					</DialogHeader>

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
							<div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
								<p className="flex items-center gap-1.5 text-xs font-medium">
									<QrCode className="h-3.5 w-3.5" />
									Scan with your authenticator app
								</p>
								{qrDataUrl ? (
									<img src={qrDataUrl} alt="TOTP QR code" className="mx-auto rounded-md" />
								) : (
									<div className="mx-auto flex h-[200px] w-[200px] items-center justify-center">
										<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									</div>
								)}
								{totpUri && (
									<details className="text-xs">
										<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
											Manual entry key
										</summary>
										<code className="mt-1 block break-all rounded bg-muted px-2 py-1 text-micro">
											{totpUri}
										</code>
									</details>
								)}
							</div>
							{backupCodes.length > 0 && (
								<div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
									<p className="flex items-center gap-1.5 text-xs font-medium text-warning">
										<Key className="h-3.5 w-3.5" />
										Save your backup codes
									</p>
									<div className="grid grid-cols-2 gap-1">
										{backupCodes.map((code) => (
											<code key={code} className="font-mono text-micro text-muted-foreground">
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
				</DialogContent>
			</Dialog>
		</div>
	);
}
