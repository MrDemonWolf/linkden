"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
	label: string;
	defaultOpen?: boolean;
	/** Opens the section while true, e.g. when a save attempt flags a field inside it. */
	forceOpen?: boolean;
	children: React.ReactNode;
}

export function CollapsibleSection({
	label,
	defaultOpen = false,
	forceOpen = false,
	children,
}: CollapsibleSectionProps) {
	const [open, setOpen] = useState(defaultOpen || forceOpen);
	const contentId = useId();

	useEffect(() => {
		if (forceOpen) setOpen(true);
	}, [forceOpen]);

	return (
		<div
			className={cn(
				"border-t border-border transition-colors",
				open && "border-l-2 border-l-primary/40",
			)}
		>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex min-h-11 w-full items-center justify-between px-4 py-2.5 text-micro font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground md:min-h-9"
				aria-expanded={open}
				aria-controls={contentId}
			>
				{label}
				<ChevronDown
					className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
				/>
			</button>
			{/* Collapsed content stays mounted for the height transition, so `inert`
			    keeps its fields out of the tab order and the accessibility tree. */}
			<div
				id={contentId}
				inert={!open}
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
