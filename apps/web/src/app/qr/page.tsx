"use client";

import { useEffect, useRef, useState } from "react";

export default function QRPage() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [url, setUrl] = useState("");

	useEffect(() => {
		const url = window.location.origin;
		setUrl(url);
		// Simple QR code placeholder - in production, use a QR library
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const size = 256;
		canvas.width = size;
		canvas.height = size;

		// Draw a placeholder QR pattern
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, size, size);
		ctx.fillStyle = "#000000";
		ctx.font = "14px monospace";
		ctx.textAlign = "center";
		ctx.fillText("QR Code", size / 2, size / 2 - 10);
		ctx.fillText(url, size / 2, size / 2 + 10);

		// Draw corner markers (simplified QR)
		const markerSize = 40;
		const drawMarker = (x: number, y: number) => {
			ctx.fillStyle = "#000";
			ctx.fillRect(x, y, markerSize, markerSize);
			ctx.fillStyle = "#fff";
			ctx.fillRect(x + 6, y + 6, markerSize - 12, markerSize - 12);
			ctx.fillStyle = "#000";
			ctx.fillRect(x + 12, y + 12, markerSize - 24, markerSize - 24);
		};
		drawMarker(10, 10);
		drawMarker(size - markerSize - 10, 10);
		drawMarker(10, size - markerSize - 10);
	}, []);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
			<h1 className="mb-6 text-2xl font-bold text-foreground">
				Scan to visit my page
			</h1>
			<canvas
				ref={canvasRef}
				className="rounded-lg border-2 border-border shadow-lg"
				aria-label="QR code linking to this page"
			/>
			<p className="sr-only">Visit this page at: {url}</p>
			<p className="mt-4 text-sm text-muted-foreground">
				Point your camera at this code to open the link
			</p>
			<a
				href="/"
				className="mt-6 text-primary hover:underline"
			>
				Back to page
			</a>
		</div>
	);
}
