"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Image as ImageIcon, Type, Palette, MapPin, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/admin/settings/field-group";
import {
	PASS_TEMPLATE_PRESETS,
	PASS_LOCATION_LIMIT,
	type PassField,
	type PassLocation,
	type PassTemplatePreset,
} from "@linkden/validators/wallet";
import { TemplatePresetPicker } from "./template-preset-picker";
import { PassImageSlots } from "./pass-image-slots";
import { PassFieldEditor } from "./pass-field-editor";
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
	relevantDate: string; // datetime-local string ("" when unset)
	locations: PassLocation[];
}

// datetime-local <-> ISO (stored as UTC ISO so Wallet gets an unambiguous time)
function isoToLocal(iso: string | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function localToIso(local: string): string {
	if (!local) return "";
	const d = new Date(local);
	return Number.isNaN(d.getTime()) ? "" : d.toISOString();
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
	relevantDate: "",
	locations: [] as PassLocation[],
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
			relevantDate: isoToLocal(d.wallet_relevant_date),
			locations: safeParse<PassLocation[]>(d.wallet_locations, []),
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
			state.relevantDate !== saved.relevantDate ||
			JSON.stringify(state.locations) !== JSON.stringify(saved.locations) ||
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
				relevantDate: localToIso(state.relevantDate),
				locations: state.locations.filter(
					(l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude),
				),
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
			<Section icon={Palette} title="Colors" hint="Pick a palette or set your own">
				<div className="space-y-3">
					<PalettePicker
						bg={state.backgroundColor}
						fg={state.foregroundColor}
						label={state.labelColor}
						onPick={(p) =>
							setState((s) => ({
								...s,
								backgroundColor: p.bg,
								foregroundColor: p.fg,
								labelColor: p.label,
							}))
						}
					/>
					<details className="group">
						<summary className="cursor-pointer select-none text-[10.5px] text-muted-foreground/70 hover:text-muted-foreground">
							Custom colors
						</summary>
						<div className="grid grid-cols-3 gap-3 pt-3">
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
					</details>
				</div>
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

			{/* Context-aware relevance */}
			<Section icon={MapPin} title="Context-Aware" hint="Surface on the Lock Screen by time + place">
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="w-reldate">Relevant date</Label>
						<Input
							id="w-reldate"
							type="datetime-local"
							value={state.relevantDate}
							onChange={(e) => setState((s) => ({ ...s, relevantDate: e.target.value }))}
						/>
						<p className="text-[10.5px] text-muted-foreground/60">
							Wallet floats the pass on the Lock Screen around this time. Leave empty to disable.
						</p>
					</div>
					<LocationEditor
						locations={state.locations}
						onChange={(locs) => setState((s) => ({ ...s, locations: locs }))}
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

function LocationEditor({
	locations,
	onChange,
}: {
	locations: PassLocation[];
	onChange: (l: PassLocation[]) => void;
}) {
	const update = (i: number, patch: Partial<PassLocation>) =>
		onChange(locations.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
	const add = () => onChange([...locations, { latitude: 0, longitude: 0, relevantText: "" }]);
	const remove = (i: number) => onChange(locations.filter((_, idx) => idx !== i));

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-[11px]">Locations</Label>
				<span className="text-[10px] text-muted-foreground/60">
					{locations.length}/{PASS_LOCATION_LIMIT}
				</span>
			</div>
			{locations.length === 0 && (
				<p className="text-[10.5px] text-muted-foreground/60">
					No locations. Add coordinates so the pass appears when someone is nearby.
				</p>
			)}
			{locations.map((loc, i) => (
				<div key={i} className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-2.5">
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label className="text-[10px]">Latitude</Label>
							<Input
								type="number"
								step="any"
								value={Number.isFinite(loc.latitude) ? loc.latitude : ""}
								placeholder="37.7749"
								onChange={(e) => update(i, { latitude: parseFloat(e.target.value) })}
								className="text-[11px]"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-[10px]">Longitude</Label>
							<Input
								type="number"
								step="any"
								value={Number.isFinite(loc.longitude) ? loc.longitude : ""}
								placeholder="-122.4194"
								onChange={(e) => update(i, { longitude: parseFloat(e.target.value) })}
								className="text-[11px]"
							/>
						</div>
					</div>
					<div className="space-y-1">
						<Label className="text-[10px]">Lock Screen text</Label>
						<Input
							value={loc.relevantText ?? ""}
							maxLength={100}
							placeholder="Save my contact"
							onChange={(e) => update(i, { relevantText: e.target.value })}
							className="text-[11px]"
						/>
					</div>
					<button
						type="button"
						onClick={() => remove(i)}
						className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
					>
						<Trash2 className="h-3 w-3" /> Remove
					</button>
				</div>
			))}
			{locations.length < PASS_LOCATION_LIMIT && (
				<Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
					<Plus className="h-3.5 w-3.5" /> Add location
				</Button>
			)}
		</div>
	);
}

interface WalletPalette {
	name: string;
	bg: string;
	fg: string;
	label: string;
}

// Curated palettes — one tap sets background/foreground/label together.
const WALLET_PALETTES: WalletPalette[] = [
	{ name: "Midnight", bg: "#0E1116", fg: "#FFFFFF", label: "#3AD2A6" },
	{ name: "Navy", bg: "#091533", fg: "#FFFFFF", label: "#0FACED" },
	{ name: "Indigo", bg: "#241A52", fg: "#FFFFFF", label: "#C7B6FF" },
	{ name: "Graphite", bg: "#17181A", fg: "#F5F5F5", label: "#C0C0C0" },
	{ name: "Forest", bg: "#10241C", fg: "#F2FBF6", label: "#6FE0B4" },
	{ name: "Ocean", bg: "#04283A", fg: "#EAF6FF", label: "#38C6E8" },
	{ name: "Wine", bg: "#2A0F1B", fg: "#FBE9F0", label: "#E6779F" },
	{ name: "Slate", bg: "#1C2530", fg: "#FFFFFF", label: "#7FB4E8" },
	{ name: "Sand", bg: "#F4EFE6", fg: "#241F1A", label: "#B56A2E" },
	{ name: "Coral", bg: "#FBF3EF", fg: "#3A1E14", label: "#D85A30" },
	{ name: "Paper", bg: "#FAFAF7", fg: "#1A1A1A", label: "#3B6D11" },
	{ name: "Blush", bg: "#FBEAF0", fg: "#3A1526", label: "#B23A5F" },
];

const eqColor = (a: string, b: string) => (a || "").toUpperCase() === b.toUpperCase();

function PalettePicker({
	bg,
	fg,
	label,
	onPick,
}: {
	bg: string;
	fg: string;
	label: string;
	onPick: (p: WalletPalette) => void;
}) {
	return (
		<div
			role="radiogroup"
			aria-label="Color palettes"
			className="grid grid-cols-4 gap-2 sm:grid-cols-6"
		>
			{WALLET_PALETTES.map((p) => {
				const active = eqColor(bg, p.bg) && eqColor(fg, p.fg) && eqColor(label, p.label);
				return (
					<button
						key={p.name}
						type="button"
						role="radio"
						aria-checked={active}
						aria-label={p.name}
						title={p.name}
						onClick={() => onPick(p)}
						className={`group relative flex h-12 flex-col justify-between overflow-hidden rounded-lg p-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
							active
								? "ring-2 ring-primary ring-offset-1 ring-offset-background"
								: "ring-1 ring-border/60 hover:ring-border"
						}`}
						style={{ backgroundColor: p.bg }}
					>
						<span
							className="text-[9px] font-semibold uppercase tracking-wider"
							style={{ color: p.label }}
						>
							{p.name}
						</span>
						<span className="h-1 w-5 rounded-full" style={{ backgroundColor: p.fg }} />
					</button>
				);
			})}
		</div>
	);
}

function ColorField({
	id,
	label,
	value,
	onChange,
	placeholder,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id} className="text-[11px]">
				{label}
			</Label>
			<div className="flex gap-1.5">
				<Input
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="font-mono text-[11px]"
					maxLength={7}
				/>
				<input
					type="color"
					value={value || placeholder}
					onChange={(e) => onChange(e.target.value.toUpperCase())}
					className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent"
					aria-label={`${label} color`}
				/>
			</div>
		</div>
	);
}
