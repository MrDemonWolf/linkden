"use client";

import { Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { ThemeColors } from "./public-page";
import { glassStyle } from "./theme-toggle";

/**
 * "Admin" pill in the top-left of the public page, only for a signed-in admin.
 * Client-only: the page is SSR'd anonymously, so the session is checked here
 * after hydration rather than threaded as an `isAdmin` prop.
 */
export function AdminBadge({ themeColors }: { themeColors: ThemeColors }) {
	const { data: session } = authClient.useSession();
	if (!session?.user) return null;

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
