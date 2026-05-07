"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
	{ value: "light", icon: Sun, label: "Light" },
	{ value: "dark", icon: Moon, label: "Dark" },
	{ value: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeToggle() {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// Render a size-matched placeholder during SSR to prevent hydration mismatch
	if (!mounted) {
		return (
			<div className="flex rounded-lg border border-border/50 p-0.5 bg-card/80 backdrop-blur-sm shadow-sm h-[36px] w-[104px]" />
		);
	}

	return (
		<div className="flex rounded-lg border border-border/50 p-0.5 bg-card/80 backdrop-blur-sm shadow-sm">
			{THEME_OPTIONS.map((opt) => {
				const Icon = opt.icon;
				return (
					<button
						key={opt.value}
						type="button"
						onClick={() => setTheme(opt.value)}
						className={cn(
							"flex items-center justify-center rounded-md p-2 min-h-[32px] min-w-[32px] transition-all",
							theme === opt.value
								? "bg-primary/15 text-primary shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
						title={opt.label}
						aria-label={`Switch to ${opt.label} theme`}
					>
						<Icon className="h-3.5 w-3.5" />
					</button>
				);
			})}
		</div>
	);
}
