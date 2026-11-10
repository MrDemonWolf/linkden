"use client";

import { Checkbox } from "@linkden/ui";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LegalTextDialog } from "@/components/public/legal-text-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { WolfLogo } from "@/components/wolf-logo";
import { authClient } from "@/lib/auth-client";
import { isLocalDevelopmentUrl } from "@/lib/local-development";
import { trpc } from "@/utils/trpc";
import { postLoginTarget } from "./redirect";

type TwoFactorMode = "totp" | "backup";

export default function AdminLoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState("");
	const [forgotMode, setForgotMode] = useState(false);
	const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
	const [resetLinkSent, setResetLinkSent] = useState(false);
	const [rememberMe, setRememberMe] = useState(true);
	const [loginSuccess, setLoginSuccess] = useState(false);
	const [isMagicLinkSubmitting, setIsMagicLinkSubmitting] = useState(false);
	const [isDevLoginSubmitting, setIsDevLoginSubmitting] = useState(false);
	const [devLoginEnabled, setDevLoginEnabled] = useState(false);
	useEffect(() => {
		setDevLoginEnabled(
			process.env.NEXT_PUBLIC_DEV_LOGIN === "true" && isLocalDevelopmentUrl(window.location.href),
		);
	}, []);
	const [magicLinkSent, setMagicLinkSent] = useState(false);
	const [ppDialogOpen, setPpDialogOpen] = useState(false);
	const [tosDialogOpen, setTosDialogOpen] = useState(false);
	// Second step after a correct password when the account has 2FA on. Better
	// Auth answers sign-in with `twoFactorRedirect` and no session; the session
	// only exists once verifyTotp / verifyBackupCode succeeds.
	const [twoFactorStep, setTwoFactorStep] = useState(false);
	const [twoFactorMode, setTwoFactorMode] = useState<TwoFactorMode>("totp");
	const [twoFactorCode, setTwoFactorCode] = useState("");
	const [trustDevice, setTrustDevice] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);

	const setupStatus = useQuery(trpc.public.getSetupStatus.queryOptions());
	const hasUsersQuery = useQuery(trpc.public.hasUsers.queryOptions());
	const branding = setupStatus.data?.branding;
	// Non-secret flag (key + sender present). Without it, reset and magic-link
	// emails are silently skipped server-side, so those paths would only ever
	// say "check your inbox". A missing field counts as configured.
	const emailConfigured = !(
		setupStatus.data &&
		"emailConfigured" in setupStatus.data &&
		setupStatus.data.emailConfigured === false
	);
	const magicLinkEnabled = (setupStatus.data?.magicLinkEnabled ?? false) && emailConfigured;
	const siteName = branding?.siteName || "LinkDen";
	const logoUrl = branding?.logoUrl || null;

	// If no users exist yet, redirect to setup
	useEffect(() => {
		if (hasUsersQuery.data && !hasUsersQuery.data.hasUsers) {
			router.replace("/admin/setup");
		}
	}, [hasUsersQuery.data, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");
		if (!email || !password) {
			setFormError("Please fill in all fields");
			return;
		}

		setIsSubmitting(true);
		try {
			const { data, error } = await authClient.signIn.email({ email, password, rememberMe });
			if (error) {
				const msg = error.message || "Invalid credentials";
				setFormError(msg);
				toast.error(msg);
				return;
			}
			if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
				setPassword("");
				setTwoFactorCode("");
				setTwoFactorMode("totp");
				setTwoFactorStep(true);
				return;
			}
			setLoginSuccess(true);
			window.location.href = postLoginTarget();
		} finally {
			setIsSubmitting(false);
		}
	};

	const leaveTwoFactor = () => {
		setTwoFactorStep(false);
		setTwoFactorCode("");
		setFormError("");
	};

	const handleVerifyTwoFactor = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");
		const code =
			twoFactorMode === "totp" ? twoFactorCode.replace(/\s+/g, "") : twoFactorCode.trim();
		if (!code) {
			setFormError(
				twoFactorMode === "totp" ? "Enter the code from your app" : "Enter a backup code",
			);
			return;
		}
		setIsVerifying(true);
		try {
			const { error } =
				twoFactorMode === "totp"
					? await authClient.twoFactor.verifyTotp({ code, trustDevice })
					: await authClient.twoFactor.verifyBackupCode({ code, trustDevice });
			if (error) {
				// The pending sign-in lives in a short-lived cookie; once it lapses
				// no code can succeed, so send the admin back to the password step.
				if (error.code === "INVALID_TWO_FACTOR_COOKIE") {
					leaveTwoFactor();
					setFormError("That sign-in attempt expired. Sign in again.");
					return;
				}
				// The challenge allows 5 tries; after that it is spent.
				if (
					error.code === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE" ||
					error.code === "ACCOUNT_TEMPORARILY_LOCKED"
				) {
					leaveTwoFactor();
					setFormError(
						error.code === "ACCOUNT_TEMPORARILY_LOCKED"
							? error.message || "Too many failed attempts. Try again later."
							: "Too many incorrect codes. Sign in again to get a new attempt.",
					);
					return;
				}
				const msg = error.message || "That code didn't work";
				setFormError(msg);
				toast.error(msg);
				return;
			}
			setLoginSuccess(true);
			window.location.href = postLoginTarget();
		} finally {
			setIsVerifying(false);
		}
	};

	const handleDevLogin = async () => {
		setFormError("");
		setIsDevLoginSubmitting(true);
		try {
			// better-fetch resolves { data, error } instead of throwing on 4xx/5xx —
			// a disabled bypass (404) would otherwise fall through to the success path.
			const { error } = await authClient.$fetch("/dev-login", { method: "POST", body: {} });
			if (error) throw error;
			setLoginSuccess(true);
			window.location.href = postLoginTarget();
		} catch {
			const msg = "Dev login failed — is DEV_LOGIN=true set on the server?";
			setFormError(msg);
			toast.error(msg);
			setIsDevLoginSubmitting(false);
		}
	};

	const handleForgotPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) {
			setFormError("Please enter your email address");
			return;
		}
		setFormError("");
		setIsForgotSubmitting(true);
		try {
			const { error } = await authClient.requestPasswordReset({
				email,
				redirectTo: `${window.location.origin}/admin/reset-password`,
			});

			if (error) {
				throw new Error(error.message || "Failed to send reset link");
			}

			setResetLinkSent(true);
			toast.success("Reset link sent! Check your email.");
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Failed to send reset link";
			setFormError(msg);
			toast.error(msg);
		} finally {
			setIsForgotSubmitting(false);
		}
	};

	const handleMagicLink = async () => {
		if (!email) {
			setFormError("Please enter your email address");
			return;
		}
		setFormError("");
		setIsMagicLinkSubmitting(true);
		try {
			await authClient.signIn.magicLink(
				{ email, callbackURL: postLoginTarget() },
				{
					onSuccess: () => {
						setMagicLinkSent(true);
					},
					onError: (error) => {
						const msg = error.error.message || "Failed to send magic link";
						setFormError(msg);
						toast.error(msg);
					},
				},
			);
		} finally {
			setIsMagicLinkSubmitting(false);
		}
	};

	/* Shared card wrapper for status screens (success, magic link sent, reset sent) */
	const StatusCard = ({
		icon,
		title,
		description,
		action,
	}: {
		icon: React.ReactNode;
		title: string;
		description: React.ReactNode;
		action?: React.ReactNode;
	}) => (
		<div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8 text-center space-y-4">
			<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
				{icon}
			</div>
			<h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
			<p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
			{action}
		</div>
	);

	const BackLink = ({ onClick }: { onClick: () => void }) => (
		<Button type="button" variant="link" className="min-h-11 w-full" onClick={onClick}>
			Back to sign in
		</Button>
	);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="min-h-screen">
				{/* Form column */}
				<div className="flex min-h-screen flex-col">
					<main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
						<div className="w-full max-w-[420px]">
							{loginSuccess ? (
								<StatusCard
									icon={<Loader2 className="h-5 w-5 animate-spin text-primary" />}
									title="Welcome back"
									description={<span className="text-muted-foreground">Signing you in...</span>}
								/>
							) : magicLinkSent ? (
								<StatusCard
									icon={<Mail className="h-5 w-5 text-primary" />}
									title="Check your inbox"
									description={
										<>
											We sent a magic link to{" "}
											<span className="font-medium text-foreground">{email}</span>. Click it to sign
											in.
										</>
									}
									action={
										<BackLink
											onClick={() => {
												setMagicLinkSent(false);
												setFormError("");
											}}
										/>
									}
								/>
							) : resetLinkSent ? (
								<StatusCard
									icon={<Mail className="h-5 w-5 text-primary" />}
									title="Check your inbox"
									description={
										<>
											We sent a reset link to{" "}
											<span className="font-medium text-foreground">{email}</span>. Click it to
											reset your password.
										</>
									}
									action={
										<BackLink
											onClick={() => {
												setResetLinkSent(false);
												setForgotMode(false);
												setFormError("");
											}}
										/>
									}
								/>
							) : twoFactorStep ? (
								<div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
									<div className="text-center mb-8">
										<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
											{twoFactorMode === "totp" ? (
												<ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
											) : (
												<KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
											)}
										</div>
										<h1 className="mt-4 text-xl font-semibold text-foreground tracking-tight">
											Two-factor check
										</h1>
										<p className="mt-2 text-sm text-muted-foreground">
											{twoFactorMode === "totp"
												? "Enter the 6-digit code from your authenticator app"
												: "Enter one of the backup codes you saved when you turned on 2FA"}
										</p>
									</div>

									<form
										onSubmit={handleVerifyTwoFactor}
										className="space-y-5"
										aria-describedby={formError ? "login-error" : undefined}
									>
										<div aria-live="polite" aria-atomic="true">
											{formError && (
												<div
													id="login-error"
													className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive"
												>
													<AlertCircle className="h-3.5 w-3.5 shrink-0" />
													<span>{formError}</span>
												</div>
											)}
										</div>

										<div className="space-y-2">
											<Label
												htmlFor="two-factor-code"
												className="text-sm font-medium text-muted-foreground"
											>
												{twoFactorMode === "totp" ? "Authentication code" : "Backup code"}
											</Label>
											<Input
												// Remount on mode switch so autofill hints and focus reset.
												key={twoFactorMode}
												id="two-factor-code"
												value={twoFactorCode}
												onChange={(e) => setTwoFactorCode(e.target.value)}
												inputMode={twoFactorMode === "totp" ? "numeric" : "text"}
												autoComplete="one-time-code"
												autoCapitalize="off"
												spellCheck={false}
												maxLength={twoFactorMode === "totp" ? 10 : 32}
												placeholder={twoFactorMode === "totp" ? "123456" : "xxxxx-xxxxx"}
												className="h-11 text-center font-mono tracking-widest"
												aria-invalid={formError ? true : undefined}
												autoFocus
												required
											/>
										</div>

										<div className="flex items-center gap-2">
											<Checkbox
												id="trust-device"
												checked={trustDevice}
												onCheckedChange={(checked) => setTrustDevice(checked === true)}
											/>
											<Label
												htmlFor="trust-device"
												className="inline-flex min-h-11 flex-1 cursor-pointer items-center text-sm text-muted-foreground"
											>
												Don&apos;t ask again on this device for 30 days
											</Label>
										</div>

										<Button
											type="submit"
											className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
											disabled={isVerifying}
										>
											{isVerifying ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Verifying...
												</>
											) : (
												<>Verify</>
											)}
										</Button>

										<div className="flex flex-col items-center gap-2 pt-1">
											<Button
												type="button"
												variant="link"
												className="min-h-11 w-full"
												onClick={() => {
													setTwoFactorMode(twoFactorMode === "totp" ? "backup" : "totp");
													setTwoFactorCode("");
													setFormError("");
												}}
											>
												{twoFactorMode === "totp"
													? "Use a backup code instead"
													: "Use your authenticator app instead"}
											</Button>
											<BackLink onClick={leaveTwoFactor} />
										</div>
									</form>
								</div>
							) : forgotMode && !emailConfigured ? (
								<StatusCard
									icon={<KeyRound className="h-5 w-5 text-primary" />}
									title="Reset from the server"
									description={
										<>
											Email isn&apos;t set up on this instance, so a reset link can&apos;t be sent.
											Run <code className="font-mono text-foreground">bun reset:password</code> on
											the server to set a new password.
										</>
									}
									action={
										<BackLink
											onClick={() => {
												setForgotMode(false);
												setFormError("");
											}}
										/>
									}
								/>
							) : forgotMode ? (
								<div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
									{/* Header */}
									<div className="text-center mb-8">
										{logoUrl ? (
											<img
												src={logoUrl}
												alt=""
												className="h-11 w-11 rounded-xl object-cover mx-auto ring-1 ring-border"
											/>
										) : (
											<WolfLogo className="mx-auto h-11 w-11" />
										)}
										<h1 className="mt-4 text-xl font-semibold text-foreground tracking-tight">
											Reset password
										</h1>
										<p className="mt-2 text-sm text-muted-foreground">
											Enter your email and we&apos;ll send a reset link
										</p>
									</div>

									<form
										onSubmit={handleForgotPassword}
										className="space-y-5"
										aria-describedby={formError ? "login-error" : undefined}
									>
										<div aria-live="polite" aria-atomic="true">
											{formError && (
												<div
													id="login-error"
													className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive"
												>
													<AlertCircle className="h-3.5 w-3.5 shrink-0" />
													<span>{formError}</span>
												</div>
											)}
										</div>

										<div className="space-y-2">
											<Label
												htmlFor="forgot-email"
												className="text-sm font-medium text-muted-foreground"
											>
												Email
											</Label>
											<div className="relative">
												<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
												<Input
													id="forgot-email"
													type="email"
													placeholder="you@example.com"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													autoComplete="email"
													className="pl-10 h-11"
													required
												/>
											</div>
										</div>

										<Button
											type="submit"
											className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
											disabled={isForgotSubmitting}
										>
											{isForgotSubmitting ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Sending...
												</>
											) : (
												<>Send reset link</>
											)}
										</Button>

										<div className="text-center pt-1">
											<BackLink
												onClick={() => {
													setForgotMode(false);
													setFormError("");
												}}
											/>
										</div>
									</form>
								</div>
							) : (
								<div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
									{/* Header */}
									<div className="text-center mb-8">
										{logoUrl ? (
											<img
												src={logoUrl}
												alt=""
												className="h-11 w-11 rounded-xl object-cover mx-auto ring-1 ring-border"
											/>
										) : (
											<WolfLogo className="mx-auto h-11 w-11" />
										)}
										<h1 className="mt-4 text-xl font-semibold text-foreground tracking-tight">
											Welcome back
										</h1>
										<p className="mt-2 text-sm text-muted-foreground">Sign in to {siteName}</p>
									</div>

									<form
										onSubmit={handleSubmit}
										className="space-y-5"
										aria-describedby={formError ? "login-error" : undefined}
									>
										<div aria-live="polite" aria-atomic="true">
											{formError && (
												<div
													id="login-error"
													className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive"
												>
													<AlertCircle className="h-3.5 w-3.5 shrink-0" />
													<span>{formError}</span>
												</div>
											)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
												Email
											</Label>
											<div className="relative">
												<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
												<Input
													id="email"
													type="email"
													placeholder="you@example.com"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													autoComplete="email"
													className="pl-10 h-11"
													required
													autoFocus
												/>
											</div>
										</div>

										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<Label
													htmlFor="password"
													className="text-sm font-medium text-muted-foreground"
												>
													Password
												</Label>
												<button
													type="button"
													onClick={() => {
														setForgotMode(true);
														setFormError("");
													}}
													className="min-h-11 md:min-h-6 text-xs text-primary cursor-pointer hover:text-primary/80 transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
												>
													Forgot password?
												</button>
											</div>
											<div className="relative">
												<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
												<Input
													id="password"
													type={showPassword ? "text" : "password"}
													placeholder="Enter your password"
													value={password}
													onChange={(e) => setPassword(e.target.value)}
													autoComplete="current-password"
													className="pl-10 h-11"
													required
												/>
												<button
													type="button"
													onClick={() => setShowPassword(!showPassword)}
													className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
													aria-label={showPassword ? "Hide password" : "Show password"}
													aria-pressed={showPassword}
												>
													{showPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</button>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<Checkbox
												id="remember-me"
												checked={rememberMe}
												onCheckedChange={(checked) => setRememberMe(checked === true)}
											/>
											<Label
												htmlFor="remember-me"
												className="inline-flex min-h-11 flex-1 cursor-pointer items-center text-sm text-muted-foreground"
											>
												Keep me signed in
											</Label>
										</div>

										<Button
											type="submit"
											className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
											disabled={isSubmitting}
										>
											{isSubmitting ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Signing in...
												</>
											) : (
												<>Sign in</>
											)}
										</Button>
									</form>

									{magicLinkEnabled && (
										<div className="mt-6 space-y-4">
											<div className="relative">
												<Separator className="bg-border" />
												<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-micro font-medium uppercase tracking-wider text-muted-foreground">
													or
												</span>
											</div>

											<Button
												type="button"
												variant="outline"
												className="w-full h-11"
												disabled={isMagicLinkSubmitting}
												onClick={handleMagicLink}
											>
												{isMagicLinkSubmitting ? (
													<>
														<Loader2 className="h-4 w-4 animate-spin" />
														Sending...
													</>
												) : (
													<>
														<Mail className="h-4 w-4" />
														Sign in with Magic Link
													</>
												)}
											</Button>
										</div>
									)}

									{devLoginEnabled && (
										<Button
											type="button"
											variant="outline"
											className="mt-4 w-full h-11 border-dashed"
											disabled={isDevLoginSubmitting}
											onClick={handleDevLogin}
										>
											{isDevLoginSubmitting ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Signing in...
												</>
											) : (
												"Dev login (bypass)"
											)}
										</Button>
									)}
								</div>
							)}

							{/* Below-card link */}
							{!loginSuccess && !magicLinkSent && !resetLinkSent && !twoFactorStep && (
								<p className="mt-5 text-center text-xs text-muted-foreground">
									First time setting up this instance?{" "}
									<a
										href="/admin/setup"
										className="text-primary hover:text-primary/80 transition-colors"
									>
										Set up LinkDen
									</a>
								</p>
							)}
						</div>
					</main>

					{/* Footer -- branding PP/ToS only */}
					{branding &&
						(branding.ppUrl || branding.tosUrl || branding.ppText || branding.tosText) && (
							<footer className="relative z-10 py-6 px-6 flex justify-center gap-6">
								{branding.ppMode === "url" && branding.ppUrl ? (
									<a
										href={branding.ppUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-xs text-muted-foreground hover:text-primary transition-colors"
									>
										Privacy Policy
									</a>
								) : branding.ppMode === "text" && branding.ppText ? (
									<button
										type="button"
										onClick={() => setPpDialogOpen(true)}
										className="text-xs text-muted-foreground hover:text-primary transition-colors"
									>
										Privacy Policy
									</button>
								) : null}
								{branding.tosMode === "url" && branding.tosUrl ? (
									<a
										href={branding.tosUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-xs text-muted-foreground hover:text-primary transition-colors"
									>
										Terms of Service
									</a>
								) : branding.tosMode === "text" && branding.tosText ? (
									<button
										type="button"
										onClick={() => setTosDialogOpen(true)}
										className="text-xs text-muted-foreground hover:text-primary transition-colors"
									>
										Terms of Service
									</button>
								) : null}
							</footer>
						)}
				</div>
			</div>

			{branding?.ppText && (
				<LegalTextDialog
					open={ppDialogOpen}
					onOpenChange={setPpDialogOpen}
					title="Privacy Policy"
					text={branding.ppText}
				/>
			)}

			{branding?.tosText && (
				<LegalTextDialog
					open={tosDialogOpen}
					onOpenChange={setTosDialogOpen}
					title="Terms of Service"
					text={branding.tosText}
				/>
			)}
		</div>
	);
}
