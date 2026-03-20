"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	ArrowRight,
	Check,
	Loader2,
	Eye,
	EyeOff,
	Rocket,
	Palette,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { themePresets } from "@linkden/ui/themes";

// ─── Setup Wizard ──────────────────────────────────────────────────────────
// Four-step first-run wizard: Account → Profile → Customize → Done.
//
// First-user-is-admin: the wizard only renders when no users exist in the DB.
// Once a user registers in step 1, /sign-up is locked server-side (see server/index.ts).
//
// localStorage strategy: wizard progress (step, name, displayName, bio, themePreset)
// is saved to localStorage so refreshing mid-wizard doesn't lose input. Email and
// password are intentionally excluded — credentials should never live in localStorage
// on potentially shared devices. Progress is cleared on completion or manual "start over".

const PROGRESS_KEY = "linkden_setup_progress";

// Only persist non-sensitive wizard progress — email is intentionally excluded
// to avoid leaking credentials in localStorage if the browser is shared
interface SetupProgress {
	step: number;
	name: string;
	displayName: string;
	bio: string;
	themePreset: string;
}

function loadProgress(): Partial<SetupProgress> {
	if (typeof window === "undefined") return {};
	try {
		const raw = localStorage.getItem(PROGRESS_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function saveProgress(data: Partial<SetupProgress>) {
	if (typeof window === "undefined") return;
	try {
		const current = loadProgress();
		localStorage.setItem(
			PROGRESS_KEY,
			JSON.stringify({ ...current, ...data }),
		);
	} catch {
		// ignore
	}
}

function clearProgress() {
	if (typeof window === "undefined") return;
	localStorage.removeItem(PROGRESS_KEY);
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEP_LABELS = ["Account", "Profile", "Customize", "Done"];

function StepIndicator({ currentStep }: { currentStep: number }) {
	return (
		<nav aria-label="Setup progress" className="mb-8">
			<ol className="flex items-start">
				{STEP_LABELS.map((label, i) => {
					const num = i + 1;
					const isComplete = num < currentStep;
					const isActive = num === currentStep;
					return (
						<li
							key={label}
							className="flex flex-1 items-start last:flex-none"
						>
							<div className="flex flex-col items-center gap-1.5">
								<div
									className={cn(
										"flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all duration-500",
										isComplete &&
											"border-primary bg-primary text-white",
										isActive &&
											"border-primary bg-[#1a1f2e] text-primary shadow-primary/40",
										!isComplete &&
											!isActive &&
											"border-slate-700 bg-slate-800/50 text-slate-600",
									)}
									aria-current={isActive ? "step" : undefined}
								>
									{isComplete ? (
										<Check className="h-3.5 w-3.5 stroke-[3]" />
									) : (
										num
									)}
								</div>
								<span
									className={cn(
										"whitespace-nowrap text-[9px] font-semibold uppercase tracking-widest transition-colors duration-300",
										isActive && "text-primary",
										isComplete && "text-primary/60",
										!isActive && !isComplete && "text-slate-600",
									)}
								>
									{label}
								</span>
							</div>
							{/* Connector */}
							{i < STEP_LABELS.length - 1 && (
								<div className="mx-2 mt-[15px] flex-1 h-[2px] overflow-hidden rounded-full bg-slate-800">
									<div
										className="h-full rounded-full bg-primary transition-all duration-700"
										style={{ width: currentStep > num ? "100%" : "0%" }}
									/>
								</div>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return <p className="mt-1 text-[11px] text-red-400">{message}</p>;
}

function FormError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<div
			className="mb-5 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3.5 py-2.5 text-xs text-red-400"
			role="alert"
		>
			{message}
		</div>
	);
}

function CardFooter({
	left,
	right,
}: {
	left?: React.ReactNode;
	right: React.ReactNode;
}) {
	return (
		<div className="mt-7 flex items-center justify-between border-t border-white/[0.06] pt-5">
			<div>{left}</div>
			<div>{right}</div>
		</div>
	);
}

// ─── Step 1: Account ─────────────────────────────────────────────────────────

function Step1Account({
	name,
	setName,
	email,
	setEmail,
	password,
	setPassword,
	showPassword,
	setShowPassword,
	formErrors,
	setFormErrors,
	isSubmitting,
	onSubmit,
}: {
	name: string;
	setName: (v: string) => void;
	email: string;
	setEmail: (v: string) => void;
	password: string;
	setPassword: (v: string) => void;
	showPassword: boolean;
	setShowPassword: (v: boolean) => void;
	formErrors: Record<string, string>;
	setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
	isSubmitting: boolean;
	onSubmit: () => void;
}) {
	const clear = (key: string) =>
		setFormErrors((p) => {
			const n = { ...p };
			delete n[key];
			return n;
		});

	return (
		<div className="p-6 sm:p-8">
			<div className="mb-7">
				<div className="mb-5 flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
						LD
					</div>
				</div>
				<h1 className="text-xl font-bold tracking-tight text-white">
					Create your admin account
				</h1>
				<p className="mt-1 text-sm text-slate-400">
					You&apos;ll be the owner of this LinkDen instance.
				</p>
			</div>

			<FormError message={formErrors.form} />

			<div className="space-y-4">
				<div>
					<Label
						htmlFor="setup-name"
						className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
					>
						Full Name
					</Label>
					<Input
						id="setup-name"
						value={name}
						onChange={(e) => {
							setName(e.target.value);
							clear("name");
						}}
						placeholder="Your name"
						className="h-11 border-white/10 bg-[#0f1318] text-slate-100 placeholder:text-slate-600 focus-visible:border-primary/50 focus-visible:ring-primary/30"
						aria-invalid={!!formErrors.name}
					/>
					<FieldError message={formErrors.name} />
				</div>

				<div>
					<Label
						htmlFor="setup-email"
						className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
					>
						Email Address
					</Label>
					<Input
						id="setup-email"
						type="email"
						value={email}
						onChange={(e) => {
							setEmail(e.target.value);
							clear("email");
						}}
						placeholder="you@example.com"
						className="h-11 border-white/10 bg-[#0f1318] text-slate-100 placeholder:text-slate-600 focus-visible:border-primary/50 focus-visible:ring-primary/30"
						aria-invalid={!!formErrors.email}
					/>
					<FieldError message={formErrors.email} />
				</div>

				<div>
					<Label
						htmlFor="setup-password"
						className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
					>
						Password
					</Label>
					<div className="relative">
						<Input
							id="setup-password"
							type={showPassword ? "text" : "password"}
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								clear("password");
							}}
							placeholder="At least 8 characters"
							className="h-11 border-white/10 bg-[#0f1318] pr-11 text-slate-100 placeholder:text-slate-600 focus-visible:border-primary/50 focus-visible:ring-primary/30"
							aria-invalid={!!formErrors.password}
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-slate-600 transition-colors hover:text-slate-300"
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
					<FieldError message={formErrors.password} />
				</div>
			</div>

			<CardFooter
				left={
					<a
						href="/admin/login"
						className="text-xs text-slate-500 transition-colors hover:text-slate-300"
					>
						Already have an account?
					</a>
				}
				right={
					<Button
						onClick={onSubmit}
						disabled={isSubmitting}
						className="bg-primary px-7 text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98]"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Creating...
							</>
						) : (
							<>
								Continue
								<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
							</>
						)}
					</Button>
				}
			/>
		</div>
	);
}

// ─── Step 2: Profile ──────────────────────────────────────────────────────────

const BIO_MAX = 160;

function Step2Profile({
	displayName,
	setDisplayName,
	bio,
	setBio,
	isSubmitting,
	onSkip,
	onSubmit,
}: {
	displayName: string;
	setDisplayName: (v: string) => void;
	bio: string;
	setBio: (v: string) => void;
	isSubmitting: boolean;
	onSkip: () => void;
	onSubmit: () => void;
}) {
	return (
		<div className="p-6 sm:p-8">
			<div className="mb-7">
				<h1 className="text-xl font-bold tracking-tight text-white">
					Set up your profile
				</h1>
				<p className="mt-1 text-sm text-slate-400">
					This shows on your public LinkDen page. You can always update it
					later.
				</p>
			</div>

			<div className="space-y-5">
				<div>
					<Label
						htmlFor="profile-display-name"
						className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
					>
						Display Name
					</Label>
					<Input
						id="profile-display-name"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						placeholder="How you want to be known"
						className="h-11 border-white/10 bg-[#0f1318] text-slate-100 placeholder:text-slate-600 focus-visible:border-primary/50 focus-visible:ring-primary/30"
					/>
				</div>

				<div>
					<div className="mb-1.5 flex items-center justify-between">
						<Label
							htmlFor="profile-bio"
							className="text-xs font-semibold uppercase tracking-wider text-slate-500"
						>
							Short Bio
						</Label>
						<span
							className={cn(
								"font-mono text-[10px] tabular-nums transition-colors",
								bio.length > BIO_MAX ? "text-red-400" : "text-slate-600",
							)}
						>
							{bio.length}/{BIO_MAX}
						</span>
					</div>
					<textarea
						id="profile-bio"
						value={bio}
						onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
						placeholder="A short description of what you do..."
						rows={4}
						className="w-full resize-none rounded-md border border-white/10 bg-[#0f1318] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
				</div>
			</div>

			<CardFooter
				left={
					<button
						type="button"
						onClick={onSkip}
						className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
					>
						Skip for now
					</button>
				}
				right={
					<Button
						onClick={onSubmit}
						disabled={isSubmitting || bio.length > BIO_MAX}
						className="bg-primary px-7 text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98]"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							<>
								Continue
								<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
							</>
						)}
					</Button>
				}
			/>
		</div>
	);
}

// ─── Step 3: Customize (theme) ────────────────────────────────────────────────

function ThemeCard({
	preset,
	selected,
	onSelect,
}: {
	preset: (typeof themePresets)[number];
	selected: boolean;
	onSelect: () => void;
}) {
	const dark = preset.cssVars.dark;
	const primary = dark["--ld-primary"];
	const accent = dark["--ld-accent"];
	const bg = dark["--ld-background"];
	const card = dark["--ld-card"];

	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all duration-200",
				selected
					? "border-primary shadow-primary/35"
					: "border-white/10 hover:border-white/20",
			)}
			aria-pressed={selected}
			title={preset.label}
		>
			{/* Preview */}
			<div
				className="flex h-14 w-full flex-col gap-1 p-2"
				style={{ backgroundColor: bg }}
			>
				<div
					className="h-2 w-3/4 rounded-full opacity-60"
					style={{ backgroundColor: card }}
				/>
				<div
					className="h-5 w-full rounded"
					style={{ backgroundColor: card }}
				/>
				<div
					className="h-2 rounded-full"
					style={{
						background: `linear-gradient(90deg, ${primary}, ${accent})`,
					}}
				/>
			</div>

			{/* Label */}
			<div className="bg-slate-900/40 px-2 py-1.5 flex items-center justify-between">
				<span className="truncate text-[10px] font-semibold text-slate-300">
					{preset.label}
				</span>
				{selected && (
					<Check className="h-3 w-3 shrink-0 text-primary stroke-[3]" />
				)}
			</div>

			{/* Color dots */}
			<div className="absolute top-1.5 right-1.5 flex gap-0.5">
				<div
					className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20"
					style={{ backgroundColor: primary }}
				/>
				<div
					className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20"
					style={{ backgroundColor: accent }}
				/>
			</div>
		</button>
	);
}

