"use client";

import { Shapes, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SocialIconShape = "circle" | "rounded-square";

const OPTIONS: Array<{
	value: SocialIconShape;
	label: string;
	description: string;
	radius: string;
}> = [
	{
		value: "circle",
		label: "Circle",
		description: "Pill-rounded social icons",
		radius: "rounded-full",
	},
	{
		value: "rounded-square",
		label: "Rounded square",
		description: "Soft-cornered tiles",
		radius: "rounded-lg",
	},
];

export function SocialIconShapeSection({
	shape,
	onShapeChange,
}: {
	shape: SocialIconShape;
	onShapeChange: (value: SocialIconShape) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<Shapes className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Social icon shape
					</CardTitle>
				</h2>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-2.5">
					{OPTIONS.map((opt) => {
						const selected = shape === opt.value;
						return (
							<button
								key={opt.value}
								type="button"
								aria-pressed={selected}
								aria-label={opt.label}
								onClick={() => onShapeChange(opt.value)}
								className={cn(
									"group relative flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
									selected
										? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
										: "border-border/50 hover:border-border",
								)}
							>
								{selected && (
									<span className="absolute right-2 top-2 text-primary">
										<Check className="h-3.5 w-3.5" aria-hidden="true" />
									</span>
								)}
								<div className="flex items-center justify-center gap-1.5 py-1">
									{[0, 1, 2].map((i) => (
										<span
											key={i}
											className={cn(
												"h-5 w-5 border transition-colors",
												opt.radius,
												selected
													? "border-primary/60 bg-primary/15"
													: "border-muted-foreground/40 bg-muted/40",
											)}
										/>
									))}
								</div>
								<div className="space-y-0.5">
									<div className="text-xs font-medium">{opt.label}</div>
									<div className="text-micro text-muted-foreground leading-tight">
										{opt.description}
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
