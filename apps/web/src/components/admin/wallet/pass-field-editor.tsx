"use client";

import {
	type Announcements,
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	type UniqueIdentifier,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PASS_FIELD_LIMITS, type PassField } from "@linkden/validators/wallet";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useId, useMemo } from "react";
import type { PassZone } from "@/components/admin/wallet-pass-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PASS_FIELD_LABEL_MAX, PASS_FIELD_VALUE_MAX } from "./wallet-validation";

const ZONE_LABELS: Record<PassZone, { name: string; key: keyof typeof PASS_FIELD_LIMITS }> = {
	header: { name: "Header", key: "header" },
	primary: { name: "Primary", key: "primary" },
	secondary: { name: "Secondary", key: "secondary" },
	auxiliary: { name: "Auxiliary", key: "auxiliary" },
	back: { name: "Back of pass", key: "back" },
};

const SCREEN_READER_INSTRUCTIONS = {
	draggable:
		"To reorder a field, press Space or Enter to pick it up. Use the up and down arrow keys to move it, then press Space or Enter to drop it, or Escape to cancel.",
};

interface FieldEditorProps {
	zone: PassZone;
	fields: PassField[];
	onChange: (fields: PassField[]) => void;
	onZoneFocus?: (zone: PassZone | null) => void;
}

export function PassFieldEditor({ zone, fields, onChange, onZoneFocus }: FieldEditorProps) {
	const meta = ZONE_LABELS[zone];
	const max = PASS_FIELD_LIMITS[meta.key];
	const atMax = fields.length >= max;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const ids = useMemo(() => fields.map((f, i) => `${zone}-${i}-${f.key}`), [fields, zone]);

	// Speak field labels and 1-based positions, not the synthetic sortable ids.
	const positionOf = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1;
	const fieldLabel = (id: UniqueIdentifier) => {
		const field = fields[ids.indexOf(String(id))];
		return field?.label.trim() || `${meta.name} field ${positionOf(id)}`;
	};
	const total = fields.length;
	const announcements: Announcements = {
		onDragStart: ({ active }) =>
			`Picked up ${fieldLabel(active.id)}, position ${positionOf(active.id)} of ${total}.`,
		onDragOver: ({ active, over }) =>
			over
				? `${fieldLabel(active.id)} moved to position ${positionOf(over.id)} of ${total}.`
				: `${fieldLabel(active.id)} is no longer over the list.`,
		onDragEnd: ({ active, over }) =>
			over
				? `${fieldLabel(active.id)} dropped at position ${positionOf(over.id)} of ${total}.`
				: `${fieldLabel(active.id)} dropped. The order is unchanged.`,
		onDragCancel: ({ active }) =>
			`Reordering cancelled. ${fieldLabel(active.id)} stays at position ${positionOf(active.id)}.`,
	};

	const handleDragEnd = (e: DragEndEvent) => {
		if (!e.over || e.active.id === e.over.id) return;
		const oldIdx = ids.indexOf(String(e.active.id));
		const newIdx = ids.indexOf(String(e.over.id));
		if (oldIdx < 0 || newIdx < 0) return;
		onChange(arrayMove(fields, oldIdx, newIdx));
	};

	const updateField = (idx: number, patch: Partial<PassField>) => {
		const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
		onChange(next);
	};

	const addField = () => {
		if (atMax) return;
		const next = [
			...fields,
			{ key: `field${fields.length + 1}_${Date.now()}`, label: "Label", value: "" },
		];
		onChange(next);
	};

	const removeField = (idx: number) => {
		onChange(fields.filter((_, i) => i !== idx));
	};

	return (
		<fieldset
			aria-label={`${meta.name} fields`}
			className="rounded-lg border border-border/60 bg-card/40"
			onFocus={() => onZoneFocus?.(zone)}
			onBlur={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node)) onZoneFocus?.(null);
			}}
		>
			<div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
				<div className="flex items-center gap-2">
					<h3 className="text-micro font-semibold uppercase tracking-wider text-foreground/80">
						{meta.name}
					</h3>
					<span className="font-mono text-micro text-muted-foreground tabular-nums">
						{fields.length}/{max}
					</span>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="xs"
					disabled={atMax}
					onClick={addField}
					className="px-2"
				>
					<Plus className="mr-1 h-3 w-3" />
					Add
				</Button>
			</div>

			{fields.length === 0 ? (
				<p className="px-3 py-3 text-micro italic text-muted-foreground">
					No fields yet. Click <span className="font-semibold">Add</span> to insert one.
				</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
					accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
				>
					<SortableContext items={ids} strategy={verticalListSortingStrategy}>
						<ul className="divide-y divide-border/40">
							{fields.map((field, idx) => (
								<SortableFieldRow
									key={ids[idx]}
									id={ids[idx]}
									zone={zone}
									idx={idx}
									field={field}
									onUpdate={(patch) => updateField(idx, patch)}
									onRemove={() => removeField(idx)}
								/>
							))}
						</ul>
					</SortableContext>
				</DndContext>
			)}
		</fieldset>
	);
}

function SortableFieldRow({
	id,
	zone,
	idx,
	field,
	onUpdate,
	onRemove,
}: {
	id: string;
	zone: PassZone;
	idx: number;
	field: PassField;
	onUpdate: (patch: Partial<PassField>) => void;
	onRemove: () => void;
}) {
	const labelId = useId();
	const valueId = useId();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id,
	});

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const jsonPath = `${zone}Fields[${idx}]`;
	// The counter only appears once a value is getting long (back-of-pass text).
	const showValueCount = field.value.length >= PASS_FIELD_VALUE_MAX * 0.75;

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={cn(
				"group flex items-start gap-2 px-2 py-2 transition-colors",
				isDragging && "bg-primary/5 ring-1 ring-primary/30",
			)}
		>
			<button
				type="button"
				className="flex h-11 w-8 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing md:mt-0.5 md:size-6"
				aria-label={`Drag ${zone} field ${idx + 1} to reorder`}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-3.5 w-3.5" />
			</button>

			<div className="grid flex-1 grid-cols-[1fr_2fr] gap-1.5">
				<Input
					id={labelId}
					placeholder="Label"
					value={field.label}
					maxLength={PASS_FIELD_LABEL_MAX}
					onChange={(e) => onUpdate({ label: e.target.value })}
					className="h-11 text-micro md:h-7"
					aria-label={`${zone} field ${idx + 1} label`}
				/>
				<Input
					id={valueId}
					placeholder="Value"
					value={field.value}
					maxLength={PASS_FIELD_VALUE_MAX}
					onChange={(e) => onUpdate({ value: e.target.value })}
					className="h-11 text-micro md:h-7"
					aria-label={`${zone} field ${idx + 1} value`}
				/>
				<p className="col-span-2 -mt-0.5 flex justify-between gap-2 font-mono text-micro text-muted-foreground">
					<span>{jsonPath}</span>
					{showValueCount && (
						<span className="tabular-nums">
							{field.value.length}/{PASS_FIELD_VALUE_MAX}
						</span>
					)}
				</p>
			</div>

			<button
				type="button"
				onClick={onRemove}
				className="flex h-11 w-11 items-center justify-center rounded text-muted-foreground transition-all md:mt-0.5 md:size-6 md:opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={`Delete ${zone} field ${idx + 1}`}
			>
				<Trash2 className="h-3 w-3" />
			</button>
		</li>
	);
}
