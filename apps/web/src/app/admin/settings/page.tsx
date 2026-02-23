"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	User,
	Search as SearchIcon,
	MessageSquare,
	Shield,
	Mail,
	Download,
	Upload,
	Info,
	ExternalLink,
	Save,
	Blocks,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "@/components/admin/image-upload-field";

// ---- Section Component ----
function Section({
	id,
	icon: Icon,
	title,
	description,
	children,
}: {
	id: string;
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section id={id} className="scroll-mt-6">
			<div className="mb-4">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
						<Icon className="h-3.5 w-3.5 text-muted-foreground" />
					</div>
					<h2 className="text-sm font-semibold tracking-tight">{title}</h2>
				</div>
				{description && (
					<p className="mt-1 ml-9 text-xs text-muted-foreground">
						{description}
					</p>
				)}
			</div>
			<Card className="overflow-hidden">
				<CardContent className="space-y-4 p-5">{children}</CardContent>
			</Card>
		</section>
	);
}

// ---- Field Group ----
function FieldGroup({
	children,
	columns = 1,
}: {
	children: React.ReactNode;
	columns?: 1 | 2;
}) {
	return (
		<div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
			{children}
		</div>
	);
}

// ---- Toggle Field ----
function ToggleField({
	id,
	label,
	description,
	checked,
	onChange,
}: {
	id: string;
	label: string;
	description?: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label
			htmlFor={id}
			className="flex items-start gap-3 cursor-pointer group"
		>
			<button
				id={id}
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={cn(
					"relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
					checked ? "bg-primary" : "bg-muted",
				)}
			>
				<span
					className={cn(
						"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
						checked ? "translate-x-[18px]" : "translate-x-[3px]",
					)}
				/>
			</button>
			<div className="min-w-0 flex-1">
				<span className="text-xs font-medium group-hover:text-foreground transition-colors">
					{label}
				</span>
				{description && (
					<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
						{description}
					</p>
				)}
			</div>
		</label>
	);
}

// ---- Nav Items ----
const NAV_ITEMS = [
	{ id: "profile", label: "Profile", icon: User },
	{ id: "seo", label: "SEO", icon: SearchIcon },
	{ id: "blocks", label: "Blocks", icon: Blocks },
	{ id: "captcha", label: "CAPTCHA", icon: Shield },
	{ id: "email", label: "Email", icon: Mail },
	{ id: "export", label: "Export", icon: Download },
	{ id: "about", label: "About", icon: Info },
] as const;

