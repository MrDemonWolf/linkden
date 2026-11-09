import type * as React from "react";

import { cn } from "@/lib/utils";

function Card({
	className,
	size = "default",
	...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
	return (
		<div
			data-slot="card"
			data-size={size}
			className={cn(
				// Matte admin surface on the card plane: hairline edge + `--shadow-surface`
				// (a whisper in light, none in dark — no backdrop blur on this plane).
				// `--shadow-card` is reserved for the phone frame.
				"bg-card text-card-foreground border border-border shadow-surface gap-5 overflow-hidden rounded-lg py-5 text-sm/relaxed has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-4 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-lg *:[img:last-child]:rounded-lg group/card flex flex-col",
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				"gap-1 px-4 sm:px-5 group-data-[size=sm]/card:px-4 [.border-b]:pb-5 group-data-[size=sm]/card:[.border-b]:pb-4 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
				className,
			)}
			{...props}
		/>
	);
}

function CardTitle({
	as: Heading = "h2",
	className,
	...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
	return (
		<Heading
			data-slot="card-title"
			className={cn("block text-base font-semibold", className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-content"
			className={cn("px-4 sm:px-5 group-data-[size=sm]/card:px-4", className)}
			{...props}
		/>
	);
}

export { Card, CardContent, CardHeader, CardTitle };
