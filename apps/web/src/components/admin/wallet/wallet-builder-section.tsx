"use client";

import { hexColorSchema } from "@linkden/validators/blocks";
import {
	PASS_FIELD_LIMITS,
	type PassField,
	type PassLocation,
	type PassTemplatePreset,
	parsePassLocationsJson,
	seedFromPreset,
} from "@linkden/validators/wallet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ColorField } from "@/components/admin/color-field";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { FieldGroup } from "@/components/admin/settings/field-group";
import { mutationErrorMessage } from "@/components/admin/settings/mutation-error";
import type { PassZone } from "@/components/admin/wallet-pass-preview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { isoToLocal, localToIso } from "@/lib/format";
import { fieldError } from "@/lib/validate";
import { trpc } from "@/utils/trpc";
import { ColorPalettePanel } from "./color-palette-panel";
import { ContextPanel } from "./context-panel";
import { PassFieldEditor } from "./pass-field-editor";
import { PassImageSlots } from "./pass-image-slots";
import { TemplatePresetPicker } from "./template-preset-picker";
import { WalletTabBar } from "./wallet-tab-bar";
import { parseStoredFields, walletFieldsError } from "./wallet-validation";

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

interface Props {
	onPreviewChange?: (state: WalletLiveState) => void;
	onZoneFocus?: (zone: PassZone | null) => void;
	onDirtyChange?: (dirty: boolean) => void;
	saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
	/** Discard on the save bar calls this to put the editor back to the saved row. */
	resetRef?: React.MutableRefObject<(() => void) | null>;
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

function fieldsEqual(a: PassField[], b: PassField[]) {
	if (a.length !== b.length) return false;
	return a.every((f, i) => f.key === b[i].key && f.label === b[i].label && f.value === b[i].value);
}

export function WalletBuilderSection({
	onPreviewChange,
	onZoneFocus,
	onDirtyChange,
	saveRef,
	resetRef,
}: Props) {
	const qc = useQueryClient();
	const configQuery = useQuery(trpc.wallet.getConfig.queryOptions());
	const updateConfig = useMutation(trpc.wallet.updateConfig.mutationOptions());

	const [state, setState] = useState<WalletLiveState>(DEFAULTS);
	const [saved, setSaved] = useState<WalletLiveState>(DEFAULTS);
	// getConfig is invalidated by unrelated things on this page (the header
	// "show on page" switch, for one). Re-seeding the editor from that refetch
	// would throw away in-progress edits — including a just-picked template —
	// so a dirty editor keeps its state and only the saved baseline moves.
	const dirtyRef = useRef(false);

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
			// Shape-checked: these are opaque settings a backup can set to any JSON,
			// and a non-array would crash the editor on render.
			headerFields: parseStoredFields(d.wallet_header_fields, PASS_FIELD_LIMITS.header, "header"),
			primaryFields: parseStoredFields(
				d.wallet_primary_fields,
				PASS_FIELD_LIMITS.primary,
				"primary",
			),
			secondaryFields: parseStoredFields(
				d.wallet_secondary_fields,
				PASS_FIELD_LIMITS.secondary,
				"secondary",
			),
			auxiliaryFields: parseStoredFields(
				d.wallet_auxiliary_fields,
				PASS_FIELD_LIMITS.auxiliary,
				"auxiliary",
			),
			backFields: parseStoredFields(d.wallet_back_fields, PASS_FIELD_LIMITS.back, "back"),
			showQrCode: d.wallet_show_qr_code !== "false",
			relevantDate: isoToLocal(d.wallet_relevant_date),
			locations: parsePassLocationsJson(d.wallet_locations),
		};
		setSaved(next);
		if (!dirtyRef.current) setState(next);
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
		dirtyRef.current = dirty;
		onDirtyChange?.(dirty);
	}, [dirty, onDirtyChange]);

	useEffect(() => {
		onPreviewChange?.(state);
	}, [state, onPreviewChange]);

	// ColorField already flags a bad hex inline on blur; this stops the save
	// (and the parent's saveRef) from sending what the server would reject.
	const colorError = [state.backgroundColor, state.foregroundColor, state.labelColor].some(
		(c) => c && fieldError(hexColorSchema, c),
	);
	// One over-long field or out-of-range location makes the server reject the
	// whole update, so name the row here instead.
	const fieldsError = walletFieldsError(state);
	const loaded = !!configQuery.data;

	const handleSave = useCallback(async () => {
		// Until the saved config has loaded, the editor holds DEFAULTS: saving
		// would overwrite the stored design with them.
		if (!loaded) return;
		if (colorError) {
			toast.error("Fix the highlighted colour fields first");
			return;
		}
		if (fieldsError) {
			toast.error(fieldsError);
			return;
		}
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
				locations: state.locations,
			});
			setSaved(state);
			qc.invalidateQueries({ queryKey: trpc.wallet.getConfig.queryOptions().queryKey });
			qc.invalidateQueries({ queryKey: trpc.wallet.generatePreview.queryOptions().queryKey });
			toast.success("Wallet pass saved");
		} catch (err) {
			toast.error(mutationErrorMessage(err, "Failed to save wallet pass"));
		}
	}, [state, updateConfig, qc, colorError, fieldsError, loaded]);

	useEffect(() => {
		if (resetRef) resetRef.current = () => setState(saved);
	}, [resetRef, saved]);

	useEffect(() => {
		if (saveRef) saveRef.current = handleSave;
	}, [saveRef, handleSave]);

	// Picking a template only seeds local state — it used to commit six settings
	// to the database on click, wiping every custom field with no confirm and no
	// undo. It is now an ordinary edit: visible in the preview, revertible with
	// Discard, and written only by Save.
	const handlePresetChange = (preset: PassTemplatePreset) => {
		const seed = seedFromPreset(preset);
		setState((s) => ({
			...s,
			templatePreset: preset,
			headerFields: seed.headerFields,
			primaryFields: seed.primaryFields,
			secondaryFields: seed.secondaryFields,
			auxiliaryFields: seed.auxiliaryFields,
			backFields: seed.backFields,
		}));
	};

	const updateImage = (key: "logoUrl" | "iconUrl" | "thumbnailUrl" | "stripUrl", url: string) =>
		setState((s) => ({ ...s, [key]: url }));

	if (configQuery.isLoading) {
		return (
			<div className="space-y-3" aria-busy="true">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	if (!loaded) {
		return (
			<QueryError
				message="Couldn't load your wallet pass design"
				onRetry={() => configQuery.refetch()}
			/>
		);
	}

	return (
		<Tabs defaultValue="business" className="flex min-h-0 flex-col">
			<WalletTabBar className="mb-6" />
			{/* Business — identity, template, QR, card fields */}
			<TabsContent value="business" keepMounted className="mt-0 space-y-6">
				<Section icon={Layers} title="Template" hint="Pick a starting layout">
					<TemplatePresetPicker value={state.templatePreset} onChange={handlePresetChange} />
				</Section>

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

				<Section title="Card fields" hint="Drag to reorder · empty values render as placeholder">
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
			</TabsContent>

			{/* Images — logo, icon, thumbnail (strip lives on Background) */}
			<TabsContent value="images" keepMounted className="mt-0">
				<PassImageSlots
					slots={["logoUrl", "iconUrl", "thumbnailUrl"]}
					logoUrl={state.logoUrl}
					iconUrl={state.iconUrl}
					thumbnailUrl={state.thumbnailUrl}
					stripUrl={state.stripUrl}
					onChange={updateImage}
				/>
			</TabsContent>

			{/* Context — relevant date + locations */}
			<TabsContent value="context" keepMounted className="mt-0">
				<ContextPanel
					relevantDate={state.relevantDate}
					locations={state.locations}
					onRelevantDateChange={(v) => setState((s) => ({ ...s, relevantDate: v }))}
					onLocationsChange={(locs) => setState((s) => ({ ...s, locations: locs }))}
				/>
			</TabsContent>

			{/* Colors — palettes + custom foreground/label */}
			<TabsContent value="colors" keepMounted className="mt-0">
				<ColorPalettePanel
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
					onFgChange={(v) => setState((s) => ({ ...s, foregroundColor: v }))}
					onLabelChange={(v) => setState((s) => ({ ...s, labelColor: v }))}
				/>
			</TabsContent>

			{/* Background — strip image + background color */}
			<TabsContent value="background" keepMounted className="mt-0 space-y-6">
				<Section title="Strip image" hint="Wide banner behind the pass body">
					<PassImageSlots
						slots={["stripUrl"]}
						logoUrl={state.logoUrl}
						iconUrl={state.iconUrl}
						thumbnailUrl={state.thumbnailUrl}
						stripUrl={state.stripUrl}
						onChange={updateImage}
					/>
				</Section>
				<Section title="Background color" hint="Palette picks on Colors also set this">
					<div className="max-w-[240px]">
						<ColorField
							id="w-bg"
							label="Background"
							value={state.backgroundColor}
							onChange={(v) => setState((s) => ({ ...s, backgroundColor: v }))}
							placeholder="#091533"
						/>
					</div>
				</Section>
			</TabsContent>
		</Tabs>
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
				<h3 className="text-micro font-semibold uppercase tracking-wider text-foreground/80">
					{title}
				</h3>
				{hint && <span className="text-micro text-muted-foreground">· {hint}</span>}
			</div>
			{children}
		</div>
	);
}
