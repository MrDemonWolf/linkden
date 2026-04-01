"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "linkden-consent";

export function hasAnalyticsConsent(): boolean {
	if (typeof window === "undefined") return false;
	return localStorage.getItem(CONSENT_KEY) === "accepted";
}

export function ConsentBanner() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem(CONSENT_KEY);
		if (!stored) setVisible(true);
	}, []);

	const accept = () => {
		localStorage.setItem(CONSENT_KEY, "accepted");
		setVisible(false);
	};

	const decline = () => {
		localStorage.setItem(CONSENT_KEY, "declined");
		setVisible(false);
	};

	if (!visible) return null;

	return (
		<div
			role="dialog"
			aria-label="Cookie and analytics consent"
			className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-3 border-t bg-background/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
		>
			<p className="text-sm text-muted-foreground">
				This site uses cookies for authentication and optional analytics to understand visitor
				behaviour. You can accept or decline analytics tracking.
			</p>
			<div className="flex shrink-0 gap-2">
				<button
					type="button"
					onClick={decline}
					className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
				>
					Decline
				</button>
				<button
					type="button"
					onClick={accept}
					className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
				>
					Accept
				</button>
			</div>
		</div>
	);
}
