"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WolfLogo } from "@/components/wolf-logo";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export default function ResetPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token") ?? "";

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState("");
	const [success, setSuccess] = useState(false);

	const setupStatus = useQuery(trpc.public.getSetupStatus.queryOptions());
	const branding = setupStatus.data?.branding;
	const loginLogoUrl = branding?.loginLogoUrl || branding?.logoUrl || null;

	const Logo = () =>
		loginLogoUrl ? (
			<img
				src={loginLogoUrl}
				alt=""
				className="mx-auto h-11 w-11 rounded-xl object-cover ring-1 ring-border"
			/>
		) : (
			<WolfLogo className="mx-auto h-11 w-11" />
		);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");

		if (!token) {
			setFormError("Missing reset token. Please use the link from your email.");
			return;
		}

		if (!newPassword) {
			setFormError("Please enter a new password");
			return;
		}

		if (newPassword.length < 8) {
			setFormError("Password must be at least 8 characters");
			return;
		}

		if (newPassword !== confirmPassword) {
			setFormError("Passwords do not match");
			return;
		}

		setIsSubmitting(true);
		try {
			await authClient.resetPassword(
				{ newPassword, token },
				{
					onSuccess: () => {
						setSuccess(true);
						toast.success("Password reset successfully");
						setTimeout(() => {
							router.push("/admin/login");
						}, 2000);
					},
					onError: (error) => {
						const msg = error.error.message || "Failed to reset password";
						setFormError(msg);
						toast.error(msg);
					},
				},
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="login-bg relative min-h-screen flex flex-col">
			<main className="flex-1 flex items-center justify-center p-4 sm:p-6">
				<div className="w-full max-w-[400px] login-card-enter">
					{success ? (
						<div className="login-glass-card rounded-2xl p-6 sm:p-8 text-center space-y-3">
							<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
								<CheckCircle2 className="h-5 w-5 text-green-500" />
							</div>
							<h2 className="text-sm font-semibold text-foreground">Password reset successful</h2>
							<p className="text-xs text-muted-foreground">
								Your password has been updated. Redirecting you to the login page...
							</p>
							<button
								type="button"
								className="text-xs text-primary underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring rounded"
								onClick={() => router.push("/admin/login")}
							>
								Go to sign in
							</button>
						</div>
					) : !token ? (
						/* Missing / expired token — dedicated state, no form shown */
						<div className="login-glass-card rounded-2xl p-6 sm:p-8 text-center space-y-4">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
								<AlertTriangle className="h-5 w-5 text-destructive" />
							</div>
							<div className="space-y-1.5">
								<h1 className="text-lg font-bold text-foreground tracking-tight">
									This reset link is invalid
								</h1>
								<p className="text-sm text-muted-foreground leading-relaxed">
									The link may have expired or is missing its security token. Request a fresh link
									and we&apos;ll email you a new one.
								</p>
							</div>
							<Button
								type="button"
								className="w-full shadow-lg shadow-primary/20 active:scale-[0.98]"
								onClick={() => router.push("/admin/login")}
							>
								Request a new link
							</Button>
							<button
								type="button"
								className="text-xs text-primary underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring rounded"
								onClick={() => router.push("/admin/login")}
							>
								Back to sign in
							</button>
						</div>
					) : (
						<div className="login-glass-card rounded-2xl p-6 sm:p-8">
							{/* Title inside card */}
							<div className="text-center mb-8">
								<Logo />
								<h1 className="mt-4 text-2xl font-bold text-foreground tracking-tight">
									Reset Password
								</h1>
								<p className="mt-1 text-sm text-muted-foreground">
									Enter a new password for your account
								</p>
							</div>

							<form
								onSubmit={handleSubmit}
								className="space-y-4"
								aria-describedby={formError ? "reset-error" : undefined}
							>
								<div aria-live="polite" aria-atomic="true">
									{formError && (
										<div
											id="reset-error"
											className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive"
										>
											<AlertCircle className="h-3.5 w-3.5 shrink-0" />
											<span>{formError}</span>
										</div>
									)}
								</div>

								<div className="space-y-1.5">
									<Label
										htmlFor="new-password"
										className="text-sm font-medium text-muted-foreground"
									>
										New Password
									</Label>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
										<Input
											id="new-password"
											type={showPassword ? "text" : "password"}
											placeholder="At least 8 characters"
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											autoComplete="new-password"
											className="pl-10"
											required
											autoFocus
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

								<div className="space-y-1.5">
									<Label
										htmlFor="confirm-password"
										className="text-sm font-medium text-muted-foreground"
									>
										Confirm Password
									</Label>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
										<Input
											id="confirm-password"
											type={showConfirmPassword ? "text" : "password"}
											placeholder="Re-enter your password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											autoComplete="new-password"
											className="pl-10"
											required
										/>
										<button
											type="button"
											onClick={() => setShowConfirmPassword(!showConfirmPassword)}
											className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
											aria-label={showConfirmPassword ? "Hide password" : "Show password"}
											aria-pressed={showConfirmPassword}
										>
											{showConfirmPassword ? (
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
									className="w-full shadow-lg shadow-primary/20 active:scale-[0.98]"
									disabled={isSubmitting}
								>
									{isSubmitting ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Resetting...
										</>
									) : (
										"Reset Password"
									)}
								</Button>

								<div className="text-center">
									<button
										type="button"
										className="text-xs text-primary underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring rounded"
										onClick={() => router.push("/admin/login")}
									>
										Back to sign in
									</button>
								</div>
							</form>
						</div>
					)}

					{/* Below-card link */}
					{!success && token && (
						<p className="mt-4 text-center text-xs text-muted-foreground">
							Remember your password?{" "}
							<a
								href="/admin/login"
								className="text-primary hover:text-primary/80 transition-colors"
							>
								Sign in
							</a>
						</p>
					)}
				</div>
			</main>
		</div>
	);
}