function Step3Customize({
	themePreset,
	setThemePreset,
	isSubmitting,
	onSkip,
	onSubmit,
}: {
	themePreset: string;
	setThemePreset: (v: string) => void;
	isSubmitting: boolean;
	onSkip: () => void;
	onSubmit: () => void;
}) {
	return (
		<div className="p-6 sm:p-8">
			<div className="mb-6">
				<div className="mb-3 flex items-center gap-2">
					<Palette className="h-4 w-4 text-primary" />
					<h1 className="text-xl font-bold tracking-tight text-white">
						Choose a theme
					</h1>
				</div>
				<p className="text-sm text-slate-400">
					Pick a look for your public page. You can customize everything in
					detail later.
				</p>
			</div>

			<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
				{themePresets.map((preset) => (
					<ThemeCard
						key={preset.name}
						preset={preset}
						selected={themePreset === preset.name}
						onSelect={() => setThemePreset(preset.name)}
					/>
				))}
			</div>

			<CardFooter
				left={
					<button
						type="button"
						onClick={onSkip}
						className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
					>
						Skip for now
					</button>
				}
				right={
					<Button
						onClick={onSubmit}
						disabled={isSubmitting}
						className="bg-primary px-7 text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98]"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							<>
								Finish
								<Check className="ml-1.5 h-3.5 w-3.5 stroke-[2.5]" />
							</>
						)}
					</Button>
				}
			/>
		</div>
	);
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function Step4Done({
	displayName,
	onContinue,
}: {
	displayName: string;
	onContinue: () => void;
}) {
	const firstName = displayName.trim().split(" ")[0] || "there";
	return (
		<div className="p-6 sm:p-10 text-center">
			<div className="mb-6 flex justify-center">
				<div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
					<Check className="h-7 w-7 stroke-[2.5] text-primary" />
					<div
						className="absolute inset-0 animate-ping rounded-full border border-primary/25"
						style={{ animationDuration: "2.5s" }}
					/>
				</div>
			</div>

			<h1 className="text-2xl font-bold tracking-tight text-white">
				You&apos;re all set, {firstName}!
			</h1>
			<p className="mx-auto mt-2 mb-8 max-w-xs text-sm text-slate-400">
				Your LinkDen is ready. Start building your page, adding links, and
				making it yours.
			</p>

			<Button
				onClick={onContinue}
				className="h-11 w-full bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98]"
			>
				<Rocket className="mr-2 h-4 w-4" />
				Open Dashboard
			</Button>

			<p className="mt-4 text-[11px] text-slate-600">
				Profile, theme, and settings are always editable from the admin panel.
			</p>
		</div>
	);
}

