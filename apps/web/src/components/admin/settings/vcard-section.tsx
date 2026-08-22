"use client";

import { vcardDataSchema } from "@linkden/validators/vcard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/admin/field-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { friendlyMessage } from "@/lib/validate";
import { trpc } from "@/utils/trpc";
import { FieldGroup } from "./field-group";

/**
 * Same schema the vcard router validates against, so an inline error here is
 * exactly what the server would reject. Keyed by dotted path (`urls.2.url`).
 */
function vcardErrors(data: VCardData): Record<string, string> {
	const result = vcardDataSchema.safeParse(data);
	if (result.success) return {};
	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const key = issue.path.map(String).join(".");
		if (!(key in errors)) errors[key] = friendlyMessage(issue.message);
	}
	return errors;
}

interface UrlEntry {
	label: string;
	url: string;
}

interface VCardData {
	fullName: string;
	nickname: string;
	birthday: string;
	photo: string;
	org: string;
	title: string;
	department: string;
	workEmail: string;
	workPhone: string;
	email: string;
	phone: string;
	address: string;
	urls: UrlEntry[];
}

const emptyData: VCardData = {
	fullName: "",
	nickname: "",
	birthday: "",
	photo: "",
	org: "",
	title: "",
	department: "",
	workEmail: "",
	workPhone: "",
	email: "",
	phone: "",
	address: "",
	urls: [],
};

export interface VCardSectionHandle {
	/** Saves if dirty; the promise resolves after persistence (or rejects on failure) so the parent's global save can await it. */
	saveIfDirty: () => Promise<void>;
}

interface VCardSectionProps {
	/** Notifies the parent whenever this section's dirty state changes. */
	onDirtyChange?: (dirty: boolean) => void;
	/** Notifies the parent whenever this section gains or clears validation errors, so its global Save can disable. */
	onErrorsChange?: (hasErrors: boolean) => void;
}

