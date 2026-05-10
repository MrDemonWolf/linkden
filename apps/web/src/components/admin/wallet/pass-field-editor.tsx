"use client";

import { useId, useMemo } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PASS_FIELD_LIMITS, type PassField } from "@linkden/validators/wallet";
import type { PassZone } from "@/components/admin/wallet-pass-preview";

const ZONE_LABELS: Record<PassZone, { name: string; key: keyof typeof PASS_FIELD_LIMITS }> = {
	header: { name: "Header", key: "header" },
	primary: { name: "Primary", key: "primary" },
	secondary: { name: "Secondary", key: "secondary" },
	auxiliary: { name: "Auxiliary", key: "auxiliary" },
	back: { name: "Back of pass", key: "back" },
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
		<div
			className="rounded-lg border border-border/60 bg-card/40"
			onFocus={() => onZoneFocus?.(zone)}
			onBlur={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node)) onZoneFocus?.(null);
			}}
		>
			<div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
				<div className="flex items-center gap-2">
					<h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
						{meta.name}
					</h3>
					<span className="font-mono text-[9.5px] text-muted-foreground/70 tabular-nums">
						{fields.length}/{max}
					</span>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="xs"
					disabled={atMax}
					onClick={addField}
					className="h-6 px-2"
				>
					<Plus className="mr-1 h-3 w-3" />
					Add
				</Button>
			</div>

			{fields.length === 0 ? (
				<p className="px-3 py-3 text-[11px] italic text-muted-foreground/60">
					No fields yet. Click <span className="font-semibold">Add</span> to insert one.
				</p>
			) : (
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
		</div>
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
				className="mt-2 cursor-grab touch-none text-muted-foreground/30 hover:text-muted-foreground/70 active:cursor-grabbing"
				aria-label="Drag to reorder"
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
					onChange={(e) => onUpdate({ label: e.target.value })}
					className="h-7 text-[11px]"
					aria-label={`${zone} field ${idx + 1} label`}
				/>
				<Input
					id={valueId}
					placeholder="Value"
					value={field.value}
					onChange={(e) => onUpdate({ value: e.target.value })}
					className="h-7 text-[11px]"
					aria-label={`${zone} field ${idx + 1} value`}
				/>
				<p className="col-span-2 -mt-0.5 font-mono text-[9px] text-muted-foreground/40">
					{jsonPath}
				</p>
			</div>

			<button
				type="button"
				onClick={onRemove}
				className="mt-1.5 rounded p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
				aria-label="Delete field"
			>
				<Trash2 className="h-3 w-3" />
			</button>
		</li>
	);
}
