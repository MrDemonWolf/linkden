"use client";

import { Checkbox, Separator } from "@linkden/ui";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShaderBanner } from "@/components/public/shader-banner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WolfLogo } from "@/components/wolf-logo";
import { authClient } from "@/lib/auth-client";
import { getLoginBgStyle, getLoginShaderPreset, isCustomLoginBg } from "@/lib/login-bg";
import { trpc } from "@/utils/trpc";

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
	const [magicLinkSent, setMagicLinkSent] = useState(false);
	const [ppDialogOpen, setPpDialogOpen] = useState(false);
	const [tosDialogOpen, setTosDialogOpen] = useState(false);

	const setupStatus = useQuery(trpc.public.getSetupStatus.queryOptions());
	const hasUsersQuery = useQuery(trpc.public.hasUsers.queryOptions());
	const branding = setupStatus.data?.branding;
	const magicLinkEnabled = setupStatus.data?.magicLinkEnabled ?? false;
	const loginBgStyle = getLoginBgStyle(branding);
	const loginShaderPreset = getLoginShaderPreset(branding);
	const hasCustomBg = isCustomLoginBg(branding);
	const siteName = branding?.siteName || "LinkDen";
	const loginLogoUrl = branding?.loginLogoUrl || branding?.logoUrl || null;

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
			await authClient.signIn.email(
				{ email, password, rememberMe },
				{
					onSuccess: () => {
						setLoginSuccess(true);
						window.location.href = "/admin";
					},
					onError: (error) => {
						const msg = error.error.message || "Invalid credentials";
						setFormError(msg);
						toast.error(msg);
					},
				},
			);
		} finally {
			if (!loginSuccess) {
				setIsSubmitting(false);
			}
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
			const response = await fetch("/api/auth/send-password-reset-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					redirectUrl: `${window.location.origin}/admin/reset-password`,
				}),
			});

			if (!response.ok) {
				const error = (await response.json()) as { message?: string };
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
				{ email, callbackURL: "/admin" },
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
		<div className="login-glass-card relative rounded-2xl p-8 sm:p-10 text-center space-y-4">
			<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
				{icon}
			</div>
			<h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
			<p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
			{action}
		</div>
	);

	const BackLink = ({ onClick }: { onClick: () => void }) => (
		<button
			type="button"
			className="text-sm text-primary hover:text-primary/80 transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
			onClick={onClick}
		>
			Back to sign in
		</button>
	);

	return (
		<div className="login-bg relative min-h-screen overflow-hidden" style={loginBgStyle}>
			{/* Shader background — full-bleed when a shader preset is selected */}
			{loginShaderPreset && (
				<div className="absolute inset-0">
					<ShaderBanner preset={loginShaderPreset} />
				</div>
			)}
			{/* Legibility overlay for custom + preset images */}
			{hasCustomBg && <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />}

			<div className="relative z-10 min-h-screen lg:grid lg:grid-cols-2">
				{/* Brand panel — lg+ only */}
				<aside className="hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-primary/[0.06] border-r border-border">
					<div className="flex items-center gap-3">
						{loginLogoUrl ? (
							<img
								src={loginLogoUrl}
								alt=""
								className="h-10 w-10 rounded-xl object-cover ring-1 ring-border"
							/>
						) : (
							<WolfLogo className="h-10 w-10" />
						)}
						<span className="text-sm font-semibold tracking-tight text-foreground">{siteName}</span>
					</div>

					<div className="max-w-md">
						<h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-foreground leading-[1.1]">
							Your link-in-bio,
							<br />
							<span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
								self-hosted.
							</span>
						</h2>
						<p className="mt-4 text-sm text-muted-foreground leading-relaxed">
							Owns its data. No accounts, no sync.
							<br />
							One person. One page.
						</p>
					</div>

					<div className="data-mono text-[11px] text-muted-foreground/70">v0.1.0 · self-hosted</div>
				</aside>

				{/* Form column */}
				<div className="flex flex-col min-h-screen lg:min-h-0">
					<main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
						<div className="w-full max-w-[420px] login-card-enter">
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
							) : forgotMode ? (
								<div className="login-glass-card relative rounded-2xl p-8 sm:p-10 transition-shadow duration-300">
									{/* Header */}
									<div className="text-center mb-8">
										{loginLogoUrl ? (
											<img
												src={loginLogoUrl}
												alt=""
												className="h-11 w-11 rounded-xl object-cover mx-auto ring-1 ring-border"
											/>
										) : (
											<WolfLogo className="mx-auto h-22 w-22" />
										)}
										<h1 className="mt-5 text-2xl font-bold text-foreground tracking-tight">
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
											<div className="relative login-input rounded-lg">
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
											className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
											disabled={isForgotSubmitting}
										>
											{isForgotSubmitting ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Sending...
												</>
											) : (
												<>
													Send reset link
													<ArrowRight className="h-4 w-4 ml-1" />
												</>
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
								<div className="login-glass-card relative rounded-2xl p-8 sm:p-10 transition-shadow duration-300">
									{/* Header */}
									<div className="text-center mb-8">
										{loginLogoUrl ? (
											<img
												src={loginLogoUrl}
												alt=""
												className="h-11 w-11 rounded-xl object-cover mx-auto ring-1 ring-border"
											/>
										) : (
											<WolfLogo className="mx-auto h-22 w-22" />
										)}
										<h1 className="mt-5 text-2xl font-bold text-foreground tracking-tight">
											Welcome back
										</h1>
										<p className="mt-2 text-sm text-muted-foreground">Sign in to your dashboard</p>
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
											<div className="relative login-input rounded-lg">
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
													className="text-xs text-primary cursor-pointer hover:text-primary/80 transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
												>
													Forgot password?
												</button>
											</div>
											<div className="relative login-input rounded-lg">
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
												className="text-xs text-muted-foreground cursor-pointer"
											>
												Keep me signed in
											</Label>
										</div>

										<Button
											type="submit"
											className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
											disabled={isSubmitting}
										>
											{isSubmitting ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Signing in...
												</>
											) : (
												<>
													Sign in
													<ArrowRight className="h-4 w-4 ml-1" />
												</>
											)}
										</Button>
									</form>

									{magicLinkEnabled && (
										<div className="mt-6 space-y-4">
											<div className="relative">
												<Separator className="bg-border" />
												<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
													or
												</span>
											</div>

											<Button
												type="button"
												variant="outline"
												className="w-full h-11 transition-all"
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
								</div>
							)}

							{/* Below-card link */}
							{!loginSuccess && !magicLinkSent && !resetLinkSent && (
								<p className="mt-5 text-center text-xs text-muted-foreground">
									Don&apos;t have an account?{" "}
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
				<Dialog open={ppDialogOpen} onOpenChange={setPpDialogOpen}>
					<DialogContent className="max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Privacy Policy</DialogTitle>
						</DialogHeader>
						<div className="whitespace-pre-wrap text-sm text-muted-foreground">
							{branding.ppText}
						</div>
					</DialogContent>
				</Dialog>
			)}

			{branding?.tosText && (
				<Dialog open={tosDialogOpen} onOpenChange={setTosDialogOpen}>
					<DialogContent className="max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Terms of Service</DialogTitle>
						</DialogHeader>
						<div className="whitespace-pre-wrap text-sm text-muted-foreground">
							{branding.tosText}
						</div>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
