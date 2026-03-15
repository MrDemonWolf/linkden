"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetupPage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const { data: hasUsersData, isLoading } = useQuery(trpc.public.hasUsers.queryOptions());

	// If users already exist, redirect to login
	useEffect(() => {
		if (hasUsersData?.hasUsers) {
			router.replace("/admin/login");
		}
	}, [hasUsersData, router]);

	if (isLoading || hasUsersData?.hasUsers) {
		return (
			<div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<span className="sr-only">Loading</span>
			</div>
		);
	}

	const handleSubmit = async () => {
		const errors: Record<string, string> = {};
		if (!name) errors.name = "Name is required";
		if (!email) errors.email = "Email is required";
		if (!password) errors.password = "Password is required";
		else if (password.length < 8) errors.password = "Password must be at least 8 characters";
		setFormErrors(errors);
		if (Object.keys(errors).length > 0) return;

		setIsSubmitting(true);
		try {
			await authClient.signUp.email(
				{ name, email, password },
				{
					onSuccess: () => {
						toast.success("Account created! Redirecting...");
						router.push("/admin");
					},
					onError: (error) => {
						const msg = error.error.message || "Failed to create account";
						setFormErrors({ form: msg });
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
				{/* Header */}
				<div className="mb-8 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center bg-primary/90 backdrop-blur-sm text-primary-foreground text-lg font-bold rounded-2xl">
						LD
					</div>
					<h1 className="mt-4 text-xl font-semibold">Setup LinkDen</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						Create your admin account to get started
					</p>
				</div>

				{/* Form */}
				<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl">
					<div className="space-y-4">
						<h2 className="text-sm font-medium">Create your account</h2>
						{formErrors.form && (
							<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
								{formErrors.form}
							</p>
						)}
						<div className="space-y-1.5">
							<Label htmlFor="setup-name">Name</Label>
							<Input
								id="setup-name"
								value={name}
								onChange={(e) => { setName(e.target.value); setFormErrors((prev) => { const { name: _, ...rest } = prev; return rest; }); }}
								placeholder="Your name"
								aria-describedby={formErrors.name ? "setup-name-error" : undefined}
								aria-invalid={!!formErrors.name}
							/>
							{formErrors.name && (
								<p id="setup-name-error" className="text-[11px] text-destructive">{formErrors.name}</p>
							)}
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="setup-email">Email</Label>
							<Input
								id="setup-email"
								type="email"
								value={email}
								onChange={(e) => { setEmail(e.target.value); setFormErrors((prev) => { const { email: _, ...rest } = prev; return rest; }); }}
								placeholder="you@example.com"
								aria-describedby={formErrors.email ? "setup-email-error" : undefined}
								aria-invalid={!!formErrors.email}
							/>
							{formErrors.email && (
								<p id="setup-email-error" className="text-[11px] text-destructive">{formErrors.email}</p>
							)}
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="setup-password">Password</Label>
							<Input
								id="setup-password"
								type="password"
								value={password}
								onChange={(e) => { setPassword(e.target.value); setFormErrors((prev) => { const { password: _, ...rest } = prev; return rest; }); }}
								placeholder="At least 8 characters"
								aria-describedby={formErrors.password ? "setup-password-error" : undefined}
								aria-invalid={!!formErrors.password}
							/>
							{formErrors.password && (
								<p id="setup-password-error" className="text-[11px] text-destructive">{formErrors.password}</p>
							)}
						</div>
						<Button
							className="w-full"
							onClick={handleSubmit}
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Creating account...
								</>
							) : (
								<>
									Create Account
									<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
