"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Search as SearchIcon,
	Shield,
	Mail,
	Download,
	Upload,
	Info,
	ExternalLink,
	Save,
	Plug,
	Database,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

	const fileInputRef = useRef<HTMLInputElement>(null);

	// SEO
	const [seoTitle, setSeoTitle] = useState("");
	const [seoDescription, setSeoDescription] = useState("");
	const [seoOgImage, setSeoOgImage] = useState("");

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
			setSeoTitle(s.seo_title ?? "");
			setSeoDescription(s.seo_description ?? "");
			setSeoOgImage(s.seo_og_image ?? "");
			setCaptchaProvider(s.captcha_provider ?? "none");
			setCaptchaSiteKey(s.captcha_site_key ?? "");
			setCaptchaSecretKey(s.captcha_secret_key ?? "");
			setEmailProvider(s.email_provider ?? "resend");
			setEmailApiKey(s.email_api_key ?? "");
			setEmailFrom(s.email_from ?? "");
		}
	}, [settingsQuery.data]);

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

	if (settingsQuery.isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={`sk-${i}`} className="h-40" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-lg font-semibold">Settings</h1>
				<p className="text-xs text-muted-foreground">
					Configure your LinkDen instance
				</p>
			</div>

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

			{/* Integrations (CAPTCHA + Email) */}
			<Section
				id="integrations"
				icon={Plug}
				title="Integrations"
				description="Configure external service providers"
			>
				{/* CAPTCHA */}
				<div className="flex items-center gap-2 mb-1">
					<Shield className="h-3.5 w-3.5 text-muted-foreground" />
					<span className="text-xs font-medium">CAPTCHA</span>
				</div>
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

				<div className="border-t my-2" />

				{/* Email */}
				<div className="flex items-center gap-2 mb-1">
					<Mail className="h-3.5 w-3.5 text-muted-foreground" />
					<span className="text-xs font-medium">Email</span>
				</div>
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
							{ key: "captcha_provider", value: captchaProvider },
							{ key: "captcha_site_key", value: captchaSiteKey },
							{ key: "captcha_secret_key", value: captchaSecretKey },
							{ key: "email_provider", value: emailProvider },
							{ key: "email_api_key", value: emailApiKey },
							{ key: "email_from", value: emailFrom },
						])
					}
					disabled={updateSettings.isPending}
				>
					<Save className="mr-1.5 h-3 w-3" />
					Save Integrations
				</Button>
			</Section>

			{/* Data & Info (Export/Import + About) */}
			<Section
				id="data"
				icon={Database}
				title="Data & Info"
				description="Backup, restore, and version information"
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

				<div className="border-t my-2" />

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
		</div>
	);
}