export const VCardSection = forwardRef<VCardSectionHandle, VCardSectionProps>(function VCardSection(
	{ onDirtyChange, onErrorsChange },
	ref,
) {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.vcard.getConfig.queryOptions());
	const updateConfig = useMutation(trpc.vcard.updateConfig.mutationOptions());

	const [enabled, setEnabled] = useState(false);
	const [data, setData] = useState<VCardData>(emptyData);
	const [savedEnabled, setSavedEnabled] = useState(false);
	const [savedData, setSavedData] = useState<VCardData>(emptyData);

	useEffect(() => {
		if (configQuery.data) {
			const e = configQuery.data.enabled;
			const raw = configQuery.data.data ?? {};
			const d: VCardData = {
				fullName: raw.fullName ?? "",
				nickname: raw.nickname ?? "",
				birthday: raw.birthday ?? "",
				photo: raw.photo ?? "",
				org: raw.org ?? "",
				title: raw.title ?? "",
				department: raw.department ?? "",
				workEmail: raw.workEmail ?? "",
				workPhone: raw.workPhone ?? "",
				email: raw.email ?? "",
				phone: raw.phone ?? "",
				address: raw.address ?? "",
				urls: (raw.urls ?? []).map((u) => ({ label: u.label ?? "", url: u.url ?? "" })),
			};
			setEnabled(e);
			setData(d);
			setSavedEnabled(e);
			setSavedData(d);
		}
	}, [configQuery.data]);

	const isDirty = enabled !== savedEnabled || JSON.stringify(data) !== JSON.stringify(savedData);
	const errors = enabled ? vcardErrors(data) : {};
	const hasErrors = Object.keys(errors).length > 0;

	// Report dirty state to the parent so the global unsaved-changes bar covers vCard edits.
	// The cleanup clears the flag on unmount (tab switch discards local edits with the component).
	useEffect(() => {
		onDirtyChange?.(isDirty);
		return () => onDirtyChange?.(false);
	}, [isDirty, onDirtyChange]);
	useEffect(() => {
		onErrorsChange?.(hasErrors);
		return () => onErrorsChange?.(false);
	}, [hasErrors, onErrorsChange]);

	const updateField = (field: keyof Omit<VCardData, "urls">, value: string) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const addUrl = () => {
		setData((prev) => ({
			...prev,
			urls: [...prev.urls, { label: "", url: "" }],
		}));
	};

	const removeUrl = (index: number) => {
		setData((prev) => ({
			...prev,
			urls: prev.urls.filter((_, i) => i !== index),
		}));
	};

	const updateUrl = (index: number, field: "label" | "url", value: string) => {
		setData((prev) => ({
			...prev,
			urls: prev.urls.map((u, i) => (i === index ? { ...u, [field]: value } : u)),
		}));
	};

	const handleSave = async (opts?: { silent?: boolean }) => {
		if (hasErrors) {
			if (!opts?.silent) toast.error("Fix the highlighted vCard fields first");
			throw new Error("vCard has invalid fields");
		}
		try {
			await updateConfig.mutateAsync({
				enabled,
				data: {
					fullName: data.fullName || undefined,
					nickname: data.nickname || undefined,
					birthday: data.birthday || undefined,
					photo: data.photo || undefined,
					org: data.org || undefined,
					title: data.title || undefined,
					department: data.department || undefined,
					workEmail: data.workEmail || undefined,
					workPhone: data.workPhone || undefined,
					email: data.email || undefined,
					phone: data.phone || undefined,
					address: data.address || undefined,
					urls: data.urls.length > 0 ? data.urls : undefined,
				},
			});
			setSavedEnabled(enabled);
			setSavedData(data);
			qc.invalidateQueries({
				queryKey: trpc.vcard.getConfig.queryOptions().queryKey,
			});
			if (!opts?.silent) toast.success("vCard settings saved");
		} catch (err) {
			if (!opts?.silent) toast.error("Failed to save vCard settings");
			throw err;
		}
	};

	// Exposes an awaitable save to the parent so its global save can wait for
	// this section to actually persist before reporting success (silent: the
	// parent shows its own combined success/error toast).
	const handleSaveRef = useRef(handleSave);
	handleSaveRef.current = handleSave;
	const isDirtyRef = useRef(isDirty);
	isDirtyRef.current = isDirty;
	useImperativeHandle(
		ref,
		() => ({
			saveIfDirty: async () => {
				if (isDirtyRef.current) {
					await handleSaveRef.current({ silent: true });
				}
			},
		}),
		[],
	);

	if (configQuery.isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-8 w-full" />
				<Skeleton className="h-8 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Enable vCard</Label>
					<p className="text-micro text-muted-foreground">
						Allow visitors to download your contact information as a vCard
					</p>
				</div>
				<Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable vCard" />
			</div>

			{enabled && (
				<>
					{/* Personal */}
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Personal
						</p>
						<FieldGroup columns={2}>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-name">Full Name</Label>
								<Input
									id="s-vc-name"
									value={data.fullName}
									onChange={(e) => updateField("fullName", e.target.value)}
									aria-invalid={!!errors.fullName}
									aria-describedby={errors.fullName ? "s-vc-name-error" : undefined}
								/>
								<FieldError id="s-vc-name-error" error={errors.fullName} />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-nick">Nickname</Label>
								<Input
									id="s-vc-nick"
									value={data.nickname}
									onChange={(e) => updateField("nickname", e.target.value)}
									aria-invalid={!!errors.nickname}
									aria-describedby={errors.nickname ? "s-vc-nick-error" : undefined}
								/>
								<FieldError id="s-vc-nick-error" error={errors.nickname} />
							</div>
						</FieldGroup>
						<FieldGroup columns={2}>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-bday">Birthday</Label>
								<Input
									id="s-vc-bday"
									type="date"
									value={data.birthday}
									onChange={(e) => updateField("birthday", e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-photo">Photo URL</Label>
								<Input
									id="s-vc-photo"
									value={data.photo}
									onChange={(e) => updateField("photo", e.target.value)}
									placeholder="https://..."
									aria-invalid={!!errors.photo}
									aria-describedby={errors.photo ? "s-vc-photo-error" : undefined}
								/>
								<FieldError id="s-vc-photo-error" error={errors.photo} />
							</div>
						</FieldGroup>
					</div>

					{/* Organization */}
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Organization
						</p>
						<FieldGroup columns={2}>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-org">Organization</Label>
								<Input
									id="s-vc-org"
									value={data.org}
									onChange={(e) => updateField("org", e.target.value)}
									aria-invalid={!!errors.org}
									aria-describedby={errors.org ? "s-vc-org-error" : undefined}
								/>
								<FieldError id="s-vc-org-error" error={errors.org} />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-title">Job Title</Label>
								<Input
									id="s-vc-title"
									value={data.title}
									onChange={(e) => updateField("title", e.target.value)}
									aria-invalid={!!errors.title}
									aria-describedby={errors.title ? "s-vc-title-error" : undefined}
								/>
								<FieldError id="s-vc-title-error" error={errors.title} />
							</div>
						</FieldGroup>
						<div className="space-y-1.5">
							<Label htmlFor="s-vc-dept">Department</Label>
							<Input
								id="s-vc-dept"
								value={data.department}
								onChange={(e) => updateField("department", e.target.value)}
								aria-invalid={!!errors.department}
								aria-describedby={errors.department ? "s-vc-dept-error" : undefined}
							/>
							<FieldError id="s-vc-dept-error" error={errors.department} />
						</div>
					</div>

					{/* Contact */}
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Contact
						</p>
						<FieldGroup columns={2}>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-email">Personal Email</Label>
								<Input
									id="s-vc-email"
									type="email"
									value={data.email}
									onChange={(e) => updateField("email", e.target.value)}
									aria-invalid={!!errors.email}
									aria-describedby={errors.email ? "s-vc-email-error" : undefined}
								/>
								<FieldError id="s-vc-email-error" error={errors.email} />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-wemail">Work Email</Label>
								<Input
									id="s-vc-wemail"
									type="email"
									value={data.workEmail}
									onChange={(e) => updateField("workEmail", e.target.value)}
									aria-invalid={!!errors.workEmail}
									aria-describedby={errors.workEmail ? "s-vc-wemail-error" : undefined}
								/>
								<FieldError id="s-vc-wemail-error" error={errors.workEmail} />
							</div>
						</FieldGroup>
						<FieldGroup columns={2}>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-phone">Personal Phone</Label>
								<Input
									id="s-vc-phone"
									type="tel"
									value={data.phone}
									onChange={(e) => updateField("phone", e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-wphone">Work Phone</Label>
								<Input
									id="s-vc-wphone"
									type="tel"
									value={data.workPhone}
									onChange={(e) => updateField("workPhone", e.target.value)}
								/>
							</div>
						</FieldGroup>
						<div className="space-y-1.5">
							<Label htmlFor="s-vc-addr">Address</Label>
							<Input
								id="s-vc-addr"
								value={data.address}
								onChange={(e) => updateField("address", e.target.value)}
								placeholder="123 Main St, City, Country"
								aria-invalid={!!errors.address}
								aria-describedby={errors.address ? "s-vc-addr-error" : undefined}
							/>
							<FieldError id="s-vc-addr-error" error={errors.address} />
						</div>
					</div>

					{/* URLs */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								URLs
							</p>
							<Button variant="outline" size="xs" onClick={addUrl}>
								<Plus className="mr-1 h-3 w-3" />
								Add URL
							</Button>
						</div>
						{data.urls.map((entry, i) => (
							<div key={`url-${i}`} className="flex items-end gap-2">
								<div className="flex-1 space-y-1.5">
									<Label htmlFor={`s-vc-url-label-${i}`}>Label</Label>
									<Input
										id={`s-vc-url-label-${i}`}
										value={entry.label}
										onChange={(e) => updateUrl(i, "label", e.target.value)}
										placeholder="Website"
										maxLength={40}
									/>
								</div>
								<div className="flex-[2] space-y-1.5">
									<Label htmlFor={`s-vc-url-val-${i}`}>URL</Label>
									<Input
										id={`s-vc-url-val-${i}`}
										value={entry.url}
										onChange={(e) => updateUrl(i, "url", e.target.value)}
										placeholder="https://..."
										inputMode="url"
										aria-invalid={!!errors[`urls.${i}.url`]}
										aria-describedby={
											errors[`urls.${i}.url`] ? `s-vc-url-val-${i}-error` : undefined
										}
									/>
									<FieldError id={`s-vc-url-val-${i}-error`} error={errors[`urls.${i}.url`]} />
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeUrl(i)}
									className="text-destructive shrink-0"
									aria-label="Remove URL"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						))}
					</div>
				</>
			)}

			{isDirty && (
				<Button
					size="sm"
					onClick={() => handleSave().catch(() => {})}
					disabled={updateConfig.isPending || hasErrors}
				>
					<Save className="mr-1.5 h-3.5 w-3.5" />
					{updateConfig.isPending ? "Saving..." : "Save vCard Settings"}
				</Button>
			)}
		</div>
	);
});
