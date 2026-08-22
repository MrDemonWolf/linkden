"use client";

export const dynamic = "force-dynamic";

import { themePresets } from "@linkden/ui/themes";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Check,
	Eye,
	EyeOff,
	Loader2,
	Palette,
	Rocket,
	Sparkles,
	Type,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShaderBanner } from "@/components/public/shader-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WolfLogo } from "@/components/wolf-logo";
import { authClient } from "@/lib/auth-client";
import { getLoginBgStyle, getLoginShaderPreset, isCustomLoginBg } from "@/lib/login-bg";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

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
		localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...current, ...data }));
	} catch {
		// ignore
	}
}

function clearProgress() {
	if (typeof window === "undefined") return;
	localStorage.removeItem(PROGRESS_KEY);
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEPS = [
	{ label: "Account", icon: User },
	{ label: "Profile", icon: Type },
	{ label: "Theme", icon: Palette },
	{ label: "Launch", icon: Rocket },
] as const;

function SetupSidebar({
	currentStep,
	siteName,
	logoUrl,
}: {
	currentStep: number;
	siteName: string;
	logoUrl: string | null;
}) {
	const percent = Math.min(100, Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100));
	return (
		<aside className="hidden lg:flex lg:w-[240px] lg:flex-col lg:shrink-0 border-r border-border/60 bg-muted/20 p-6">
			<div className="flex items-center gap-2.5 mb-8">
				{logoUrl ? (
					<img
						src={logoUrl}
						alt=""
						className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10"
					/>
				) : (
					<WolfLogo className="h-8 w-8" />
				)}
				<span className="text-sm font-semibold tracking-tight">{siteName}</span>
			</div>

			<div className="mb-1 flex items-baseline justify-between">
				<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Setup
				</span>
				<span className="data-mono text-[11px] text-muted-foreground">{percent}%</span>
			</div>
			<div className="mb-6 h-1 overflow-hidden rounded-full bg-border">
				<div
					className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
					style={{ width: `${percent}%` }}
				/>
			</div>

			<nav aria-label="Setup steps">
				<ol className="space-y-1">
					{STEPS.map(({ label, icon: Icon }, i) => {
						const num = i + 1;
						const isComplete = num < currentStep;
						const isActive = num === currentStep;
						return (
							<li key={label}>
								<div
									className={cn(
										"flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
										isActive && "bg-primary/10 text-primary",
										isComplete && "text-foreground",
										!isActive && !isComplete && "text-muted-foreground",
									)}
									aria-current={isActive ? "step" : undefined}
								>
									<span
										className={cn(
											"flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
											isComplete && "border-primary bg-primary text-white",
											isActive && "border-primary bg-primary/15 text-primary",
											!isActive &&
												!isComplete &&
												"border-border bg-background text-muted-foreground",
										)}
									>
										{isComplete ? (
											<Check className="h-3 w-3 stroke-[3]" />
										) : (
											<Icon className="h-3 w-3" />
										)}
									</span>
									{label}
								</div>
							</li>
						);
					})}
				</ol>
			</nav>
		</aside>
	);
}

