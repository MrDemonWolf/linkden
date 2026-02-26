"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	User,
	FileText,
	Palette,
	CheckCircle2,
	ArrowRight,
	ArrowLeft,
	ShieldX,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const THEME_PRESETS = [
	{ name: "default", label: "Default", primary: "#0FACED", accent: "#38BDF8" },
	{ name: "corporate-classic", label: "Corporate Classic", primary: "#1E3A5F", accent: "#2563EB" },
	{ name: "corporate-modern", label: "Corporate Modern", primary: "#0D9488", accent: "#14B8A6" },
	{ name: "hacker-terminal", label: "Hacker Terminal", primary: "#16A34A", accent: "#22C55E" },
	{ name: "neon-cyber", label: "Neon Cyber", primary: "#7C3AED", accent: "#06B6D4" },
	{ name: "furry-pastel", label: "Furry Pastel", primary: "#EC4899", accent: "#A855F7" },
	{ name: "furry-bold", label: "Furry Bold", primary: "#EA580C", accent: "#0D9488" },
];

const STEPS = [
	{ label: "Account", icon: User },
	{ label: "Profile", icon: FileText },
	{ label: "Theme", icon: Palette },
	{ label: "Done", icon: CheckCircle2 },
];

const BIO_MAX_LENGTH = 300;

