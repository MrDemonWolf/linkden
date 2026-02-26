"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
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

	const setupStatus = useQuery(trpc.public.getSetupStatus.queryOptions());

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) {
			toast.error("Please fill in all fields");
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
						toast.error(error.error.message || "Invalid credentials");
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
				{/* Logo */}
				<div className="mb-8 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center bg-primary/90 backdrop-blur-sm text-primary-foreground text-lg font-bold rounded-2xl">
						LD
					</div>
					<h1 className="mt-4 text-xl font-semibold">Sign in to LinkDen</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						Enter your credentials to access the admin panel
					</p>
				</div>

				<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl">
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="email">Email</Label>
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
							<Label htmlFor="password">Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="Your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									autoComplete="current-password"
									className="dark:bg-input/30 border-white/15"
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
							className="w-full"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Signing in..." : "Sign In"}
						</Button>
					</form>
				</div>

				{setupStatus.data?.completed === false && (
					<p className="mt-6 text-center text-xs text-muted-foreground">
						First time?{" "}
						<Link
							href="/admin/setup"
							className="text-primary underline underline-offset-2 hover:no-underline"
						>
							Run the setup wizard
						</Link>
					</p>
				)}
			</div>
		</div>
	);
}
