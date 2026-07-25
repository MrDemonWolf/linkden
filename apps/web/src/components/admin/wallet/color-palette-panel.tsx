"use client";

import { ColorField } from "@/components/admin/color-field";

export interface WalletPalette {
	name: string;
	bg: string;
	fg: string;
	label: string;
}

// Curated palettes — one tap sets background/foreground/label together.
export const WALLET_PALETTES: WalletPalette[] = [
	{ name: "Midnight", bg: "#0E1116", fg: "#FFFFFF", label: "#3AD2A6" },
	{ name: "Navy", bg: "#091533", fg: "#FFFFFF", label: "#0FACED" },
	{ name: "Indigo", bg: "#241A52", fg: "#FFFFFF", label: "#C7B6FF" },
	{ name: "Graphite", bg: "#17181A", fg: "#F5F5F5", label: "#C0C0C0" },
	{ name: "Forest", bg: "#10241C", fg: "#F2FBF6", label: "#6FE0B4" },
	{ name: "Ocean", bg: "#04283A", fg: "#EAF6FF", label: "#38C6E8" },
	{ name: "Wine", bg: "#2A0F1B", fg: "#FBE9F0", label: "#E6779F" },
	{ name: "Slate", bg: "#1C2530", fg: "#FFFFFF", label: "#7FB4E8" },
	{ name: "Sand", bg: "#F4EFE6", fg: "#241F1A", label: "#B56A2E" },
	{ name: "Coral", bg: "#FBF3EF", fg: "#3A1E14", label: "#D85A30" },
	{ name: "Paper", bg: "#FAFAF7", fg: "#1A1A1A", label: "#3B6D11" },
	{ name: "Blush", bg: "#FBEAF0", fg: "#3A1526", label: "#B23A5F" },
];

const eqColor = (a: string, b: string) => (a || "").toUpperCase() === b.toUpperCase();

interface ColorPalettePanelProps {
	bg: string;
	fg: string;
	label: string;
	onPick: (p: WalletPalette) => void;
	onFgChange: (value: string) => void;
	onLabelChange: (value: string) => void;
}

/**
 * "Colors and Palettes" panel — iOS-Wallet-style three-segment palette pills
 * plus custom foreground/label fields. The background color itself is edited
 * on the Background tab; a palette pick still sets all three at once.
 */
export function ColorPalettePanel({
	bg,
	fg,
	label,
	onPick,
	onFgChange,
	onLabelChange,
}: ColorPalettePanelProps) {
	return (
		<div className="space-y-5">
			<div className="space-y-2">
				<h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
					Colors and Palettes
				</h3>
				<div role="radiogroup" aria-label="Color palettes" className="grid grid-cols-3 gap-2">
					{WALLET_PALETTES.map((p) => {
						const active = eqColor(bg, p.bg) && eqColor(fg, p.fg) && eqColor(label, p.label);
						return (
							<button
								key={p.name}
								type="button"
								role="radio"
								aria-checked={active}
								aria-label={p.name}
								title={p.name}
								onClick={() => onPick(p)}
								className={`flex h-11 min-h-11 overflow-hidden rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
									active
										? "ring-2 ring-primary ring-offset-2 ring-offset-background"
										: "ring-1 ring-border/60 hover:ring-border"
								}`}
							>
								<span className="flex-1" style={{ backgroundColor: p.bg }} />
								<span className="flex-1" style={{ backgroundColor: p.fg }} />
								<span className="flex-1" style={{ backgroundColor: p.label }} />
							</button>
						);
					})}
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
					Custom
				</h3>
				<div className="grid grid-cols-2 gap-3">
					<ColorField
						id="w-fg"
						label="Foreground"
						value={fg}
						onChange={onFgChange}
						placeholder="#FFFFFF"
						contrastAgainst={bg ? { hex: bg, label: "pass background" } : undefined}
					/>
					<ColorField
						id="w-label"
						label="Label"
						value={label}
						onChange={onLabelChange}
						placeholder="#0FACED"
						contrastAgainst={bg ? { hex: bg, label: "pass background" } : undefined}
					/>
				</div>
			</div>
		</div>
	);
}
