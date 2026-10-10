import { socialBrandMap } from "@linkden/ui/social-brands";
import { dynamicIconImports } from "lucide-react/dynamic";
import type { IconNode, ResolvedBlockIcon } from "@/components/public/block-icon";

// SERVER ONLY (app/page.tsx). Resolves block icons to plain SVG data so the
// public page ships neither the lucide dynamic-import map nor the
// social-brand catalog (~78 KB gzip) and icons render in the SSR HTML instead
// of popping in after hydration. Importing this from a client component would
// put both tables right back in the bundle.

// Each `dynamicIconImports` loader resolves to the icon module, which exports
// its element list as `__iconData.node` (what lucide's own DynamicIcon reads).
type LucideIconModule = { __iconData?: { node?: IconNode[] } };

/** `brand:<slug>` → brand path, `lucide:<name>` / bare name → lucide nodes, else null. */
export async function resolveBlockIcon(icon: string | null): Promise<ResolvedBlockIcon | null> {
	if (!icon) return null;
	if (icon.startsWith("brand:")) {
		const brand = socialBrandMap.get(icon.slice("brand:".length));
		return brand ? { kind: "path", d: brand.svgPath } : null;
	}
	const name = icon.startsWith("lucide:") ? icon.slice("lucide:".length) : icon;
	if (!Object.hasOwn(dynamicIconImports, name)) return null;
	try {
		const load = dynamicIconImports[name as keyof typeof dynamicIconImports];
		const mod = (await load()) as unknown as LucideIconModule;
		const node = mod.__iconData?.node;
		return node ? { kind: "lucide", node } : null;
	} catch {
		return null;
	}
}

/** Adds `iconSvg` to every block (null when it has no / an unknown icon). */
export async function withResolvedIcons<T extends { icon: string | null }>(
	blocks: T[],
): Promise<Array<T & { iconSvg: ResolvedBlockIcon | null }>> {
	return Promise.all(blocks.map(async (b) => ({ ...b, iconSvg: await resolveBlockIcon(b.icon) })));
}
