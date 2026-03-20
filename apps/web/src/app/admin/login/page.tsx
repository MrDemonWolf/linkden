"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@linkden/ui";
import { Separator } from "@linkden/ui";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

const cardStyle = {
	boxShadow: "0 0 40px -10px rgba(99,102,241,0.3)",
};

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
				body: JSON.stringify({ email, redirectUrl: `${window.location.origin}/admin/reset-password` }),
			});

			if (!response.ok) {
				const error = await response.json() as { message?: string };
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

	return (
		<div className="login-bg relative min-h-screen flex flex-col">
			{/* Main */}
			<main className="flex-1 flex items-center justify-center p-4 sm:p-6">
				<div className="w-full max-w-[400px] login-card-enter">
					{loginSuccess ? (
						<div
							className="rounded-xl border border-white/[0.06] bg-[#1a1f2e] p-6 sm:p-8 text-center space-y-3"
							style={cardStyle}
						>
							<Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
							<p className="text-sm font-medium text-slate-200">Login successful, redirecting...</p>
						</div>
					) : magicLinkSent ? (
						<div
							className="rounded-xl border border-white/[0.06] bg-[#1a1f2e] p-6 sm:p-8 text-center space-y-3"
							style={cardStyle}
						>
							<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
								<Mail className="h-5 w-5 text-primary" />
							</div>
							<h2 className="text-sm font-semibold text-white">Check your email</h2>
							<p className="text-xs text-slate-400">
								We sent a magic link to <span className="font-medium text-slate-200">{email}</span>. Click it to sign in.
							</p>
							<button
								type="button"
								className="text-xs text-primary underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring rounded"
								onClick={() => { setMagicLinkSent(false); setFormError(""); }}
							>
								Back to sign in
							</button>
						</div>
					) : resetLinkSent ? (
						<div
							className="rounded-xl border border-white/[0.06] bg-[#1a1f2e] p-6 sm:p-8 text-center space-y-3"
							style={cardStyle}
						>
							<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
								<Mail className="h-5 w-5 text-primary" />
							</div>
							<h2 className="text-sm font-semibold text-white">Check your email</h2>
							<p className="text-xs text-slate-400">
								We sent a password reset link to <span className="font-medium text-slate-200">{email}</span>. Click it to reset your password.
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
						<div
							className="rounded-xl border border-white/[0.06] bg-[#1a1f2e] p-6 sm:p-8"
							style={cardStyle}
						>
							{/* Title inside card */}
							<div className="text-center mb-8">
								{branding?.logoUrl ? (
									<img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover mx-auto" />
								) : (
									<div className="mx-auto flex h-10 w-10 items-center justify-center bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl">
										LD
									</div>
								)}
								<h1 className="mt-4 text-2xl font-bold text-white tracking-tight">Reset Password</h1>
								<p className="mt-1 text-sm text-slate-400">Enter your email and we&apos;ll send you a reset link</p>
							</div>

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

								<div className="space-y-1.5">
									<Label htmlFor="forgot-email" className="text-sm font-medium text-slate-200">
										Email Address
									</Label>
									<Input
										id="forgot-email"
										type="email"
										placeholder="you@example.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										autoComplete="email"
										className="bg-[#0f1318] border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
										required
									/>
								</div>

								<Button
									type="submit"
									variant="default"
									className="w-full shadow-lg shadow-primary/20 active:scale-[0.98]"
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
						<div
							className="rounded-xl border border-white/[0.06] bg-[#1a1f2e] p-6 sm:p-8"
							style={cardStyle}
						>
							{/* Title inside card */}
							<div className="text-center mb-8">
								{branding?.logoUrl ? (
									<img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover mx-auto" />
								) : (
									<div className="mx-auto flex h-10 w-10 items-center justify-center bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl">
										LD
									</div>
								)}
								<h1 className="mt-4 text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
								<p className="mt-1 text-sm text-slate-400">Enter your credentials to access your account</p>
							</div>

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
									<Label htmlFor="email" className="text-sm font-medium text-slate-200">
										Email Address
									</Label>
									<Input
										id="email"
										type="email"
										placeholder="you@example.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										autoComplete="email"
										className="bg-[#0f1318] border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
										required
									/>
								</div>

								<div className="space-y-1.5">
									<div className="flex items-center justify-between">
										<Label htmlFor="password" className="text-sm font-medium text-slate-200">
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
											className="bg-[#0f1318] border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-200"
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

								<div className="flex items-center gap-2">
									<Checkbox
										id="remember-me"
										checked={rememberMe}
										onCheckedChange={(checked) => setRememberMe(checked === true)}
									/>
									<Label htmlFor="remember-me" className="text-xs text-slate-400 cursor-pointer">
										Keep me signed in
									</Label>
								</div>

								<Button
									type="submit"
									variant="default"
									className="w-full shadow-lg shadow-primary/20 active:scale-[0.98]"
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

							{magicLinkEnabled && (
								<div className="mt-4 space-y-4">
									<div className="relative">
										<Separator />
										<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a1f2e] px-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
											or continue with
										</span>
									</div>

									<Button
										type="button"
										variant="outline"
										className="w-full border-white/10 hover:bg-white/5 text-slate-200"
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
					{!loginSuccess && !magicLinkSent && !resetLinkSent && hasUsersQuery.data?.hasUsers === false && (
						<p className="mt-4 text-center text-xs text-slate-500">
							Don&apos;t have an account?{" "}
							<a href="/admin/setup" className="text-primary hover:text-primary/80 transition-colors">
								Set up LinkDen
							</a>
						</p>
					)}
				</div>
			</main>

			{/* Footer — branding PP/ToS only */}
			{branding && (branding.ppUrl || branding.tosUrl || branding.ppText || branding.tosText) && (
				<footer className="py-6 px-6 flex justify-center gap-6">
					{branding.ppMode === "url" && branding.ppUrl ? (
						<a href={branding.ppUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-primary transition-colors">
							Privacy Policy
						</a>
					) : branding.ppMode === "text" && branding.ppText ? (
						<button type="button" onClick={() => setPpDialogOpen(true)} className="text-xs text-slate-500 hover:text-primary transition-colors">
							Privacy Policy
						</button>
					) : null}
					{branding.tosMode === "url" && branding.tosUrl ? (
						<a href={branding.tosUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-primary transition-colors">
							Terms of Service
						</a>
					) : branding.tosMode === "text" && branding.tosText ? (
						<button type="button" onClick={() => setTosDialogOpen(true)} className="text-xs text-slate-500 hover:text-primary transition-colors">
							Terms of Service
						</button>
					) : null}
				</footer>
			)}

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
