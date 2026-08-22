import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Standard admin page wrapper: entrance animation + vertical rhythm. */
export function PageShell({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out space-y-6",
				className,
			)}
			{...props}
		/>
	);
}
