import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = {
	title: "You're offline",
	robots: { index: false, follow: false },
};

// The service worker precaches this route and serves it when a navigation
// fails, so it must render without fetching anything.
export default function OfflinePage() {
	return (
		<main className="admin-glass-bg flex min-h-dvh items-center justify-center px-6 text-foreground">
			<div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
				<p className="text-micro font-mono font-medium uppercase tracking-[0.14em] text-muted-foreground">
					No connection
				</p>
				<h1 className="font-display text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
				<p className="text-sm text-muted-foreground">
					This page needs a network connection. Check your Wi-Fi or mobile data and try again.
				</p>
				<RetryButton />
			</div>
		</main>
	);
}
