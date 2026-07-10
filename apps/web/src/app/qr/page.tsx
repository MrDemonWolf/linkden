"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRPage() {
	const [url, setUrl] = useState("");
	const [qrDataUrl, setQrDataUrl] = useState("");

	useEffect(() => {
		let cancelled = false;
		const origin = window.location.origin;
		setUrl(origin);
		QRCode.toDataURL(origin, {
			width: 256,
			margin: 1,
			color: { dark: "#091533", light: "#ffffff" },
		})
			.then((data) => {
				if (!cancelled) setQrDataUrl(data);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="login-bg flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
			<p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
				LinkDen · QR
			</p>
			<h1 className="mb-6 text-2xl font-semibold tracking-[-0.015em] text-foreground">
				Scan to visit my page
			</h1>
			<div className="rounded-2xl border border-primary/30 bg-card p-4 backdrop-blur-md shadow-[0_0_40px_-12px_var(--primary)]">
				{qrDataUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={qrDataUrl}
						alt="QR code linking to this page"
						width={256}
						height={256}
						className="rounded-lg"
					/>
				) : (
					<div
						className="h-64 w-64 animate-pulse rounded-lg bg-muted"
						role="img"
						aria-label="Generating QR code"
					/>
				)}
			</div>
			<p className="sr-only">Visit this page at: {url}</p>
			<p className="mt-4 text-xs text-muted-foreground font-mono">
				{url || "Point your camera at this code to open the link"}
			</p>
			<a href="/" className="mt-6 text-sm text-primary hover:underline">
				Back to page
			</a>
		</div>
	);
}
