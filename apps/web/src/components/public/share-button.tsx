"use client";

import { Menu } from "@base-ui/react/menu";
import { Link2, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ThemeColors } from "./public-page";
import { glassStyle } from "./theme-toggle";

/**
 * 44×44 glass circle in the top-right cluster. Opens a two-item menu:
 * share (native sheet, else copy + toast) and a QR code dialog. The menu and
 * dialog are portaled outside `.ld-page`, so the theme is applied inline here
 * rather than inherited from the `--ld-*` vars.
 */
export function ShareButton({ title, themeColors }: { title: string; themeColors: ThemeColors }) {
	const [qr, setQr] = useState<string | null>(null);

	const share = async () => {
		const url = window.location.href;
		if (navigator.share) {
			try {
				await navigator.share({ title, url });
				return;
			} catch (err) {
				// Cancelled sheet — nothing to fall back to.
				if ((err as Error).name === "AbortError") return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			toast.success("Link copied");
		} catch {
			toast.error("Couldn't copy the link");
		}
	};

	const openQr = async () => {
		setQr(await QRCode.toDataURL(window.location.origin, { margin: 1, width: 240 }));
	};

	// Only used inside the popup, which mounts on open (client), so the SSR value never reaches the DOM.
	const canShare = typeof navigator !== "undefined" && !!navigator.share;

	const surface: React.CSSProperties = {
		backgroundColor: themeColors.card,
		color: themeColors.cardFg,
		borderColor: themeColors.border,
	};
	// The highlight fill alone is invisible on the presets where `muted`
	// equals `card` (most dark ones), so the roving focus also draws a 2px
	// outline in the theme's primary colour — the same indicator the page's
	// links use — independent of the muted token.
	const itemClass =
		"flex min-h-11 cursor-default select-none items-center gap-2.5 rounded-lg px-3 text-small outline-none data-[highlighted]:bg-(--ld-muted) data-[highlighted]:outline-solid data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2";
	const itemStyle: React.CSSProperties = { outlineColor: themeColors.primary };

	return (
		<>
			<Menu.Root>
				<Menu.Trigger
					aria-label="Share this page"
					className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
					style={glassStyle(themeColors)}
				>
					<Share2 className="h-5 w-5" aria-hidden="true" />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
						<Menu.Popup
							className="min-w-44 rounded-xl border p-1 shadow-card outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 duration-150"
							style={{ ...surface, "--ld-muted": themeColors.muted } as React.CSSProperties}
						>
							<Menu.Item className={itemClass} style={itemStyle} onClick={share}>
								{canShare ? (
									<Share2 className="h-4 w-4" aria-hidden="true" />
								) : (
									<Link2 className="h-4 w-4" aria-hidden="true" />
								)}
								{canShare ? "Share…" : "Copy link"}
							</Menu.Item>
							<Menu.Item className={itemClass} style={itemStyle} onClick={openQr}>
								<QrCode className="h-4 w-4" aria-hidden="true" />
								QR code
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<Dialog open={qr !== null} onOpenChange={(open) => !open && setQr(null)}>
				<DialogContent
					className="max-w-xs rounded-2xl [&_[data-slot=dialog-close]]:focus:ring-current"
					style={surface}
				>
					<DialogTitle style={{ color: themeColors.cardFg }}>Scan to open this page</DialogTitle>
					<DialogDescription style={{ color: themeColors.mutedFg }}>
						Point a phone camera at the code.
					</DialogDescription>
					{qr && (
						<img
							src={qr}
							alt="QR code linking to this page"
							width={240}
							height={240}
							className="mx-auto rounded-lg bg-white p-2"
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
