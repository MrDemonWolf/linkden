"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, QrCode, Shield, ShieldOff, Key } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { getGravatarUrl } from "@/lib/gravatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

function initials(name?: string | null) {
	if (!name) return "?";
	return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
	const qc = useQueryClient();
	const { data: session } = authClient.useSession();
	const user = session?.user;


	// ----- Change Password -----
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

	// ----- Two-Factor Auth -----
	const [twoFaPassword, setTwoFaPassword] = useState("");
	const [twoFaCode, setTwoFaCode] = useState("");
	const [totpUri, setTotpUri] = useState<string | null>(null);
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [is2faEnabled, setIs2faEnabled] = useState(false);
	const [is2faLoading, setIs2faLoading] = useState(false);
	const [showTwoFaSetup, setShowTwoFaSetup] = useState(false);

	// Sync 2FA status from session
	useEffect(() => {
		if (user && "twoFactorEnabled" in user) {
			setIs2faEnabled(!!(user as Record<string, unknown>).twoFactorEnabled);
		}
	}, [user]);

	// Generate QR code once we have a totpUri
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

	// ----- Magic Link Toggle -----
	const magicLinkQuery = useQuery(trpc.settings.get.queryOptions({ key: "magic_link_enabled" }));
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());
	const [magicLinkEnabled, setMagicLinkEnabled] = useState(true);

	useEffect(() => {
		if (magicLinkQuery.data !== undefined) {
			setMagicLinkEnabled(magicLinkQuery.data?.value !== "false");
		}
	}, [magicLinkQuery.data]);

	const handleMagicLinkToggle = async (enabled: boolean) => {
		setMagicLinkEnabled(enabled);
		try {
			await updateSettings.mutateAsync([
				{ key: "magic_link_enabled", value: String(enabled) },
			]);
			qc.invalidateQueries({ queryKey: trpc.settings.get.queryOptions({ key: "magic_link_enabled" }).queryKey });
			toast.success(`Magic link sign-in ${enabled ? "enabled" : "disabled"}`);
		} catch {
			setMagicLinkEnabled(!enabled);
			toast.error("Failed to update setting");
		}
	};


	const gravatarUrl = user?.email ? getGravatarUrl(user.email, 80) : undefined;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Profile"
				description="Manage your account security and sign-in options"
			/>

			{/* Account Info */}
			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">Account</h2>
					<div className="flex items-center gap-4">
						<Avatar className="h-16 w-16">
							<AvatarImage src={user?.image ?? gravatarUrl} alt={user?.name ?? "You"} />
							<AvatarFallback className="text-lg font-semibold">
								{initials(user?.name)}
							</AvatarFallback>
						</Avatar>
						<div className="space-y-0.5">
							<p className="text-sm font-medium">{user?.name ?? "—"}</p>
							<p className="text-xs text-muted-foreground">{user?.email ?? "—"}</p>
							<p className="text-[10px] text-muted-foreground/60">
								Avatar via{" "}
								<a
									href="https://gravatar.com"
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-2 hover:no-underline"
								>
									Gravatar
								</a>
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Change Password */}
			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">Change Password</h2>
					<form onSubmit={handleChangePassword} className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="currentPw" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Current Password
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
									{showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
								</button>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="newPw" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								New Password
							</Label>
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
							<Label htmlFor="confirmPw" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Confirm New Password
							</Label>
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
				</CardContent>
			</Card>

			{/* Two-Factor Auth */}
			<Card>
				<CardContent className="pt-4 space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
						<Badge variant={is2faEnabled ? "default" : "secondary"}>
							{is2faEnabled ? "Enabled" : "Disabled"}
						</Badge>
					</div>

					<p className="text-xs text-muted-foreground">
						Add an extra layer of security by requiring a code from your authenticator app when signing in.
					</p>

					{!showTwoFaSetup ? (
						<div className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="twoFaPw" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Current Password
								</Label>
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
								<Button
									variant="destructive"
									size="sm"
									onClick={handleDisable2FA}
									disabled={is2faLoading || !twoFaPassword}
								>
									{is2faLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
									Disable 2FA
								</Button>
							) : (
								<Button
									variant="outline"
									size="sm"
									onClick={handleEnable2FA}
									disabled={is2faLoading || !twoFaPassword}
								>
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
								<div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
									<p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
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
								<Label htmlFor="twoFaCode" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Verification Code
								</Label>
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
								<Button
									size="sm"
									onClick={handleVerify2FA}
									disabled={is2faLoading || twoFaCode.length !== 6}
								>
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
				</CardContent>
			</Card>

			{/* Magic Link Toggle */}
			<Card>
				<CardContent className="pt-4 space-y-4">
					<h2 className="text-sm font-semibold">Magic Link Sign-In</h2>
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1">
							<p className="text-xs font-medium">Allow Magic Link Login</p>
							<p className="text-xs text-muted-foreground">
								Allow signing in via a one-time email link instead of a password. Requires email to be configured in Settings.
							</p>
						</div>
						<Switch
							checked={magicLinkEnabled}
							onCheckedChange={handleMagicLinkToggle}
							disabled={updateSettings.isPending}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
