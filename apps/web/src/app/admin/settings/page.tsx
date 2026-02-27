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
	ExternalLink,
	Save,
	Database,
	Undo2,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

// ---- Saved State ----
interface SavedState {
	seoTitle: string;
	seoDescription: string;
	seoOgImage: string;
	captchaProvider: string;
	captchaSiteKey: string;
	captchaSecretKey: string;
	emailProvider: string;
	emailApiKey: string;
	emailFrom: string;
}

function buildSavedState(s: Record<string, string>): SavedState {
	return {
		seoTitle: s.seo_title ?? "",
		seoDescription: s.seo_description ?? "",
		seoOgImage: s.seo_og_image ?? "",
		captchaProvider: s.captcha_provider ?? "none",
		captchaSiteKey: s.captcha_site_key ?? "",
		captchaSecretKey: s.captcha_secret_key ?? "",
		emailProvider: s.email_provider ?? "resend",
		emailApiKey: s.email_api_key ?? "",
		emailFrom: s.email_from ?? "",
	};
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

const selectClassName =
	"dark:bg-input/30 border-input h-8 w-full rounded-md border bg-transparent px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring";

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

	// Saved state for dirty tracking
	const [savedState, setSavedState] = useState<SavedState>({
		seoTitle: "",
		seoDescription: "",
		seoOgImage: "",
		captchaProvider: "none",
		captchaSiteKey: "",
		captchaSecretKey: "",
		emailProvider: "resend",
		emailApiKey: "",
		emailFrom: "",
	});

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
			const s = buildSavedState(settingsQuery.data);
			setSavedState(s);
			setSeoTitle(s.seoTitle);
			setSeoDescription(s.seoDescription);
			setSeoOgImage(s.seoOgImage);
			setCaptchaProvider(s.captchaProvider);
			setCaptchaSiteKey(s.captchaSiteKey);
			setCaptchaSecretKey(s.captchaSecretKey);
			setEmailProvider(s.emailProvider);
			setEmailApiKey(s.emailApiKey);
			setEmailFrom(s.emailFrom);
		}
	}, [settingsQuery.data]);

	const isDirty =
		seoTitle !== savedState.seoTitle ||
		seoDescription !== savedState.seoDescription ||
		seoOgImage !== savedState.seoOgImage ||
		captchaProvider !== savedState.captchaProvider ||
		captchaSiteKey !== savedState.captchaSiteKey ||
		captchaSecretKey !== savedState.captchaSecretKey ||
		emailProvider !== savedState.emailProvider ||
		emailApiKey !== savedState.emailApiKey ||
		emailFrom !== savedState.emailFrom;

	useUnsavedChanges(isDirty);

	const invalidate = useCallback(() => {
		qc.invalidateQueries({
			queryKey: trpc.settings.getAll.queryOptions().queryKey,
		});
	}, [qc]);

	const handleDiscard = () => {
		setSeoTitle(savedState.seoTitle);
		setSeoDescription(savedState.seoDescription);
		setSeoOgImage(savedState.seoOgImage);
		setCaptchaProvider(savedState.captchaProvider);
		setCaptchaSiteKey(savedState.captchaSiteKey);
		setCaptchaSecretKey(savedState.captchaSecretKey);
		setEmailProvider(savedState.emailProvider);
		setEmailApiKey(savedState.emailApiKey);
		setEmailFrom(savedState.emailFrom);
	};

	const handleSave = async () => {
		try {
			await updateSettings.mutateAsync([
				{ key: "seo_title", value: seoTitle },
				{ key: "seo_description", value: seoDescription },
				{ key: "seo_og_image", value: seoOgImage },
				{ key: "captcha_provider", value: captchaProvider },
				{ key: "captcha_site_key", value: captchaSiteKey },
				{ key: "captcha_secret_key", value: captchaSecretKey },
				{ key: "email_provider", value: emailProvider },
				{ key: "email_api_key", value: emailApiKey },
				{ key: "email_from", value: emailFrom },
			]);
			setSavedState({
				seoTitle,
				seoDescription,
				seoOgImage,
				captchaProvider,
				captchaSiteKey,
				captchaSecretKey,
				emailProvider,
				emailApiKey,
				emailFrom,
			});
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
		<Tabs defaultValue="seo" className="space-y-4">
			<PageHeader
				title="Settings"
				description={isDirty ? "You have unsaved changes" : "Configure your LinkDen instance"}
				actions={
					<>
						{isDirty && (
							<Button variant="ghost" size="sm" onClick={handleDiscard}>
								<Undo2 className="mr-1.5 h-3.5 w-3.5" />
								Discard
							</Button>
						)}
						<Button
							size="sm"
							variant={isDirty ? "default" : "outline"}
							disabled={!isDirty || updateSettings.isPending}
							onClick={handleSave}
						>
							<Save className="mr-1.5 h-3.5 w-3.5" />
							{updateSettings.isPending ? "Saving..." : "Save"}
						</Button>
					</>
				}
			>
				<TabsList variant="pills">
					<TabsTrigger value="seo">
						<SearchIcon className="mr-1.5 h-3 w-3" /> SEO
					</TabsTrigger>
					<TabsTrigger value="captcha">
						<Shield className="mr-1.5 h-3 w-3" /> CAPTCHA
					</TabsTrigger>
					<TabsTrigger value="email">
						<Mail className="mr-1.5 h-3 w-3" /> Email
					</TabsTrigger>
					<TabsTrigger value="data">
						<Database className="mr-1.5 h-3 w-3" /> Data & Info
					</TabsTrigger>
				</TabsList>
			</PageHeader>

			{/* SEO */}
			<TabsContent value="seo">
				<Card>
					<CardContent className="space-y-4 pt-2">
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
								onChange={(e) => setSeoDescription(e.target.value)}
								rows={2}
								placeholder="Check out all my links"
								className="dark:bg-input/30 border-input w-full rounded-md border bg-transparent backdrop-blur-sm px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
					</CardContent>
				</Card>
			</TabsContent>

			{/* CAPTCHA */}
			<TabsContent value="captcha">
				<Card>
					<CardContent className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label htmlFor="s-captcha-provider">Provider</Label>
							<select
								id="s-captcha-provider"
								value={captchaProvider}
								onChange={(e) => setCaptchaProvider(e.target.value)}
								className={selectClassName}
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
										onChange={(e) => setCaptchaSiteKey(e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="s-captcha-secret">Secret Key</Label>
									<Input
										id="s-captcha-secret"
										type="password"
										value={captchaSecretKey}
										onChange={(e) => setCaptchaSecretKey(e.target.value)}
									/>
								</div>
							</FieldGroup>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			{/* Email */}
			<TabsContent value="email">
				<Card>
					<CardContent className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label htmlFor="s-email-provider">Provider</Label>
							<select
								id="s-email-provider"
								value={emailProvider}
								onChange={(e) => setEmailProvider(e.target.value)}
								className={selectClassName}
							>
								<option value="resend">Resend</option>
								<option value="cloudflare">Cloudflare Email Workers</option>
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
					</CardContent>
				</Card>
			</TabsContent>

			{/* Data & Info */}
			<TabsContent value="data">
				<Card>
					<CardContent className="space-y-4 pt-2">
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
								aria-label="Import backup file"
							/>
						</div>

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
									<Button size="sm">
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
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	);
}
