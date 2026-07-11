"use client";

import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryErrorProps {
	message?: string;
	onRetry?: () => void;
	className?: string;
}

/**
 * Inline error state for a card whose data query failed.
 * Shows a short message plus a Retry button (wire `onRetry` to the query's refetch).
 */
export function QueryError({
	message = "Couldn't load this data",
	onRetry,
	className,
}: QueryErrorProps) {
	return (
		<div
			role="alert"
			className={cn("flex flex-col items-center justify-center gap-2 py-6 text-center", className)}
		>
			<AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
			<p className="text-xs text-muted-foreground">{message}</p>
			{onRetry && (
				<Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
					<RotateCw className="h-3.5 w-3.5" />
					Retry
				</Button>
			)}
		</div>
	);
}
