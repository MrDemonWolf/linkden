"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isMagicLinkSubmitting, setIsMagicLinkSubmitting] = useState(false);
	const [magicLinkSent, setMagicLinkSent] = useState(false);
	const [formError, setFormError] = useState("");

	const setupStatus = useQuery(trpc.public.getSetupStatus.queryOptions());
	const magicLinkEnabled = setupStatus.data?.magicLinkEnabled ?? true;

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
				{ email, password },
				{
					onSuccess: () => {
						toast.success("Signed in successfully");
						router.push("/admin");
					},
					onError: (error) => {
						const msg = error.error.message || "Invalid credentials";
						setFormError(msg);
						toast.error(msg);
					},
				},
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleMagicLink = async () => {
		if (!email) {
			setFormError("Please enter your email address above");
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
						toast.success("Magic link sent! Check your email.");
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
		<div className="admin-glass-bg flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
				{/* Logo + title above card */}
				<div className="mb-8 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center bg-primary/90 backdrop-blur-sm text-primary-foreground text-lg font-bold rounded-2xl">
						LD
					</div>
					<h1 className="mt-4 text-xl font-semibold">Sign in to LinkDen</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						Enter your credentials to access the admin panel
					</p>
				</div>

				{magicLinkSent ? (
					<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl text-center space-y-3">
						<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<Mail className="h-5 w-5 text-primary" />
						</div>
						<h2 className="text-sm font-semibold">Check your email</h2>
						<p className="text-xs text-muted-foreground">
							We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Click it to access the admin panel.
						</p>
						<button
							type="button"
							className="text-xs text-primary underline underline-offset-2 hover:no-underline"
							onClick={() => setMagicLinkSent(false)}
						>
							Back to sign in
						</button>
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
									<span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
										Forgot?
									</span>
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

						{magicLinkEnabled && (
							<>
								<div className="relative my-4">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-white/10" />
									</div>
									<div className="relative flex justify-center">
										<span className="bg-transparent px-2 text-[10px] text-muted-foreground">or</span>
									</div>
								</div>

								<Button
									type="button"
									variant="outline"
									className="w-full border-white/15 dark:bg-input/20"
									onClick={handleMagicLink}
									disabled={isMagicLinkSubmitting}
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
							</>
						)}
					</div>
				)}

				{setupStatus.data?.completed === false && (
					<p className="mt-6 text-center text-xs text-muted-foreground">
						Don&apos;t have an account?{" "}
						<Link
							href="/admin/setup"
							className="text-primary underline underline-offset-2 hover:no-underline font-medium"
						>
							Create account
						</Link>
					</p>
				)}
			</div>
		</div>
	);
}