// ─── Preview Banner ───────────────────────────────────────────────────────────

function PreviewBanner() {
	return (
		<div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.08] px-3 py-2 text-xs font-medium text-amber-400">
			<span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
			Preview mode — no data will be saved
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SetupPage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});
	const [showPassword, setShowPassword] = useState(false);

	// Initialize with defaults; restore from localStorage in useEffect to avoid SSR mismatch
	const [step, setStep] = useState<number>(1);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [bio, setBio] = useState("");
	const [themePreset, setThemePreset] = useState("default");
	const [hydrated, setHydrated] = useState(false);

	const { data: hasUsersData, isLoading } = useQuery(
		trpc.public.hasUsers.queryOptions(),
	);
	const updateBulk = useMutation(trpc.settings.updateBulk.mutationOptions());

	const isDev = process.env.NODE_ENV === "development";
	const [devBypass] = useState(
		() =>
			isDev &&
			typeof window !== "undefined" &&
			new URLSearchParams(window.location.search).has("preview"),
	);

	// Restore from localStorage after mount to avoid SSR hydration mismatch
	useEffect(() => {
		const saved = loadProgress();
		if (saved.step) setStep(saved.step);
		if (saved.name) setName(saved.name);
		if (saved.displayName) setDisplayName(saved.displayName);
		if (saved.bio) setBio(saved.bio);
		if (saved.themePreset) setThemePreset(saved.themePreset);
		setHydrated(true);
	}, []);

	// Persist non-sensitive progress on change (email excluded — sensitive data should not live in localStorage)
	useEffect(() => {
		if (!hydrated || devBypass) return;
		saveProgress({ step, name, displayName, bio, themePreset });
	}, [step, name, displayName, bio, themePreset, hydrated, devBypass]);

	useEffect(() => {
		if (!devBypass && hasUsersData?.hasUsers) {
			router.replace("/admin/login");
		}
	}, [hasUsersData, router, devBypass]);

	if (!devBypass && (isLoading || hasUsersData?.hasUsers)) {
		return (
			<div
				className="login-bg flex min-h-screen items-center justify-center"
				role="status"
				aria-label="Loading"
			>
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<span className="sr-only">Loading</span>
			</div>
		);
	}

	const goStep = (n: number) => setStep(n);

	// Step 1 submit — create account
	const handleAccountSubmit = async () => {
		if (devBypass) {
			setDisplayName(name || "Preview User");
			goStep(2);
			return;
		}

		const errors: Record<string, string> = {};
		if (!name.trim()) errors.name = "Name is required";
		if (!email.trim()) errors.email = "Email is required";
		if (!password) errors.password = "Password is required";
		else if (password.length < 8)
			errors.password = "Must be at least 8 characters";

		setFormErrors(errors);
		if (Object.keys(errors).length > 0) return;

		setIsSubmitting(true);
		try {
			await authClient.signUp.email(
				{ name: name.trim(), email: email.trim(), password },
				{
					onSuccess: () => {
						const dn = name.trim();
						setDisplayName(dn);
						saveProgress({ step: 2, displayName: dn });
						goStep(2);
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

	// Step 2 submit — save profile
	const handleProfileSubmit = async () => {
		if (devBypass) {
			goStep(3);
			return;
		}
		setIsSubmitting(true);
		try {
			type BulkInput = Parameters<typeof updateBulk.mutateAsync>[0];
			const updates: BulkInput = [];
			if (displayName.trim())
				updates.push({ key: "profile_name", value: displayName.trim() });
			if (bio.trim()) updates.push({ key: "bio", value: bio.trim() });
			if (updates.length > 0) await updateBulk.mutateAsync(updates);
		} catch {
			// non-blocking
		} finally {
			setIsSubmitting(false);
			goStep(3);
		}
	};

	// Step 3 submit — save theme
	const handleCustomizeSubmit = async () => {
		if (devBypass) {
			goStep(4);
			return;
		}
		setIsSubmitting(true);
		try {
			type BulkInput = Parameters<typeof updateBulk.mutateAsync>[0];
			await updateBulk.mutateAsync([
				{ key: "theme_preset", value: themePreset },
			] as BulkInput);
		} catch {
			// non-blocking
		} finally {
			setIsSubmitting(false);
			clearProgress();
			goStep(4);
		}
	};

	// Step 4 — go to dashboard (also clears progress if not cleared yet)
	const handleDone = () => {
		clearProgress();
		router.push("/admin");
	};

	return (
		<div className="login-bg flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
			<div className="login-card-enter w-full max-w-[460px]">
				{step < 4 && <StepIndicator currentStep={step} />}
				{devBypass && <PreviewBanner />}

				<div
					className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1a1f2e] shadow-2xl ring-1 ring-primary/10"
				>
					{step === 1 && (
						<Step1Account
							name={name}
							setName={setName}
							email={email}
							setEmail={setEmail}
							password={password}
							setPassword={setPassword}
							showPassword={showPassword}
							setShowPassword={setShowPassword}
							formErrors={formErrors}
							setFormErrors={setFormErrors}
							isSubmitting={isSubmitting}
							onSubmit={handleAccountSubmit}
						/>
					)}
					{step === 2 && (
						<Step2Profile
							displayName={displayName}
							setDisplayName={setDisplayName}
							bio={bio}
							setBio={setBio}
							isSubmitting={isSubmitting}
							onSkip={() => goStep(3)}
							onSubmit={handleProfileSubmit}
						/>
					)}
					{step === 3 && (
						<Step3Customize
							themePreset={themePreset}
							setThemePreset={(v) => {
								setThemePreset(v);
								saveProgress({ themePreset: v });
							}}
							isSubmitting={isSubmitting}
							onSkip={() => {
								clearProgress();
								goStep(4);
							}}
							onSubmit={handleCustomizeSubmit}
						/>
					)}
					{step === 4 && (
						<Step4Done
							displayName={displayName || name}
							onContinue={handleDone}
						/>
					)}
				</div>

				{/* Resume notice — shown when progress was restored mid-wizard */}
				{step > 1 && step < 4 && hydrated && (
					<p className="mt-3 text-center text-[11px] text-slate-600">
						Progress saved —{" "}
						<button
							type="button"
							className="text-slate-500 underline underline-offset-2 hover:text-slate-300"
							onClick={() => {
								clearProgress();
								goStep(1);
							}}
						>
							start over
						</button>
					</p>
				)}
			</div>
		</div>
	);
}
