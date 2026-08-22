"use client";

import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when the API is unreachable while server-rendering the public page. */
export function PageLoadError() {
	return (
		<main className="flex min-h-dvh items-center justify-center px-6">
			<div
				role="alert"
				className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-lg ring-1 ring-border"
			>
				<div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
					<AlertCircle className="h-5 w-5" aria-hidden="true" />
				</div>
				<h1 className="text-base font-semibold text-foreground">Couldn&apos;t load this page</h1>
				<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
					Something went wrong while loading. Check your connection and try again.
				</p>
				<Button onClick={() => window.location.reload()} className="mt-5 gap-1.5">
					<RotateCw className="h-4 w-4" aria-hidden="true" />
					Retry
				</Button>
			</div>
		</main>
	);
}
