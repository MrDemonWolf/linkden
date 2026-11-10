"use client";

import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AdminFooter({ brandingEnabled }: { brandingEnabled: boolean }) {
	const version = process.env.NEXT_PUBLIC_APP_VERSION;
	return (
		<footer className="mt-auto border-t border-border bg-card">
			<div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-4 py-4 pb-[calc(56px+env(safe-area-inset-bottom)+1rem)] text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:pb-4">
				<div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
					{brandingEnabled && (
						<a
							href="https://github.com/mrdemonwolf/LinkDen"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex min-h-11 items-center gap-1 rounded-sm font-medium underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:min-h-8"
						>
							Powered by LinkDen
							<ArrowUpRight className="size-3.5" aria-hidden="true" />
							<span className="sr-only"> (opens in new tab)</span>
						</a>
					)}
					{version && <span title={`Version ${version}`}>v{version}</span>}
					{process.env.NODE_ENV === "development" && (
						<span className="rounded border border-border px-1.5 py-0.5">Development</span>
					)}
				</div>
				<ThemeToggle />
			</div>
		</footer>
	);
}
