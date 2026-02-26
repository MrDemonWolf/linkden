"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

interface SwitchProps {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	defaultChecked?: boolean;
	disabled?: boolean;
	className?: string;
	"aria-label"?: string;
	"aria-describedby"?: string;
}

function Switch({
	checked,
	onCheckedChange,
	defaultChecked,
	disabled,
	className,
	...props
}: SwitchProps) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			checked={checked}
			onCheckedChange={onCheckedChange}
			defaultChecked={defaultChecked}
			disabled={disabled}
			className={cn(
				"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"data-checked:bg-primary data-unchecked:bg-muted",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
					"data-checked:translate-x-4 data-unchecked:translate-x-0",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
