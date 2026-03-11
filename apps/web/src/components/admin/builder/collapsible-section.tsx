"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
	label: string;
	defaultOpen?: boolean;
	children: React.ReactNode;
}

export function CollapsibleSection({
	label,
	defaultOpen = false,
	children,
}: CollapsibleSectionProps) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div
			className={cn(
				"border-t border-white/10 transition-colors",
				open && "border-l-2 border-l-primary/40",
			)}
		>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center justify-between px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
				aria-expanded={open}
			>
				{label}
				<ChevronDown
					className={cn(
						"h-3.5 w-3.5 transition-transform duration-200",
						open && "rotate-180",
					)}
				/>
			</button>
			<div
				className={cn(
					"grid transition-all duration-200 ease-in-out",
					open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
				)}
			>
				<div className="overflow-hidden">
					<div className="space-y-3 px-4 pb-4">{children}</div>
				</div>
			</div>
		</div>
	);
}
