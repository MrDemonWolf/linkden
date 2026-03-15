"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [token, setToken] = useState("");

	useEffect(() => {
		setToken(searchParams.get("token") ?? "");
	}, [searchParams]);
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState("");
	const [success, setSuccess] = useState(false);

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
		<div className="admin-glass-bg flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
				{/* Logo + title above card */}
				<div className="mb-8 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center bg-primary/90 backdrop-blur-sm text-primary-foreground text-lg font-bold rounded-2xl">
						LD
					</div>
					<h1 className="mt-4 text-xl font-semibold">Reset your password</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						Enter a new password for your account
					</p>
				</div>

				{success ? (
					<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl text-center space-y-3">
						<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
							<CheckCircle2 className="h-5 w-5 text-green-500" />
						</div>
						<h2 className="text-sm font-semibold">Password reset successful</h2>
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
				) : (
					<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl">
						<form onSubmit={handleSubmit} className="space-y-4" aria-describedby={formError ? "reset-error" : undefined}>
							<div aria-live="polite" aria-atomic="true">
								{formError && (
									<div
										id="reset-error"
										className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
									>
										<AlertCircle className="h-3.5 w-3.5 shrink-0" />
										<span>{formError}</span>
									</div>
								)}
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="new-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									New Password
								</Label>
								<div className="relative">
									<Input
										id="new-password"
										type={showPassword ? "text" : "password"}
										placeholder="At least 8 characters"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										autoComplete="new-password"
										className="dark:bg-input/30 border-white/15"
										required
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
								<Label htmlFor="confirm-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Confirm Password
								</Label>
								<div className="relative">
									<Input
										id="confirm-password"
										type={showConfirmPassword ? "text" : "password"}
										placeholder="Re-enter your password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										autoComplete="new-password"
										className="dark:bg-input/30 border-white/15"
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
								className="w-full"
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
			</div>
		</div>
	);
}
