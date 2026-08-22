"use client";

import { Copy, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Top-bar Share: the public URL with Copy, the native share sheet when the
 * browser has one, and a QR code (generated on open via `qrcode`). One popover
 * for every breakpoint — it also sits in the MobilePreviewSheet header.
 */
export function SharePopover({ className }: { className?: string }) {
	const [open, setOpen] = useState(false);
	const [qr, setQr] = useState<string | null>(null);
	const [url, setUrl] = useState("");

	useEffect(() => {
		if (!open) return;
		const origin = window.location.origin;
		setUrl(origin);
		QRCode.toDataURL(origin, { margin: 1, width: 200 })
			.then(setQr)
			.catch(() => setQr(null));
	}, [open]);

	const copy = () =>
		navigator.clipboard
			.writeText(url)
			.then(() => toast.success("Link copied"))
			.catch(() => toast.error("Couldn't copy the link"));

	const share = async () => {
		try {
			await navigator.share({ url });
		} catch (err) {
			if ((err as Error).name !== "AbortError") toast.error("Couldn't share");
		}
	};
	const canShare = typeof navigator !== "undefined" && !!navigator.share;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				aria-label="Share your page"
				render={
					<Button variant="ghost" size="icon" className={cn("text-muted-foreground", className)} />
				}
			>
				<Share2 className="h-4 w-4" />
			</PopoverTrigger>
			<PopoverContent align="end" side="bottom" sideOffset={8} className="w-64 gap-0 p-3">
				<PopoverTitle className="text-micro font-semibold uppercase tracking-widest text-muted-foreground">
					Share your page
				</PopoverTitle>
				<div className="mt-2 flex items-center gap-1">
					<code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-xs">
						{url}
					</code>
					<Button variant="outline" size="icon" aria-label="Copy link" onClick={copy}>
						<Copy className="h-3.5 w-3.5" />
					</Button>
				</div>
				{canShare && (
					<Button variant="secondary" size="sm" className="mt-2 w-full" onClick={share}>
						<Share2 className="h-3.5 w-3.5" />
						Share…
					</Button>
				)}
				{qr && (
					<img
						src={qr}
						alt="QR code linking to your page"
						width={200}
						height={200}
						className="mx-auto mt-3 rounded-lg bg-white p-2"
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}
