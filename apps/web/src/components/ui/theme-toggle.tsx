"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const THEME_OPTIONS = [
	{ value: "light", icon: Sun, label: "Light" },
	{ value: "dark", icon: Moon, label: "Dark" },
	{ value: "system", icon: Monitor, label: "System" },
] as const;

/**
 * Light / dark / system as one shadcn ToggleGroup (single-select), so the
 * control uses the system's own segmented-button sizing instead of a bespoke
 * pill. Pressed state is Base UI's `aria-pressed`; the label is the accessible
 * name on each icon item.
 *
 * `mounted` gates only the *value*, not the markup: the first client render
 * has to match the server's (no theme known yet), or next-themes' localStorage
 * read would trip a hydration mismatch.
 */
export function ThemeToggle() {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	return (
		<ToggleGroup
			aria-label="Color theme"
			spacing={0}
			value={mounted && theme ? [theme] : []}
			onValueChange={(next) => {
				// Single-select: pressing the active item would otherwise clear it.
				const [value] = next;
				if (value) setTheme(value);
			}}
			className="rounded-md border border-border bg-card p-0.5"
		>
			{THEME_OPTIONS.map((opt) => {
				const Icon = opt.icon;
				return (
					<ToggleGroupItem
						key={opt.value}
						value={opt.value}
						aria-label={`${opt.label} theme`}
						className="size-11 md:size-7 aria-pressed:bg-primary/15 aria-pressed:text-primary"
					>
						<Icon className="size-3.5" />
					</ToggleGroupItem>
				);
			})}
		</ToggleGroup>
	);
}
