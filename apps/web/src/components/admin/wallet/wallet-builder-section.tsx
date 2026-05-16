"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Image as ImageIcon, Type, Palette } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldGroup } from "@/components/admin/settings/field-group";
import {
	PASS_TEMPLATE_PRESETS,
	type PassField,
	type PassTemplatePreset,
} from "@linkden/validators/wallet";
import { TemplatePresetPicker } from "./template-preset-picker";
import { PassImageSlots } from "./pass-image-slots";
import { PassFieldEditor } from "./pass-field-editor";
import { ColorField } from "@/components/admin/color-field";
import type { PassZone } from "@/components/admin/wallet-pass-preview";

export interface WalletLiveState {
	templatePreset: PassTemplatePreset;
	organizationName: string;
	passDescription: string;
	backgroundColor: string;
	foregroundColor: string;
	labelColor: string;
	logoUrl: string;
	iconUrl: string;
	thumbnailUrl: string;
	stripUrl: string;
	headerFields: PassField[];
	primaryFields: PassField[];
	secondaryFields: PassField[];
	auxiliaryFields: PassField[];
	backFields: PassField[];
	showQrCode: boolean;
}

interface Props {
	onPreviewChange?: (state: WalletLiveState) => void;
	onZoneFocus?: (zone: PassZone | null) => void;
	onDirtyChange?: (dirty: boolean) => void;
	saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

const DEFAULTS = {
	templatePreset: "contact-card" as PassTemplatePreset,
	organizationName: "",
	passDescription: "",
	backgroundColor: "",
	foregroundColor: "",
	labelColor: "",
	logoUrl: "",
	iconUrl: "",
	thumbnailUrl: "",
	stripUrl: "",
	headerFields: [] as PassField[],
	primaryFields: [] as PassField[],
	secondaryFields: [] as PassField[],
	auxiliaryFields: [] as PassField[],
	backFields: [] as PassField[],
	showQrCode: true,
};

function safeParse<T>(raw: string | undefined, fallback: T): T {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function fieldsEqual(a: PassField[], b: PassField[]) {
	if (a.length !== b.length) return false;
	return a.every((f, i) => f.key === b[i].key && f.label === b[i].label && f.value === b[i].value);
}

export function WalletBuilderSection({
	onPreviewChange,
	onZoneFocus,
	onDirtyChange,
	saveRef,
}: Props) {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const updateConfig = useMutation(trpc.wallet.updateConfig.mutationOptions());
	const applyPreset = useMutation(trpc.wallet.applyPreset.mutationOptions());

	const [state, setState] = useState<WalletLiveState>(DEFAULTS);
	const [saved, setSaved] = useState<WalletLiveState>(DEFAULTS);

	useEffect(() => {
		if (!configQuery.data) return;
		const d = configQuery.data;
		const next: WalletLiveState = {
			templatePreset: (d.wallet_template_preset as PassTemplatePreset) ?? "contact-card",
			organizationName: d.wallet_organization_name ?? "",
			passDescription: d.wallet_pass_description ?? "",
			backgroundColor: d.wallet_background_color ?? "",
			foregroundColor: d.wallet_foreground_color ?? "",
			labelColor: d.wallet_label_color ?? "",
			logoUrl: d.wallet_logo_url ?? "",
			iconUrl: d.wallet_icon_url ?? "",
			thumbnailUrl: d.wallet_thumbnail_url ?? "",
			stripUrl: d.wallet_strip_url ?? "",
			headerFields: safeParse<PassField[]>(d.wallet_header_fields, []),
			primaryFields: safeParse<PassField[]>(d.wallet_primary_fields, []),
			secondaryFields: safeParse<PassField[]>(d.wallet_secondary_fields, []),
			auxiliaryFields: safeParse<PassField[]>(d.wallet_auxiliary_fields, []),
			backFields: safeParse<PassField[]>(d.wallet_back_fields, []),
			showQrCode: d.wallet_show_qr_code !== "false",
		};
		setState(next);
		setSaved(next);
	}, [configQuery.data]);

	const dirty = useMemo(() => {
		return (
			state.templatePreset !== saved.templatePreset ||
			state.organizationName !== saved.organizationName ||
			state.passDescription !== saved.passDescription ||
			state.backgroundColor !== saved.backgroundColor ||
			state.foregroundColor !== saved.foregroundColor ||
			state.labelColor !== saved.labelColor ||
			state.logoUrl !== saved.logoUrl ||
			state.iconUrl !== saved.iconUrl ||
			state.thumbnailUrl !== saved.thumbnailUrl ||
			state.stripUrl !== saved.stripUrl ||
			state.showQrCode !== saved.showQrCode ||
			!fieldsEqual(state.headerFields, saved.headerFields) ||
			!fieldsEqual(state.primaryFields, saved.primaryFields) ||
			!fieldsEqual(state.secondaryFields, saved.secondaryFields) ||
			!fieldsEqual(state.auxiliaryFields, saved.auxiliaryFields) ||
			!fieldsEqual(state.backFields, saved.backFields)
		);
	}, [state, saved]);

	useEffect(() => {
		onDirtyChange?.(dirty);
	}, [dirty, onDirtyChange]);

	useEffect(() => {
		onPreviewChange?.(state);
	}, [state, onPreviewChange]);

	const handleSave = useCallback(async () => {
		try {
			await updateConfig.mutateAsync({
				templatePreset: state.templatePreset,
				organizationName: state.organizationName,
				passDescription: state.passDescription,
				backgroundColor: state.backgroundColor || "",
				foregroundColor: state.foregroundColor || "",
				labelColor: state.labelColor || "",
				logoUrl: state.logoUrl || "",
				iconUrl: state.iconUrl || "",
				thumbnailUrl: state.thumbnailUrl || "",
				stripUrl: state.stripUrl || "",
				headerFields: state.headerFields,
				primaryFields: state.primaryFields,
				secondaryFields: state.secondaryFields,
				auxiliaryFields: state.auxiliaryFields,
				backFields: state.backFields,
				showQrCode: state.showQrCode,
			});
			setSaved(state);
			qc.invalidateQueries({ queryKey: trpc.wallet.getConfig.queryOptions().queryKey });
			qc.invalidateQueries({ queryKey: trpc.wallet.generatePreview.queryOptions().queryKey });
			toast.success("Wallet pass saved");
		} catch {
			toast.error("Failed to save wallet pass");
		}
	}, [state, updateConfig, qc]);

	useEffect(() => {
		if (saveRef) saveRef.current = handleSave;
	}, [saveRef, handleSave]);

	const handlePresetChange = async (preset: PassTemplatePreset) => {
		try {
			const res = await applyPreset.mutateAsync({ preset });
			const seed = res.seed;
			setState((s) => ({
				...s,
				templatePreset: preset,
				headerFields: seed.headerFields,
				primaryFields: seed.primaryFields,
				secondaryFields: seed.secondaryFields,
				auxiliaryFields: seed.auxiliaryFields,
				backFields: seed.backFields,
			}));
			qc.invalidateQueries({ queryKey: trpc.wallet.getConfig.queryOptions().queryKey });
			qc.invalidateQueries({ queryKey: trpc.wallet.generatePreview.queryOptions().queryKey });
			toast.success(`Applied "${preset}" template`);
		} catch {
			toast.error("Failed to apply preset");
		}
	};

	const updateImage = (key: "logoUrl" | "iconUrl" | "thumbnailUrl" | "stripUrl", url: string) =>
		setState((s) => ({ ...s, [key]: url }));

	return (
		<div className="space-y-6">
			{/* Template */}
			<Section icon={Layers} title="Template" hint="Pick a starting layout">
				<TemplatePresetPicker
					value={state.templatePreset}
					onChange={handlePresetChange}
					disabled={applyPreset.isPending}
				/>
			</Section>

			{/* Identity */}
			<Section icon={Type} title="Identity" hint="Org + description">
				<FieldGroup columns={2}>
					<div className="space-y-1.5">
						<Label htmlFor="w-org">Organization</Label>
						<Input
							id="w-org"
							value={state.organizationName}
							onChange={(e) => setState((s) => ({ ...s, organizationName: e.target.value }))}
							placeholder="Your Company"
							maxLength={100}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="w-desc">Pass description</Label>
						<Input
							id="w-desc"
							value={state.passDescription}
							onChange={(e) => setState((s) => ({ ...s, passDescription: e.target.value }))}
							placeholder="Contact card for John Doe"
							maxLength={200}
						/>
					</div>
				</FieldGroup>
			</Section>

			{/* Images */}
			<Section icon={ImageIcon} title="Images" hint="Logo · Icon · Thumbnail · Strip">
				<PassImageSlots
					logoUrl={state.logoUrl}
					iconUrl={state.iconUrl}
					thumbnailUrl={state.thumbnailUrl}
					stripUrl={state.stripUrl}
					onChange={updateImage}
				/>
			</Section>

			{/* Colors */}
			<Section icon={Palette} title="Colors" hint="Background · Foreground · Label">
				<FieldGroup columns={1}>
					<div className="grid grid-cols-3 gap-3">
						<ColorField
							id="w-bg"
							label="Background"
							value={state.backgroundColor}
							onChange={(v) => setState((s) => ({ ...s, backgroundColor: v }))}
							placeholder="#091533"
						/>
						<ColorField
							id="w-fg"
							label="Foreground"
							value={state.foregroundColor}
							onChange={(v) => setState((s) => ({ ...s, foregroundColor: v }))}
							placeholder="#FFFFFF"
						/>
						<ColorField
							id="w-label"
							label="Label"
							value={state.labelColor}
							onChange={(v) => setState((s) => ({ ...s, labelColor: v }))}
							placeholder="#0FACED"
						/>
					</div>
				</FieldGroup>
			</Section>

			{/* QR toggle */}
			<Section title="QR code" hint="Scan to view profile">
				<div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2">
					<Label className="cursor-pointer text-xs">Show QR code on the pass</Label>
					<Switch
						aria-label="Show QR code"
						checked={state.showQrCode}
						onCheckedChange={(v) => setState((s) => ({ ...s, showQrCode: v }))}
					/>
				</div>
			</Section>

			{/* Field editor — Pass.mk-style spatial editor */}
			<Section title="Fields" hint="Drag to reorder · empty values render as placeholder">
				<div className="space-y-3">
					<PassFieldEditor
						zone="header"
						fields={state.headerFields}
						onChange={(f) => setState((s) => ({ ...s, headerFields: f }))}
						onZoneFocus={onZoneFocus}
					/>
					<PassFieldEditor
						zone="primary"
						fields={state.primaryFields}
						onChange={(f) => setState((s) => ({ ...s, primaryFields: f }))}
						onZoneFocus={onZoneFocus}
					/>
					<PassFieldEditor
						zone="secondary"
						fields={state.secondaryFields}
						onChange={(f) => setState((s) => ({ ...s, secondaryFields: f }))}
						onZoneFocus={onZoneFocus}
					/>
					<PassFieldEditor
						zone="auxiliary"
						fields={state.auxiliaryFields}
						onChange={(f) => setState((s) => ({ ...s, auxiliaryFields: f }))}
						onZoneFocus={onZoneFocus}
					/>
					<PassFieldEditor
						zone="back"
						fields={state.backFields}
						onChange={(f) => setState((s) => ({ ...s, backFields: f }))}
						onZoneFocus={onZoneFocus}
					/>
				</div>
			</Section>
		</div>
	);
}

function Section({
	icon: Icon,
	title,
	hint,
	children,
}: {
	icon?: React.ComponentType<{ className?: string }>;
	title: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-baseline gap-2">
				{Icon && <Icon className="h-3 w-3 self-center text-muted-foreground" />}
				<h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
					{title}
				</h3>
				{hint && <span className="text-[10.5px] text-muted-foreground/60">· {hint}</span>}
			</div>
			{children}
		</div>
	);
}

