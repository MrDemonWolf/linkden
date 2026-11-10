import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

type ScreenshotProps = {
	/** Light-mode capture; also used in dark mode when `dark` is omitted. */
	light: StaticImageData;
	/** Optional dark-mode capture, shown instead of `light` when the docs are in dark mode. */
	dark?: StaticImageData;
	alt: string;
	caption?: ReactNode;
	/** Display cap in CSS pixels, for narrow captures such as phones or single components. */
	maxWidth?: number;
};

/**
 * A captured screen from the real app. Images are static imports, so the docs export
 * fingerprints them and applies the `/linkden` base path automatically.
 */
export function Screenshot({ light, dark, alt, caption, maxWidth }: ScreenshotProps) {
	const sizes = maxWidth ? `${maxWidth}px` : "(min-width: 1024px) 760px, 100vw";
	return (
		<figure className="not-prose my-6" style={maxWidth ? { maxWidth } : undefined}>
			<div className="overflow-hidden rounded-lg border border-fd-border bg-fd-card">
				<Image
					src={light}
					alt={alt}
					sizes={sizes}
					className={dark ? "block h-auto w-full dark:hidden" : "block h-auto w-full"}
				/>
				{dark ? (
					<Image src={dark} alt={alt} sizes={sizes} className="hidden h-auto w-full dark:block" />
				) : null}
			</div>
			{caption ? (
				<figcaption className="mt-2 text-sm text-fd-muted-foreground">{caption}</figcaption>
			) : null}
		</figure>
	);
}

/** Lays out related captures side by side from the `sm` breakpoint (e.g. desktop + phone). */
export function ScreenshotGrid({
	children,
	columns = 2,
}: {
	children: ReactNode;
	columns?: 2 | 3;
}) {
	return (
		<div
			className={
				columns === 3
					? "not-prose my-6 grid items-start gap-4 sm:grid-cols-3"
					: "not-prose my-6 grid items-start gap-4 sm:grid-cols-2"
			}
		>
			{children}
		</div>
	);
}
