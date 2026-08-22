import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Standard admin page wrapper: entrance animation + vertical rhythm. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6",
				className,
			)}
		>
			{children}
		</div>
	);
}
