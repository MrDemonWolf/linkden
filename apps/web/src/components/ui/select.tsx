"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SelectItem {
	value: string;
	label: string;
}

/**
 * Single-value select built on Base UI. Mirrors the `Input` box (height,
 * border, focus ring, 16px font on mobile) so a select sits flush next to a
 * text field. Items are a flat `{ value, label }` list — no groups yet.
 */
export function Select({
	id,
	value,
	onValueChange,
	items,
	placeholder,
	className,
	disabled,
	"aria-label": ariaLabel,
}: {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	items: readonly SelectItem[];
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	"aria-label"?: string;
}) {
	return (
		<SelectPrimitive.Root
			value={value}
			// ponytail: null only arrives from a cleared multi-select, which we never render.
			onValueChange={(v) => v !== null && onValueChange(v)}
			items={items}
			disabled={disabled}
		>
			<SelectPrimitive.Trigger
				id={id}
				aria-label={ariaLabel}
				className={cn(
					"dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-offset-background disabled:bg-input/50 dark:disabled:bg-input/80 flex h-11 w-full min-w-0 cursor-default items-center gap-2 rounded-lg border bg-transparent px-2.5 py-1 text-left text-base backdrop-blur-sm transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:text-sm",
					className,
				)}
			>
				<SelectPrimitive.Value
					placeholder={placeholder}
					className="min-w-0 flex-1 truncate data-[placeholder]:text-muted-foreground"
				/>
				<SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
					<ChevronDown className="h-4 w-4" aria-hidden="true" />
				</SelectPrimitive.Icon>
			</SelectPrimitive.Trigger>
			<SelectPrimitive.Portal>
				<SelectPrimitive.Positioner sideOffset={4} className="z-50 outline-none">
					<SelectPrimitive.Popup className="max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 duration-150">
						<SelectPrimitive.List>
							{items.map((item) => (
								<SelectPrimitive.Item
									key={item.value}
									value={item.value}
									// The highlighted option has DOM focus (roving tabindex) and this is
									// its only indicator: bg-muted alone is ~1.03:1 against the popover,
									// so add a primary tint + inset ring (≥3:1 non-text contrast).
									className="relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-7 text-base outline-none select-none data-[highlighted]:bg-primary/10 data-[highlighted]:ring-1 data-[highlighted]:ring-inset data-[highlighted]:ring-ring md:text-sm"
								>
									<SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center">
										<Check className="h-3.5 w-3.5" aria-hidden="true" />
									</SelectPrimitive.ItemIndicator>
									<SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
								</SelectPrimitive.Item>
							))}
						</SelectPrimitive.List>
					</SelectPrimitive.Popup>
				</SelectPrimitive.Positioner>
			</SelectPrimitive.Portal>
		</SelectPrimitive.Root>
	);
}
