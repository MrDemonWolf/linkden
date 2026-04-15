"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WolfLogo } from "@/components/wolf-logo";

// Root error boundary — catches uncaught errors in any public route under `/`.
// Must be a client component per Next.js App Router convention.
export default function RootError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Surface to console in dev; production logs go through Cloudflare Worker tail
		// eslint-disable-next-line no-console
		console.error("[root error boundary]", error);
	}, [error]);

	return (
		<div className="flex min-h-screen items-center justify-center px-6">
			<div className="mx-auto max-w-md text-center">
				<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-card ring-1 ring-border">
					<WolfLogo className="h-12 w-12" />
				</div>
				<div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
					<AlertTriangle className="h-5 w-5" />
				</div>
				<h1 className="text-2xl font-semibold tracking-tight text-foreground">
					Something went wrong
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					An unexpected error occurred while loading this page. You can try again, or come back later.
				</p>
				{error.digest ? (
					<p className="mt-3 font-mono text-[11px] text-muted-foreground/60">
						ref: {error.digest}
					</p>
				) : null}
				<div className="mt-8 flex items-center justify-center gap-3">
					<Button onClick={reset} className="h-10 px-5 text-sm">
						Try again
					</Button>
					<a
						href="/"
						className="text-sm text-primary/80 underline underline-offset-2 transition-colors hover:text-primary"
					>
						Go home
					</a>
				</div>
			</div>
		</div>
	);
}