export default function SetupPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token") ?? "";
	const [step, setStep] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Step 1: Account
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	// Step 2: Profile
	const [bio, setBio] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");

	// Step 3: Theme
	const [selectedTheme, setSelectedTheme] = useState("default");

	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());

	// Validate token
	const tokenValidation = useQuery({
		...trpc.public.validateSetupToken.queryOptions({ token }),
		enabled: !!token,
	});

	// If no token or invalid token, show error
	if (!token) {
		return (
			<div className="admin-glass-bg flex min-h-screen items-center justify-center px-4">
				<div className="w-full max-w-sm text-center">
					<ShieldX className="mx-auto h-12 w-12 text-destructive/60" />
					<h1 className="mt-4 text-lg font-semibold">Setup Token Required</h1>
					<p className="mt-2 text-xs text-muted-foreground">
						A setup token is required to run the setup wizard. Check your server console for the setup URL.
					</p>
					<Button
						variant="outline"
						className="mt-4"
						onClick={() => router.push("/admin/login")}
					>
						Go to Login
					</Button>
				</div>
			</div>
		);
	}

	if (tokenValidation.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (tokenValidation.data && !tokenValidation.data.valid) {
		return (
			<div className="admin-glass-bg flex min-h-screen items-center justify-center px-4">
				<div className="w-full max-w-sm text-center">
					<ShieldX className="mx-auto h-12 w-12 text-destructive/60" />
					<h1 className="mt-4 text-lg font-semibold">
						{tokenValidation.data.reason === "setup_completed"
							? "Setup Already Completed"
							: "Invalid Setup Token"}
					</h1>
					<p className="mt-2 text-xs text-muted-foreground">
						{tokenValidation.data.reason === "setup_completed"
							? "This instance has already been set up. Please log in instead."
							: "The setup token is invalid or expired. Check your server console for a new setup URL."}
					</p>
					<Button
						variant="outline"
						className="mt-4"
						onClick={() => router.push("/admin/login")}
					>
						Go to Login
					</Button>
				</div>
			</div>
		);
	}

	const handleStep1 = async () => {
		if (!name || !email || !password) {
			toast.error("Please fill in all fields");
			return;
		}
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}

		setIsSubmitting(true);
		try {
			await authClient.signUp.email(
				{ name, email, password },
				{
					onSuccess: () => {
						toast.success("Account created");
						setStep(1);
					},
					onError: (error) => {
						toast.error(error.error.message || "Failed to create account");
					},
				},
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleStep2 = async () => {
		setIsSubmitting(true);
		try {
			const settings: { key: string; value: string }[] = [];
			if (bio) settings.push({ key: "bio", value: bio });
			if (avatarUrl) settings.push({ key: "avatar_url", value: avatarUrl });

			if (settings.length > 0) {
				await updateSettings.mutateAsync(settings);
			}
			toast.success("Profile saved");
			setStep(2);
		} catch {
			toast.error("Failed to save profile");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleStep3 = async () => {
		setIsSubmitting(true);
		try {
			await updateSettings.mutateAsync([
				{ key: "theme_preset", value: selectedTheme },
			]);
			toast.success("Theme saved");
			setStep(3);
		} catch {
			toast.error("Failed to save theme");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleFinish = async () => {
		setIsSubmitting(true);
		try {
			await updateSettings.mutateAsync([
				{ key: "setup_completed", value: "true" },
			]);
			router.push("/admin/builder");
		} catch {
			toast.error("Failed to complete setup");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="admin-glass-bg flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
				{/* Header */}
				<div className="mb-8 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center bg-primary/90 backdrop-blur-sm text-primary-foreground text-lg font-bold rounded-2xl">
						LD
					</div>
					<h1 className="mt-4 text-xl font-semibold">Setup LinkDen</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						Get your link-in-bio page ready in a few steps
					</p>
				</div>

				{/* Step indicator */}
				<div className="mb-8 flex items-center justify-center gap-1">
					{STEPS.map((s, i) => {
						const Icon = s.icon;
						return (
							<div key={s.label} className="flex items-center">
								<div
									className={`flex items-center gap-1.5 px-2 py-1 text-xs ${
										i === step
											? "text-primary font-medium"
											: i < step
												? "text-muted-foreground"
												: "text-muted-foreground/50"
									}`}
								>
									<Icon className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">{s.label}</span>
								</div>
								{i < STEPS.length - 1 && (
									<div
										className={`h-px w-6 ${
											i < step ? "bg-primary" : "bg-border"
										}`}
									/>
								)}
							</div>
						);
					})}
				</div>

				{/* Step content */}
				<div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl">
					{step === 0 && (
						<div className="space-y-4">
							<h2 className="text-sm font-medium">Create your account</h2>
							<div className="space-y-1.5">
								<Label htmlFor="setup-name">Name</Label>
								<Input
									id="setup-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your name"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="setup-email">Email</Label>
								<Input
									id="setup-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@example.com"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="setup-password">Password</Label>
								<Input
									id="setup-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="At least 8 characters"
								/>
							</div>
							<Button
								className="w-full"
								onClick={handleStep1}
								disabled={isSubmitting}
							>
								{isSubmitting ? "Creating account..." : "Create Account"}
								<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
							</Button>
						</div>
					)}

					{step === 1 && (
						<div className="space-y-4">
							<h2 className="text-sm font-medium">Profile details</h2>
							<p className="text-xs text-muted-foreground">
								These are optional. You can always change them later.
							</p>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="setup-bio">Bio</Label>
									<span className="text-[10px] text-muted-foreground">
										{bio.length}/{BIO_MAX_LENGTH}
									</span>
								</div>
								<textarea
									id="setup-bio"
									value={bio}
									onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
									maxLength={BIO_MAX_LENGTH}
									placeholder="A short description about you"
									rows={4}
									className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full border bg-transparent backdrop-blur-sm px-2.5 py-1.5 text-xs outline-none focus-visible:ring-1"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="setup-avatar">Avatar URL</Label>
								<Input
									id="setup-avatar"
									value={avatarUrl}
									onChange={(e) => setAvatarUrl(e.target.value)}
									placeholder="https://example.com/avatar.jpg"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => setStep(0)}
								>
									<ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
									Back
								</Button>
								<Button
									className="flex-1"
									onClick={handleStep2}
									disabled={isSubmitting}
								>
									{isSubmitting ? "Saving..." : "Continue"}
									<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-4">
							<h2 className="text-sm font-medium">Choose a theme</h2>
							<p className="text-xs text-muted-foreground">
								Pick a starting theme for your public page. You can customize it later.
							</p>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
								{THEME_PRESETS.map((theme) => (
									<button
										key={theme.name}
										type="button"
										onClick={() => setSelectedTheme(theme.name)}
										className={`flex flex-col items-center gap-2 border p-3 text-xs transition-colors ${
											selectedTheme === theme.name
												? "border-primary bg-primary/5"
												: "border-border hover:border-muted-foreground/30"
										}`}
									>
										<div className="flex gap-1">
											<div
												className="h-6 w-6 rounded-full"
												style={{ backgroundColor: theme.primary }}
											/>
											<div
												className="h-6 w-6 rounded-full"
												style={{ backgroundColor: theme.accent }}
											/>
										</div>
										<span className="font-medium">{theme.label}</span>
									</button>
								))}
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => setStep(1)}
								>
									<ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
									Back
								</Button>
								<Button
									className="flex-1"
									onClick={handleStep3}
									disabled={isSubmitting}
								>
									{isSubmitting ? "Saving..." : "Continue"}
									<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					)}

					{step === 3 && (
						<div className="space-y-4 text-center">
							<CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
							<h2 className="text-sm font-medium">You're all set!</h2>
							<p className="text-xs text-muted-foreground">
								Your LinkDen page is ready. Head to the builder to start adding
								blocks and customizing your page.
							</p>
							<Button
								className="w-full"
								onClick={handleFinish}
								disabled={isSubmitting}
							>
								{isSubmitting ? "Finishing..." : "Go to Builder"}
								<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
