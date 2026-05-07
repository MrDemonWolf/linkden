"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Admin error boundary — keeps admin chrome visible (the parent admin layout)
// while showing the error and a reset path. Required to be a client component.
export default function AdminError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// eslint-disable-next-line no-console
		console.error("[admin error boundary]", error);
	}, [error]);

	return (
		<div className="flex min-h-[60vh] items-center justify-center p-8">
			<div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
				<div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
					<AlertTriangle className="h-6 w-6" />
				</div>
				<h2 className="text-xl font-semibold tracking-tight text-foreground">Admin error</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Something broke while rendering this admin page. Try again, or reload if it persists.
				</p>
				{error.digest ? (
					<p className="mt-3 font-mono text-[11px] text-muted-foreground/60">ref: {error.digest}</p>
				) : null}
				<div className="mt-6 flex items-center justify-center gap-3">
					<Button onClick={reset} className="h-10 px-5 text-sm">
						Try again
					</Button>
					<Button
						variant="outline"
						onClick={() => window.location.reload()}
						className="h-10 px-5 text-sm"
					>
						Reload page
					</Button>
				</div>
			</div>
		</div>
	);
}
