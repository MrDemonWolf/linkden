import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Standard admin page wrapper: vertical rhythm only (no page fade — the shell stays put). */
export function PageShell({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("space-y-6", className)} {...props} />;
}