export default function SettingsPage() {
	const qc = useQueryClient();
	const settingsQuery = useQuery(trpc.settings.getAll.queryOptions());
	const updateSettings = useMutation(trpc.settings.updateBulk.mutationOptions());
	const versionCheck = useQuery(trpc.version.checkUpdate.queryOptions());
	const exportData = useQuery({
		...trpc.backup.export.queryOptions(),
		enabled: false,
	});
	const importData = useMutation(trpc.backup.import.mutationOptions());

	const settings = settingsQuery.data ?? {};
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [activeSection, setActiveSection] = useState("profile");

	// Profile
	const [profileName, setProfileName] = useState("");
	const [profileBio, setProfileBio] = useState("");
	const [profileAvatar, setProfileAvatar] = useState("");

	// SEO
	const [seoTitle, setSeoTitle] = useState("");
	const [seoDescription, setSeoDescription] = useState("");
	const [seoOgImage, setSeoOgImage] = useState("");

	// Blocks — Contact Form
	const [contactEnabled, setContactEnabled] = useState(false);
	const [contactDelivery, setContactDelivery] = useState("database");

	// CAPTCHA
	const [captchaProvider, setCaptchaProvider] = useState("none");
	const [captchaSiteKey, setCaptchaSiteKey] = useState("");
	const [captchaSecretKey, setCaptchaSecretKey] = useState("");

	// Email
	const [emailProvider, setEmailProvider] = useState("resend");
	const [emailApiKey, setEmailApiKey] = useState("");
	const [emailFrom, setEmailFrom] = useState("");

	// Load settings
	useEffect(() => {
		if (settingsQuery.data) {
			const s = settingsQuery.data;
			setProfileName(s.profile_name ?? "");
			setProfileBio(s.bio ?? "");
			setProfileAvatar(s.avatar_url ?? "");
			setSeoTitle(s.seo_title ?? "");
			setSeoDescription(s.seo_description ?? "");
			setSeoOgImage(s.seo_og_image ?? "");
			setContactEnabled(s.contact_form_enabled === "true");
			setContactDelivery(s.contact_delivery ?? "database");
			setCaptchaProvider(s.captcha_provider ?? "none");
			setCaptchaSiteKey(s.captcha_site_key ?? "");
			setCaptchaSecretKey(s.captcha_secret_key ?? "");
			setEmailProvider(s.email_provider ?? "resend");
			setEmailApiKey(s.email_api_key ?? "");
			setEmailFrom(s.email_from ?? "");
		}
	}, [settingsQuery.data]);

	// IntersectionObserver for active section
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveSection(entry.target.id);
					}
				}
			},
			{ rootMargin: "-20% 0px -70% 0px", threshold: 0 },
		);

		for (const item of NAV_ITEMS) {
			const el = document.getElementById(item.id);
			if (el) observer.observe(el);
		}

		return () => observer.disconnect();
	}, [settingsQuery.isLoading]);

	const invalidate = useCallback(() => {
		qc.invalidateQueries({
			queryKey: trpc.settings.getAll.queryOptions().queryKey,
		});
	}, [qc]);

	const saveSection = async (pairs: { key: string; value: string }[]) => {
		try {
			await updateSettings.mutateAsync(pairs);
			invalidate();
			toast.success("Settings saved");
		} catch {
			toast.error("Failed to save settings");
		}
	};

	const handleExport = async () => {
		try {
			const result = await exportData.refetch();
			if (result.data) {
				const blob = new Blob([JSON.stringify(result.data, null, 2)], {
					type: "application/json",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `linkden-backup-${new Date().toISOString().slice(0, 10)}.json`;
				a.click();
				URL.revokeObjectURL(url);
				toast.success("Export downloaded");
			}
		} catch {
			toast.error("Failed to export");
		}
	};

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			await importData.mutateAsync({
				mode: "merge",
				data: parsed.data ?? parsed,
			});
			invalidate();
			toast.success("Import successful");
		} catch {
			toast.error("Failed to import. Make sure the file is valid JSON.");
		}
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const hasAnyChanges = useMemo(() => {
		if (!settingsQuery.data) return false;
		const s = settingsQuery.data;
		return (
			profileName !== (s.profile_name ?? "") ||
			profileBio !== (s.bio ?? "") ||
			profileAvatar !== (s.avatar_url ?? "") ||
			seoTitle !== (s.seo_title ?? "") ||
			seoDescription !== (s.seo_description ?? "") ||
			seoOgImage !== (s.seo_og_image ?? "") ||
			contactEnabled !== (s.contact_form_enabled === "true") ||
			contactDelivery !== (s.contact_delivery ?? "database") ||
			captchaProvider !== (s.captcha_provider ?? "none") ||
			captchaSiteKey !== (s.captcha_site_key ?? "") ||
			captchaSecretKey !== (s.captcha_secret_key ?? "") ||
			emailProvider !== (s.email_provider ?? "resend") ||
			emailApiKey !== (s.email_api_key ?? "") ||
			emailFrom !== (s.email_from ?? "")
		);
	}, [settingsQuery.data, profileName, profileBio, profileAvatar, seoTitle, seoDescription, seoOgImage, contactEnabled, contactDelivery, captchaProvider, captchaSiteKey, captchaSecretKey, emailProvider, emailApiKey, emailFrom]);

	const handleSaveAll = async () => {
		await saveSection([
			{ key: "profile_name", value: profileName },
			{ key: "bio", value: profileBio },
			{ key: "avatar_url", value: profileAvatar },
			{ key: "seo_title", value: seoTitle },
			{ key: "seo_description", value: seoDescription },
			{ key: "seo_og_image", value: seoOgImage },
			{ key: "contact_form_enabled", value: String(contactEnabled) },
			{ key: "contact_delivery", value: contactDelivery },
			{ key: "captcha_provider", value: captchaProvider },
			{ key: "captcha_site_key", value: captchaSiteKey },
			{ key: "captcha_secret_key", value: captchaSecretKey },
			{ key: "email_provider", value: emailProvider },
			{ key: "email_api_key", value: emailApiKey },
			{ key: "email_from", value: emailFrom },
		]);
	};

	if (settingsQuery.isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={`sk-${i}`} className="h-40" />
				))}
			</div>
		);
	}

	return (
		<div className="flex gap-8">
			{/* Sticky Side Nav (hidden on mobile) */}
			<nav className="hidden w-40 shrink-0 lg:block">
				<div className="sticky top-6 space-y-0.5">
					<p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
						Settings
					</p>
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive = activeSection === item.id;
						return (
							<a
								key={item.id}
								href={`#${item.id}`}
								onClick={(e) => {
									e.preventDefault();
									document
										.getElementById(item.id)
										?.scrollIntoView({ behavior: "smooth" });
								}}
								className={cn(
									"flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all",
									isActive
										? "bg-primary/10 text-primary font-medium"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
								)}
							>
								<Icon className="h-3.5 w-3.5" />
								{item.label}
							</a>
						);
					})}
				</div>
			</nav>

			{/* Content */}
			<div className="min-w-0 flex-1 space-y-8">
				<div>
					<h1 className="text-lg font-semibold">Settings</h1>
					<p className="text-xs text-muted-foreground">
						Configure your LinkDen instance
					</p>
				</div>

				{/* Profile */}
				<Section
					id="profile"
					icon={User}
					title="Profile"
					description="Your public-facing identity and display preferences"
				>
					<div className="flex flex-col gap-6 sm:flex-row sm:items-start">
						<ImageUploadField
							label="Avatar"
							value={profileAvatar}
							purpose="avatar"
							aspectRatio="square"
							onUploadComplete={(url) => setProfileAvatar(url)}
						/>
						<div className="flex-1 space-y-4">
							<FieldGroup columns={1}>
								<div className="space-y-1.5">
									<Label htmlFor="s-name">Display Name</Label>
									<Input
										id="s-name"
										value={profileName}
										onChange={(e) =>
											setProfileName(e.target.value)
										}
										placeholder="Your display name"
									/>
								</div>
							</FieldGroup>
							<div className="space-y-1.5">
								<Label htmlFor="s-bio">Bio</Label>
								<textarea
									id="s-bio"
									value={profileBio}
									onChange={(e) =>
										setProfileBio(e.target.value)
									}
									rows={2}
									placeholder="A short bio about you"
									className="dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
								/>
							</div>
						</div>
					</div>

					<Button
						size="sm"
						onClick={() =>
							saveSection([
								{ key: "profile_name", value: profileName },
								{ key: "bio", value: profileBio },
								{ key: "avatar_url", value: profileAvatar },
							])
						}
						disabled={updateSettings.isPending}
					>
						<Save className="mr-1.5 h-3 w-3" />
						Save Profile
					</Button>
				</Section>

				{/* SEO */}
				<Section
					id="seo"
					icon={SearchIcon}
					title="SEO"
					description="Search engine optimization and social sharing previews"
				>
					<FieldGroup>
						<div className="space-y-1.5">
							<Label htmlFor="s-seo-title">Page Title</Label>
							<Input
								id="s-seo-title"
								value={seoTitle}
								onChange={(e) => setSeoTitle(e.target.value)}
								placeholder="My Links"
							/>
						</div>
					</FieldGroup>
					<div className="space-y-1.5">
						<Label htmlFor="s-seo-desc">Description</Label>
						<textarea
							id="s-seo-desc"
							value={seoDescription}
							onChange={(e) =>
								setSeoDescription(e.target.value)
							}
							rows={2}
							placeholder="Check out all my links"
							className="dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="s-seo-og">OG Image URL</Label>
						<Input
							id="s-seo-og"
							value={seoOgImage}
							onChange={(e) => setSeoOgImage(e.target.value)}
							placeholder="https://..."
						/>
						<p className="text-[11px] text-muted-foreground">
							Preview image shown when your page is shared on social media
						</p>
					</div>
					<Button
						size="sm"
						onClick={() =>
							saveSection([
								{ key: "seo_title", value: seoTitle },
								{ key: "seo_description", value: seoDescription },
								{ key: "seo_og_image", value: seoOgImage },
							])
						}
						disabled={updateSettings.isPending}
					>
						<Save className="mr-1.5 h-3 w-3" />
						Save SEO
					</Button>
				</Section>

				{/* Blocks */}
				<Section
					id="blocks"
					icon={Blocks}
					title="Blocks"
					description="Configure block-level features for your page"
				>
					<div className="space-y-4">
						<div className="rounded-lg border p-4">
							<div className="flex items-center gap-2 mb-3">
								<MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
								<span className="text-xs font-medium">Contact Form</span>
							</div>
							<ToggleField
								id="s-contact-enabled"
								label="Enable contact form block"
								description="Allows visitors to send you messages directly from your page"
								checked={contactEnabled}
								onChange={setContactEnabled}
							/>
							{contactEnabled && (
								<div className="mt-3 ml-12 space-y-1.5">
									<Label htmlFor="s-contact-delivery">Delivery mode</Label>
									<select
										id="s-contact-delivery"
										value={contactDelivery}
										onChange={(e) =>
											setContactDelivery(e.target.value)
										}
										className="dark:bg-input/30 border-input h-8 w-full rounded-md border bg-transparent px-2.5 text-xs outline-none"
									>
										<option value="database">Database only</option>
										<option value="email">Email notification</option>
										<option value="both">Database + Email</option>
									</select>
								</div>
							)}
						</div>
					</div>
					<Button
						size="sm"
						onClick={() =>
							saveSection([
								{
									key: "contact_form_enabled",
									value: String(contactEnabled),
								},
								{ key: "contact_delivery", value: contactDelivery },
							])
						}
						disabled={updateSettings.isPending}
					>
						<Save className="mr-1.5 h-3 w-3" />
						Save Blocks
					</Button>
				</Section>

				{/* CAPTCHA */}
				<Section
					id="captcha"
					icon={Shield}
					title="CAPTCHA"
					description="Protect your contact form from spam"
				>
					<div className="space-y-1.5">
						<Label htmlFor="s-captcha-provider">Provider</Label>
						<select
							id="s-captcha-provider"
							value={captchaProvider}
							onChange={(e) => setCaptchaProvider(e.target.value)}
							className="dark:bg-input/30 border-input h-8 w-full rounded-md border bg-transparent px-2.5 text-xs outline-none"
						>
							<option value="none">None</option>
							<option value="turnstile">Cloudflare Turnstile</option>
							<option value="recaptcha">Google reCAPTCHA</option>
						</select>
					</div>
					{captchaProvider !== "none" && (
						<FieldGroup columns={2}>
							<div className="space-y-1.5">
								<Label htmlFor="s-captcha-site">Site Key</Label>
								<Input
									id="s-captcha-site"
									value={captchaSiteKey}
									onChange={(e) =>
										setCaptchaSiteKey(e.target.value)
									}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-captcha-secret">Secret Key</Label>
								<Input
									id="s-captcha-secret"
									type="password"
									value={captchaSecretKey}
									onChange={(e) =>
										setCaptchaSecretKey(e.target.value)
									}
								/>
							</div>
						</FieldGroup>
					)}
					<Button
						size="sm"
						onClick={() =>
							saveSection([
								{ key: "captcha_provider", value: captchaProvider },
								{ key: "captcha_site_key", value: captchaSiteKey },
								{
									key: "captcha_secret_key",
									value: captchaSecretKey,
								},
							])
						}
						disabled={updateSettings.isPending}
					>
						<Save className="mr-1.5 h-3 w-3" />
						Save
					</Button>
				</Section>

				{/* Email */}
				<Section
					id="email"
					icon={Mail}
					title="Email"
					description="Configure email delivery for notifications"
				>
					<div className="space-y-1.5">
						<Label htmlFor="s-email-provider">Provider</Label>
						<select
							id="s-email-provider"
							value={emailProvider}
							onChange={(e) => setEmailProvider(e.target.value)}
							className="dark:bg-input/30 border-input h-8 w-full rounded-md border bg-transparent px-2.5 text-xs outline-none"
						>
							<option value="resend">Resend</option>
							<option value="cloudflare">
								Cloudflare Email Workers
							</option>
						</select>
					</div>
					<FieldGroup columns={2}>
						<div className="space-y-1.5">
							<Label htmlFor="s-email-key">API Key</Label>
							<Input
								id="s-email-key"
								type="password"
								value={emailApiKey}
								onChange={(e) => setEmailApiKey(e.target.value)}
								placeholder="re_..."
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="s-email-from">From Address</Label>
							<Input
								id="s-email-from"
								value={emailFrom}
								onChange={(e) => setEmailFrom(e.target.value)}
								placeholder="noreply@yourdomain.com"
							/>
						</div>
					</FieldGroup>
					<Button
						size="sm"
						onClick={() =>
							saveSection([
								{ key: "email_provider", value: emailProvider },
								{ key: "email_api_key", value: emailApiKey },
								{ key: "email_from", value: emailFrom },
							])
						}
						disabled={updateSettings.isPending}
					>
						<Save className="mr-1.5 h-3 w-3" />
						Save
					</Button>
				</Section>

					{/* Export / Import */}
				<Section
					id="export"
					icon={Download}
					title="Export / Import"
					description="Backup and restore your LinkDen data"
				>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							disabled={exportData.isFetching}
						>
							<Download className="mr-1.5 h-3 w-3" />
							{exportData.isFetching ? "Exporting..." : "Export"}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
							disabled={importData.isPending}
						>
							<Upload className="mr-1.5 h-3 w-3" />
							{importData.isPending ? "Importing..." : "Import"}
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept=".json"
							onChange={handleImport}
							className="hidden"
						/>
					</div>
				</Section>

				{/* About */}
				<Section
					id="about"
					icon={Info}
					title="About"
					description="Version information and project links"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-[11px] text-muted-foreground">
								Current Version
							</p>
							<p className="text-sm font-semibold tabular-nums">
								{versionCheck.data?.current ?? "0.1.0"}
							</p>
						</div>
						{versionCheck.data?.hasUpdate ? (
							<a
								href={versionCheck.data.releaseUrl ?? "#"}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Button size="sm" variant="outline">
									Update to {versionCheck.data.latest}
									<ExternalLink className="ml-1.5 h-3 w-3" />
								</Button>
							</a>
						) : (
							<Button
								size="sm"
								variant="outline"
								onClick={() =>
									qc.invalidateQueries({
										queryKey:
											trpc.version.checkUpdate.queryOptions()
												.queryKey,
									})
								}
							>
								Check for updates
							</Button>
						)}
					</div>
					<a
						href="https://github.com/mrdemonwolf/LinkDen"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
					>
						GitHub Repository
						<ExternalLink className="h-3 w-3" />
					</a>
				</Section>

				{/* Save All sticky bar */}
				{hasAnyChanges && (
					<div className="sticky bottom-4 flex justify-end">
						<Button onClick={handleSaveAll} disabled={updateSettings.isPending} className="shadow-lg">
							<Save className="mr-1.5 h-4 w-4" />
							{updateSettings.isPending ? "Saving..." : "Save All Changes"}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
