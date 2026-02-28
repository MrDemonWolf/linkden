"use client";

import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CustomCssSection({
	customCss,
	onCustomCssChange,
}: {
	customCss: string;
	onCustomCssChange: (value: string) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle>Custom CSS</CardTitle>
				</h2>
			</CardHeader>
			<CardContent className="space-y-3">
				<textarea
					value={customCss}
					onChange={(e) => onCustomCssChange(e.target.value)}
					rows={8}
					placeholder={"/* Add custom CSS for your public page */\n.ld-link-block {\n  border-radius: 20px;\n}"}
					className="dark:bg-input/30 border-input w-full rounded-lg border bg-transparent backdrop-blur-sm px-3 py-2 font-mono text-xs outline-none"
					aria-label="Custom CSS for public page"
				/>
				<details className="text-xs text-muted-foreground">
					<summary className="flex cursor-pointer items-center gap-1.5 font-medium hover:text-foreground">
						<Info className="h-3.5 w-3.5" />
						Available CSS classes & variables
					</summary>
					<div className="mt-2 space-y-3 rounded-lg border p-3">
						<div>
							<p className="mb-1 font-medium text-foreground">CSS Classes</p>
							<div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
								<span>.ld-page</span><span className="text-muted-foreground">Page container</span>
								<span>.ld-profile</span><span className="text-muted-foreground">Profile/header section</span>
								<span>.ld-avatar</span><span className="text-muted-foreground">Profile avatar</span>
								<span>.ld-bio</span><span className="text-muted-foreground">Bio text</span>
								<span>.ld-blocks</span><span className="text-muted-foreground">Blocks container</span>
								<span>.ld-link-block</span><span className="text-muted-foreground">Link buttons</span>
								<span>.ld-header-block</span><span className="text-muted-foreground">Header/divider blocks</span>
								<span>.ld-social-block</span><span className="text-muted-foreground">Social icons row</span>
								<span>.ld-embed-block</span><span className="text-muted-foreground">Embed blocks</span>
								<span>.ld-contact-block</span><span className="text-muted-foreground">Contact form</span>
								<span>.ld-footer</span><span className="text-muted-foreground">Branding footer</span>
							</div>
						</div>
						<div>
							<p className="mb-1 font-medium text-foreground">CSS Variables</p>
							<div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
								<span>--ld-primary</span><span className="text-muted-foreground">Primary color</span>
								<span>--ld-accent</span><span className="text-muted-foreground">Accent color</span>
								<span>--ld-background</span><span className="text-muted-foreground">Page background</span>
								<span>--ld-foreground</span><span className="text-muted-foreground">Text color</span>
								<span>--ld-card</span><span className="text-muted-foreground">Card background</span>
								<span>--ld-border</span><span className="text-muted-foreground">Border color</span>
								<span>--ld-muted</span><span className="text-muted-foreground">Muted background</span>
								<span>--ld-radius</span><span className="text-muted-foreground">Border radius</span>
							</div>
						</div>
					</div>
				</details>
			</CardContent>
		</Card>
	);
}