function StepIndicator({ currentStep }: { currentStep: number }) {
	return (
		<nav aria-label="Setup progress" className="mb-8">
			<ol className="flex items-center justify-between">
				{STEPS.map(({ label, icon: Icon }, i) => {
					const num = i + 1;
					const isComplete = num < currentStep;
					const isActive = num === currentStep;
					return (
						<li key={label} className="flex flex-1 items-center last:flex-none">
							<div className="flex flex-col items-center gap-2">
								<div
									className={cn(
										"relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500",
										isComplete &&
											"border-primary bg-primary text-white shadow-lg shadow-primary/30",
										isActive &&
											"border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20",
										!isComplete && !isActive && "border-border bg-muted text-muted-foreground",
									)}
									aria-current={isActive ? "step" : undefined}
								>
									{isComplete ? (
										<Check className="h-4 w-4 stroke-[3]" />
									) : (
										<Icon className="h-4 w-4" />
									)}
									{isActive && (
										<span
											className="absolute inset-0 rounded-full animate-ping border border-primary/30"
											style={{ animationDuration: "2s" }}
										/>
									)}
								</div>
								<span
									className={cn(
										"whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest transition-colors duration-300",
										isActive && "text-primary",
										isComplete && "text-primary/60",
										!isActive && !isComplete && "text-muted-foreground",
									)}
								>
									{label}
								</span>
							</div>
							{/* Connector line */}
							{i < STEPS.length - 1 && (
								<div className="mx-3 mt-[-20px] flex-1 h-[2px] overflow-hidden rounded-full bg-border">
									<div
										className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
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
	return <p className="mt-1 text-[11px] text-destructive">{message}</p>;
}

function FormError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<div
			className="mb-5 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
			role="alert"
		>
			<span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
			{message}
		</div>
	);
}

function StepHeader({
	title,
	description,
	icon: Icon,
}: {
	title: string;
	description: string;
	icon?: React.ComponentType<{ className?: string }>;
}) {
	return (
		<div className="text-center mb-7">
			{Icon && (
				<div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
					<Icon className="h-5 w-5 text-primary" />
				</div>
			)}
			<h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
			<p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

function StepFooter({ left, right }: { left?: React.ReactNode; right: React.ReactNode }) {
	return (
		<div className="mt-7 flex items-center justify-between border-t border-border pt-5">
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
	confirmPassword,
	setConfirmPassword,
	showPassword,
	setShowPassword,
	showConfirmPassword,
	setShowConfirmPassword,
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
	confirmPassword: string;
	setConfirmPassword: (v: string) => void;
	showPassword: boolean;
	setShowPassword: (v: boolean) => void;
	showConfirmPassword: boolean;
	setShowConfirmPassword: (v: boolean) => void;
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
		<form
			className="p-6 sm:p-8"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
		>
			<StepHeader
				icon={User}
				title="Create your admin account"
				description="You'll be the owner of this LinkDen instance."
			/>

			<FormError message={formErrors.form} />

			<div className="space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor="setup-name" className="text-sm font-medium text-foreground">
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
						autoComplete="name"
						className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
						aria-invalid={!!formErrors.name}
						autoFocus
					/>
					<FieldError message={formErrors.name} />
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="setup-email" className="text-sm font-medium text-foreground">
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
						autoComplete="email"
						className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
						aria-invalid={!!formErrors.email}
					/>
					<FieldError message={formErrors.email} />
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="setup-password" className="text-sm font-medium text-foreground">
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
							autoComplete="new-password"
							className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-11"
							aria-invalid={!!formErrors.password}
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
							aria-label={showPassword ? "Hide password" : "Show password"}
							aria-pressed={showPassword}
						>
							{showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
						</button>
					</div>
					{formErrors.password ? (
						<FieldError message={formErrors.password} />
					) : (
						<p className="mt-1 text-[11px] text-muted-foreground">
							Use at least 8 characters. This secures your admin account.
						</p>
					)}
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="setup-confirm-password" className="text-sm font-medium text-foreground">
						Confirm Password
					</Label>
					<div className="relative">
						<Input
							id="setup-confirm-password"
							type={showConfirmPassword ? "text" : "password"}
							value={confirmPassword}
							onChange={(e) => {
								setConfirmPassword(e.target.value);
								clear("confirmPassword");
							}}
							placeholder="Re-enter your password"
							autoComplete="new-password"
							className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-11"
							aria-invalid={!!formErrors.confirmPassword}
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
					<FieldError message={formErrors.confirmPassword} />
				</div>
			</div>

			<StepFooter
				right={
					<Button
						type="submit"
						disabled={isSubmitting}
						className="w-full sm:w-auto shadow-lg shadow-primary/20 active:scale-[0.98]"
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
		</form>
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
	onBack,
	onSkip,
	onSubmit,
}: {
	displayName: string;
	setDisplayName: (v: string) => void;
	bio: string;
	setBio: (v: string) => void;
	isSubmitting: boolean;
	onBack: () => void;
	onSkip: () => void;
	onSubmit: () => void;
}) {
	return (
		<form
			className="p-6 sm:p-8"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
		>
			<StepHeader
				icon={Type}
				title="Set up your profile"
				description="This shows on your public LinkDen page. You can always update it later."
			/>

			<div className="space-y-5">
				<div className="space-y-1.5">
					<Label htmlFor="profile-display-name" className="text-sm font-medium text-foreground">
						Display Name
					</Label>
					<Input
						id="profile-display-name"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						placeholder="How you want to be known"
						className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
					/>
				</div>

				<div>
					<div className="mb-1.5 flex items-center justify-between">
						<Label htmlFor="profile-bio" className="text-sm font-medium text-foreground">
							Short Bio
						</Label>
						<span
							className={cn(
								"font-mono text-[10px] tabular-nums transition-colors",
								bio.length > BIO_MAX ? "text-destructive" : "text-muted-foreground",
							)}
						>
							{bio.length}/{BIO_MAX}
						</span>
					</div>
					<textarea
						id="profile-bio"
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						placeholder="A short description of what you do..."
						rows={4}
						aria-invalid={bio.length > BIO_MAX}
						aria-describedby={bio.length > BIO_MAX ? "profile-bio-error" : undefined}
						className={cn(
							"w-full resize-none rounded-md border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2",
							bio.length > BIO_MAX
								? "border-destructive focus:border-destructive focus:ring-destructive/30"
								: "border-border focus:border-ring focus:ring-ring/30",
						)}
					/>
					{bio.length > BIO_MAX && (
						<p id="profile-bio-error" className="mt-1 text-[11px] text-destructive">
							Bio is {bio.length - BIO_MAX} character{bio.length - BIO_MAX === 1 ? "" : "s"} over
							the {BIO_MAX} limit.
						</p>
					)}
				</div>
			</div>

			<StepFooter
				left={
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onBack}
							className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-3 w-3" />
							Back
						</button>
						<button
							type="button"
							onClick={onSkip}
							className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							Skip
						</button>
					</div>
				}
				right={
					<Button
						type="submit"
						disabled={isSubmitting || bio.length > BIO_MAX}
						className="shadow-lg shadow-primary/20 active:scale-[0.98]"
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
		</form>
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
					? "border-primary shadow-lg shadow-primary/20 scale-[1.02]"
					: "border-white/10 hover:border-white/20 hover:shadow-md hover:shadow-white/5",
			)}
			aria-pressed={selected}
			title={preset.label}
		>
			{/* Preview */}
			<div className="flex h-14 w-full flex-col gap-1 p-2" style={{ backgroundColor: bg }}>
				<div className="h-2 w-3/4 rounded-full opacity-60" style={{ backgroundColor: card }} />
				<div className="h-5 w-full rounded" style={{ backgroundColor: card }} />
				<div
					className="h-2 rounded-full"
					style={{
						background: `linear-gradient(90deg, ${primary}, ${accent})`,
					}}
				/>
			</div>

			{/* Label */}
			<div className="bg-muted px-2 py-1.5 flex items-center justify-between">
				<span className="truncate text-[10px] font-semibold text-foreground">{preset.label}</span>
				{selected && <Check className="h-3 w-3 shrink-0 text-primary stroke-[3]" />}
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
	onBack,
	onSkip,
	onSubmit,
}: {
	themePreset: string;
	setThemePreset: (v: string) => void;
	isSubmitting: boolean;
	onBack: () => void;
	onSkip: () => void;
	onSubmit: () => void;
}) {
	return (
		<div className="p-6 sm:p-8">
			<StepHeader
				icon={Palette}
				title="Choose a theme"
				description="Pick a look for your public page. You can customize everything in detail later."
			/>

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

			<StepFooter
				left={
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onBack}
							className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-3 w-3" />
							Back
						</button>
						<button
							type="button"
							onClick={onSkip}
							className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							Skip
						</button>
					</div>
				}
				right={
					<Button
						onClick={onSubmit}
						disabled={isSubmitting}
						className="shadow-lg shadow-primary/20 active:scale-[0.98]"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							<>
								Finish Setup
								<Sparkles className="ml-1.5 h-3.5 w-3.5" />
							</>
						)}
					</Button>
				}
			/>
		</div>
	);
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function Step4Done({ displayName, onContinue }: { displayName: string; onContinue: () => void }) {
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

			<h1 className="text-2xl font-bold tracking-tight text-foreground">
				You&apos;re all set, {firstName}!
			</h1>
			<p className="mx-auto mt-2 mb-8 max-w-xs text-sm text-muted-foreground">
				Your LinkDen is ready. Start building your page, adding links, and making it yours.
			</p>

			<Button
				onClick={onContinue}
				className="h-11 w-full shadow-lg shadow-primary/20 active:scale-[0.98]"
			>
				<Rocket className="mr-2 h-4 w-4" />
				Open Dashboard
			</Button>

			<p className="mt-4 text-[11px] text-muted-foreground">
				Profile, theme, and settings are always editable from the admin panel.
			</p>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SetupPage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// Initialize with defaults; restore from localStorage in useEffect to avoid SSR mismatch
	const [step, setStep] = useState<number>(1);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [bio, setBio] = useState("");
	const [themePreset, setThemePreset] = useState("default");
	const [hydrated, setHydrated] = useState(false);

	const {
		data: hasUsersData,
		isLoading,
		isError: hasUsersError,
		isFetching: hasUsersFetching,
		refetch: refetchHasUsers,
	} = useQuery({
		...trpc.public.hasUsers.queryOptions(),
		// Failures render the inline error card below — the global toast would be redundant
		meta: { skipErrorToast: true },
	});
	const setupStatus = useQuery({
		...trpc.public.getSetupStatus.queryOptions(),
		meta: { skipErrorToast: true },
	});
	const branding = setupStatus.data?.branding;
	const loginBgStyle = getLoginBgStyle(branding);
	const loginShaderPreset = getLoginShaderPreset(branding);
	const hasCustomBg = isCustomLoginBg(branding);
	const siteName = branding?.siteName || "LinkDen";
	const loginLogoUrl = branding?.loginLogoUrl || branding?.logoUrl || null;
	const updateBulk = useMutation(trpc.settings.updateBulk.mutationOptions());

	const [testMode] = useState(
		() =>
			typeof window !== "undefined" &&
			new URLSearchParams(window.location.search).get("test") === "true",
	);

	// Restore from localStorage after mount to avoid SSR hydration mismatch
	useEffect(() => {
		if (testMode) {
			// Pre-fill dummy data so dev doesn't have to type every time
			setName("Dev User");
			setEmail("dev@linkden.local");
			setPassword("password123");
			setConfirmPassword("password123");
			setDisplayName("Dev User");
			setBio("Just a dev testing things out.");
			setHydrated(true);
			return;
		}
		const saved = loadProgress();
		if (saved.step) setStep(saved.step);
		if (saved.name) setName(saved.name);
		if (saved.displayName) setDisplayName(saved.displayName);
		if (saved.bio) setBio(saved.bio);
		if (saved.themePreset) setThemePreset(saved.themePreset);
		setHydrated(true);
	}, [testMode]);

	// Persist non-sensitive progress on change (email excluded — sensitive data should not live in localStorage)
	useEffect(() => {
		if (!hydrated || testMode) return;
		saveProgress({ step, name, displayName, bio, themePreset });
	}, [step, name, displayName, bio, themePreset, hydrated, testMode]);

	useEffect(() => {
		if (hasUsersData?.hasUsers) {
			router.replace(testMode ? "/admin" : "/admin/login");
		}
	}, [hasUsersData, router, testMode]);

	// API unreachable — surface an error card with a retry path instead of spinning forever
	if (hasUsersError && !hasUsersData) {
		return (
			<main className="login-bg flex min-h-screen items-center justify-center p-4 sm:p-6">
				<div
					className="login-glass-card w-full max-w-[420px] rounded-2xl p-6 text-center shadow-2xl sm:p-8"
					role="alert"
				>
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
						<AlertTriangle className="h-6 w-6 text-destructive" />
					</div>
					<h1 className="text-xl font-bold tracking-tight text-foreground">
						Can&apos;t reach the server
					</h1>
					<p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
						Setup couldn&apos;t load because the API isn&apos;t responding. Check that the server is
						running, then try again.
					</p>
					<Button
						onClick={() => {
							refetchHasUsers();
							setupStatus.refetch();
						}}
						disabled={hasUsersFetching}
						className="mt-6 shadow-lg shadow-primary/20 active:scale-[0.98]"
					>
						{hasUsersFetching ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Retrying...
							</>
						) : (
							"Retry"
						)}
					</Button>
				</div>
			</main>
		);
	}

	if (isLoading || hasUsersData?.hasUsers) {
		return (
			<main className="login-bg flex min-h-screen items-center justify-center">
				<div role="status" aria-label="Loading" className="flex items-center justify-center">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<span className="sr-only">Loading</span>
				</div>
			</main>
		);
	}

	const goStep = (n: number) => setStep(n);

	// Step 1 submit — create account
	const handleAccountSubmit = async () => {
		const errors: Record<string, string> = {};
		if (!name.trim()) errors.name = "What should we call you?";
		if (!email.trim()) errors.email = "We need your email to set up your account";
		if (!password) errors.password = "Pick a password to secure your account";
		else if (password.length < 8) errors.password = "A bit short — use at least 8 characters";
		if (!confirmPassword) errors.confirmPassword = "Re-enter your password to confirm";
		else if (password && password !== confirmPassword)
			errors.confirmPassword = "Passwords don't match";

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
						const msg =
							error.error.message ||
							"Something went wrong — please try again. If this keeps happening, check the server logs.";
						setFormErrors({ form: msg });
					},
				},
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Step 2 submit — save profile
	const handleProfileSubmit = async () => {
		setIsSubmitting(true);
		try {
			type BulkInput = Parameters<typeof updateBulk.mutateAsync>[0];
			const updates: BulkInput = [];
			if (displayName.trim()) updates.push({ key: "profile_name", value: displayName.trim() });
			if (bio.trim()) updates.push({ key: "bio", value: bio.trim() });
			if (updates.length > 0) await updateBulk.mutateAsync(updates);
		} catch (err) {
			// non-blocking — profile can be edited later, but surface why the save failed
			const msg = err instanceof Error && err.message ? err.message : "Could not save profile";
			toast.error(msg, {
				description:
					"You can finish your profile later in the admin panel. If this keeps happening, check the server logs.",
			});
		} finally {
			setIsSubmitting(false);
			goStep(3);
		}
	};

	// Step 3 submit — save theme
	const handleCustomizeSubmit = async () => {
		setIsSubmitting(true);
		try {
			type BulkInput = Parameters<typeof updateBulk.mutateAsync>[0];
			await updateBulk.mutateAsync([{ key: "theme_preset", value: themePreset }] as BulkInput);
		} catch (err) {
			// non-blocking — theme can be changed later, but surface why the save failed
			const msg = err instanceof Error && err.message ? err.message : "Could not save theme";
			toast.error(msg, {
				description:
					"You can pick a theme later under Appearance. If this keeps happening, check the server logs.",
			});
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
		<div className="login-bg relative min-h-screen overflow-hidden" style={loginBgStyle}>
			{loginShaderPreset && (
				<div className="absolute inset-0">
					<ShaderBanner preset={loginShaderPreset} />
				</div>
			)}
			{hasCustomBg && <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />}
			{/* Theme toggle */}
			<div className="absolute right-4 top-4 z-20">
				<ThemeToggle />
			</div>

			<main className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
				<div
					className={cn(
						"login-card-enter w-full",
						step < 4
							? "lg:flex lg:w-[820px] lg:max-w-full lg:overflow-hidden lg:rounded-2xl lg:shadow-2xl lg:bg-card lg:border lg:border-border"
							: "max-w-[480px]",
					)}
				>
					{step < 4 && (
						<SetupSidebar currentStep={step} siteName={siteName} logoUrl={loginLogoUrl} />
					)}

					<div className={cn("flex-1 min-w-0", step < 4 && "lg:flex lg:flex-col")}>
						{/* Mobile / small-screen stepper — hidden once sidebar shows */}
						{step < 4 && (
							<div className="lg:hidden mb-6 max-w-[480px] mx-auto">
								<StepIndicator currentStep={step} />
							</div>
						)}

						<div
							className={cn(
								"login-glass-card overflow-hidden rounded-2xl shadow-2xl mx-auto w-full max-w-[480px]",
								step < 4 &&
									"lg:rounded-none lg:border-0 lg:shadow-none lg:bg-transparent lg:max-w-none lg:flex-1",
							)}
						>
							{step === 1 && (
								<Step1Account
									name={name}
									setName={setName}
									email={email}
									setEmail={setEmail}
									password={password}
									setPassword={setPassword}
									confirmPassword={confirmPassword}
									setConfirmPassword={setConfirmPassword}
									showPassword={showPassword}
									setShowPassword={setShowPassword}
									showConfirmPassword={showConfirmPassword}
									setShowConfirmPassword={setShowConfirmPassword}
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
									onBack={() => goStep(1)}
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
									onBack={() => goStep(2)}
									onSkip={() => {
										clearProgress();
										goStep(4);
									}}
									onSubmit={handleCustomizeSubmit}
								/>
							)}
							{step === 4 && (
								<Step4Done displayName={displayName || name} onContinue={handleDone} />
							)}
						</div>

						{/* Resume notice — shown when progress was restored mid-wizard */}
						{step > 1 && step < 4 && hydrated && (
							<p className="mt-3 text-center text-[11px] text-muted-foreground">
								Progress saved —{" "}
								<button
									type="button"
									className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
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
			</main>
		</div>
	);
}
