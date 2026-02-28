"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "./field-group";

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

export function VCardSection() {
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
				urls: raw.urls ?? [],
			};
			setEnabled(e);
			setData(d);
			setSavedEnabled(e);
			setSavedData(d);
		}
	}, [configQuery.data]);

	const isDirty =
		enabled !== savedEnabled ||
		JSON.stringify(data) !== JSON.stringify(savedData);

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
			urls: prev.urls.map((u, i) =>
				i === index ? { ...u, [field]: value } : u,
			),
		}));
	};

	const handleSave = async () => {
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
			toast.success("vCard settings saved");
		} catch {
			toast.error("Failed to save vCard settings");
		}
	};

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
					<p className="text-[11px] text-muted-foreground">
						Allow visitors to download your contact information as a vCard
					</p>
				</div>
				<Switch
					checked={enabled}
					onCheckedChange={setEnabled}
					aria-label="Enable vCard"
				/>
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
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-nick">Nickname</Label>
								<Input
									id="s-vc-nick"
									value={data.nickname}
									onChange={(e) => updateField("nickname", e.target.value)}
								/>
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
								/>
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
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-title">Job Title</Label>
								<Input
									id="s-vc-title"
									value={data.title}
									onChange={(e) => updateField("title", e.target.value)}
								/>
							</div>
						</FieldGroup>
						<div className="space-y-1.5">
							<Label htmlFor="s-vc-dept">Department</Label>
							<Input
								id="s-vc-dept"
								value={data.department}
								onChange={(e) => updateField("department", e.target.value)}
							/>
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
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="s-vc-wemail">Work Email</Label>
								<Input
									id="s-vc-wemail"
									type="email"
									value={data.workEmail}
									onChange={(e) => updateField("workEmail", e.target.value)}
								/>
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
							/>
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
									/>
								</div>
								<div className="flex-[2] space-y-1.5">
									<Label htmlFor={`s-vc-url-val-${i}`}>URL</Label>
									<Input
										id={`s-vc-url-val-${i}`}
										value={entry.url}
										onChange={(e) => updateUrl(i, "url", e.target.value)}
										placeholder="https://..."
									/>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeUrl(i)}
									className="text-destructive shrink-0"
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
					onClick={handleSave}
					disabled={updateConfig.isPending}
				>
					<Save className="mr-1.5 h-3.5 w-3.5" />
					{updateConfig.isPending ? "Saving..." : "Save vCard Settings"}
				</Button>
			)}
		</div>
	);
}
