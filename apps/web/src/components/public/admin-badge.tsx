"use client";

import { Settings } from "lucide-react";
import type { ThemeColors } from "./public-page";
import { glassStyle } from "./theme-toggle";

/**
 * Cookie-gated editor shortcut. The admin route checks authorization on entry;
 * rendering the profile never probes a session.
 */
export function AdminBadge({ themeColors }: { themeColors: ThemeColors }) {
	return (
		<a
			href="/admin"
			className="fixed left-4 top-4 z-50 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-micro font-medium"
			style={glassStyle(themeColors)}
		>
			<Settings className="h-3.5 w-3.5" aria-hidden="true" />
			Admin
		</a>
	);
}
