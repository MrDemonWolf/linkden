"use client";

import { Switch as SwitchPrimitive } from "@headlessui/react";
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
		<SwitchPrimitive
			data-slot="switch"
			checked={checked}
			defaultChecked={defaultChecked}
			onChange={onCheckedChange}
			disabled={disabled}
			className={cn(
				"group peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border shadow-sm transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"bg-zinc-300 border-zinc-400/70 dark:bg-white/20 dark:border-white/25",
				"data-[checked]:bg-primary data-[checked]:border-primary",
				className,
			)}
			{...props}
		>
			<span
				data-slot="switch-thumb"
				className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-1 ring-black/10 transition-transform translate-x-0.5 group-data-[checked]:translate-x-5"
			/>
		</SwitchPrimitive>
	);
}

export { Switch };
