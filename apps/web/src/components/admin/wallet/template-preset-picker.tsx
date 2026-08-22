"use client";

import type { PassTemplatePreset } from "@linkden/validators/wallet";
import { Contact, IdCard, KeyRound, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS: {
	id: PassTemplatePreset;
	name: string;
	tag: string;
	icon: React.ComponentType<{ className?: string }>;
}[] = [
	{ id: "contact-card", name: "Contact card", tag: "GENERIC", icon: Contact },
	{ id: "member-card", name: "Member card", tag: "GENERIC", icon: IdCard },
	{ id: "access-pass", name: "Access pass", tag: "GENERIC", icon: KeyRound },
	{ id: "custom", name: "Custom", tag: "BLANK", icon: Sparkles },
];

interface Props {
	value: PassTemplatePreset;
	onChange: (preset: PassTemplatePreset) => void;
	disabled?: boolean;
}

export function TemplatePresetPicker({ value, onChange, disabled }: Props) {
	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{PRESETS.map((p) => {
				const Icon = p.icon;
				const active = p.id === value;
				return (
					<button
						key={p.id}
						type="button"
						disabled={disabled}
						onClick={() => onChange(p.id)}
						className={cn(
							"group relative flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-all",
							"hover:border-foreground/20 hover:bg-foreground/[0.02]",
							active
								? "border-primary/60 bg-primary/[0.06] shadow-[inset_0_0_0_1px] shadow-primary/30"
								: "border-border/60",
							disabled && "cursor-not-allowed opacity-50",
						)}
					>
						<div className="flex w-full items-center justify-between">
							<Icon
								className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")}
							/>
							<span className="font-mono text-micro uppercase tracking-wider text-muted-foreground/70">
								{p.tag}
							</span>
						</div>
						<span
							className={cn(
								"text-xs font-semibold tracking-tight",
								active ? "text-foreground" : "text-foreground/85",
							)}
						>
							{p.name}
						</span>
					</button>
				);
			})}
		</div>
	);
}
