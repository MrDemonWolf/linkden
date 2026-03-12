"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
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

	const setupStatus = useQuery(trpc.public.getSetupStatus.queryOptions());
	const branding = setupStatus.data?.branding;

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
			await authClient.forgetPassword(
				{ email, redirectTo: "/admin/reset-password" },
				{
					onSuccess: () => {
						setResetLinkSent(true);
						toast.success("Reset link sent! Check your email.");
					},
					onError: (error) => {
						const msg = error.error.message || "Failed to send reset link";
						setFormError(msg);
						toast.error(msg);
					},
				},
			);
		} finally {
			setIsForgotSubmitting(false);
		}
	};

	return (
		<div className="admin-glass-bg flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
				{/* Logo + title above card */}
				<div className="mb-8 text-center">
					{branding?.logoUrl ? (
						<img
							src={branding.logoUrl}
							alt=""
							className="h-12 w-12 rounded-2xl object-cover mx-auto"
						/>
					) : (
						<div className="mx-auto flex h-12 w-12 items-center justify-center bg-primary/90 backdrop-blur-sm text-primary-foreground text-lg font-bold rounded-2xl">
							LD
						</div>
					)}
					<h1 className="mt-4 text-xl font-semibold">Welcome back</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						Enter your credentials to access your account
					</p>
				</div>

				{loginSuccess ? (
					<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl text-center space-y-3">
						<Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
						<p className="text-sm font-medium">Login successful, redirecting...</p>
					</div>
				) : resetLinkSent ? (
					<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl text-center space-y-3">
						<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<Mail className="h-5 w-5 text-primary" />
						</div>
						<h2 className="text-sm font-semibold">Check your email</h2>
						<p className="text-xs text-muted-foreground">
							We sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Click it to reset your password.
						</p>
						<button
							type="button"
							className="text-xs text-primary underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring rounded"
							onClick={() => { setResetLinkSent(false); setForgotMode(false); setFormError(""); }}
						>
							Back to sign in
						</button>
					</div>
				) : forgotMode ? (
					<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl">
						<form onSubmit={handleForgotPassword} className="space-y-4" aria-describedby={formError ? "login-error" : undefined}>
							<div aria-live="polite" aria-atomic="true">
								{formError && (
									<div
										id="login-error"
										className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
									>
										<AlertCircle className="h-3.5 w-3.5 shrink-0" />
										<span>{formError}</span>
									</div>
								)}
							</div>

							<div className="space-y-1">
								<h2 className="text-sm font-semibold">Reset your password</h2>
								<p className="text-xs text-muted-foreground">
									Enter your email address and we&apos;ll send you a link to reset your password.
								</p>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="forgot-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Email Address
								</Label>
								<Input
									id="forgot-email"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									autoComplete="email"
									className="dark:bg-input/30 border-white/15"
									required
								/>
							</div>

							<Button
								type="submit"
								variant="default"
								className="w-full"
								disabled={isForgotSubmitting}
							>
								{isForgotSubmitting ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Sending...
									</>
								) : (
									"Send Reset Link"
								)}
							</Button>

							<div className="text-center">
								<button
									type="button"
									className="text-xs text-primary underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring rounded"
									onClick={() => { setForgotMode(false); setFormError(""); }}
								>
									Back to sign in
								</button>
							</div>
						</form>
					</div>
				) : (
					<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl">
						<form onSubmit={handleSubmit} className="space-y-4" aria-describedby={formError ? "login-error" : undefined}>
							<div aria-live="polite" aria-atomic="true">
								{formError && (
									<div
										id="login-error"
										className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
									>
										<AlertCircle className="h-3.5 w-3.5 shrink-0" />
										<span>{formError}</span>
									</div>
								)}
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Email Address
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									autoComplete="email"
									className="dark:bg-input/30 border-white/15"
									required
								/>
							</div>

							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Password
									</Label>
									<button
										type="button"
										onClick={() => { setForgotMode(true); setFormError(""); }}
										className="text-xs text-primary cursor-pointer hover:text-primary/80 transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
									>
										Forgot password?
									</button>
								</div>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="Your password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										autoComplete="current-password"
										className="dark:bg-input/30 border-white/15"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
										aria-label={showPassword ? "Hide password" : "Show password"}
										aria-pressed={showPassword}
									>
										{showPassword ? (
											<EyeOff className="h-3.5 w-3.5" />
										) : (
											<Eye className="h-3.5 w-3.5" />
										)}
									</button>
								</div>
							</div>

							<label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer">
								<input
									id="remember-me"
									type="checkbox"
									checked={rememberMe}
									onChange={(e) => setRememberMe(e.target.checked)}
									className="h-3.5 w-3.5 rounded border-muted-foreground/25 accent-primary"
								/>
								<span className="text-xs text-muted-foreground">Keep me signed in</span>
							</label>

							<Button
								type="submit"
								variant="default"
								className="w-full"
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Signing in...
									</>
								) : (
									"Sign In"
								)}
							</Button>
						</form>
					</div>
				)}

				{setupStatus.data?.completed === false && (
					<p className="mt-6 text-center text-xs text-muted-foreground">
						<Link
							href="/admin/setup"
							className="text-primary underline underline-offset-2 hover:no-underline font-medium"
						>
							Initial setup
						</Link>
					</p>
				)}

				{branding && (branding.ppUrl || branding.tosUrl || branding.cookieUrl) && (
					<div className="mt-8 flex justify-center gap-4 text-[10px] uppercase tracking-wider text-muted-foreground/60">
						{branding.ppUrl && (
							<a href={branding.ppUrl} target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
								Privacy Policy
							</a>
						)}
						{branding.tosUrl && (
							<a href={branding.tosUrl} target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
								Terms of Service
							</a>
						)}
						{branding.cookieUrl && (
							<a href={branding.cookieUrl} target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
								Cookie Policy
							</a>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
