import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CSSProperties, ReactNode } from "react";

/**
 * Build-time token tables for the design-system docs. Everything here is read
 * from the app's own sources when the page renders (at `next build` for the
 * static export), so the docs cannot drift from them:
 *
 * - `apps/web/src/index.css` — semantic colors, radii, type scale, control sizes
 * - `packages/ui/src/themes.ts` — the public theme presets
 *
 * A token or selector that a page asks for but the source no longer has fails
 * the build with a message naming it, instead of rendering a stale value.
 * turbo.json (apps/docs) lists both files as build inputs.
 */

function sourceFile(relativeToRepo: string): string {
	// `next dev` / `next build` run from apps/docs; fall back to the repo root.
	const candidates = [
		path.join(process.cwd(), "../..", relativeToRepo),
		path.join(process.cwd(), relativeToRepo),
	];
	const found = candidates.find((candidate) => existsSync(candidate));
	if (!found) throw new Error(`design-tokens: cannot find ${relativeToRepo} from ${process.cwd()}`);
	return readFileSync(found, "utf8");
}

// ─── index.css ───────────────────────────────────────────────────────────────

type Declarations = Map<string, string>;

/** Split a declaration block on top-level semicolons (ignoring those inside parentheses or quotes). */
function parseDeclarations(body: string): Declarations {
	const out: Declarations = new Map();
	let depth = 0;
	let quote: string | null = null;
	let start = 0;
	const push = (end: number) => {
		const chunk = body.slice(start, end).trim();
		const colon = chunk.indexOf(":");
		if (colon > 0) out.set(chunk.slice(0, colon).trim(), chunk.slice(colon + 1).trim());
	};
	for (let i = 0; i < body.length; i++) {
		const ch = body[i];
		if (quote) {
			if (ch === quote) quote = null;
		} else if (ch === '"' || ch === "'") quote = ch;
		else if (ch === "(") depth++;
		else if (ch === ")") depth--;
		else if (ch === ";" && depth === 0) {
			push(i);
			start = i + 1;
		}
	}
	push(body.length);
	return out;
}

/**
 * Flatten the stylesheet into `prelude → declarations`. Nested at-rules are
 * prefixed with their parent's prelude, e.g. `@media (pointer: coarse) .admin-scope`.
 */
function parseRules(css: string): Map<string, Declarations> {
	const rules = new Map<string, Declarations>();
	const walk = (text: string, parents: string[]) => {
		let i = 0;
		while (i < text.length) {
			const open = text.indexOf("{", i);
			if (open === -1) return;
			const prelude = (text.slice(i, open).split(";").pop() ?? "").replace(/\s+/g, " ").trim();
			let depth = 1;
			let j = open + 1;
			while (j < text.length && depth > 0) {
				if (text[j] === "{") depth++;
				else if (text[j] === "}") depth--;
				j++;
			}
			const body = text.slice(open + 1, j - 1);
			const key = [...parents, prelude].join(" ");
			if (body.includes("{")) walk(body, [...parents, prelude]);
			else if (!rules.has(key)) rules.set(key, parseDeclarations(body));
			i = j;
		}
	};
	walk(css.replace(/\/\*[\s\S]*?\*\//g, ""), []);
	return rules;
}

let cssCache: Map<string, Declarations> | null = null;
function stylesheet(): Map<string, Declarations> {
	cssCache ??= parseRules(sourceFile("apps/web/src/index.css"));
	return cssCache;
}

function rule(selector: string): Declarations {
	const found = stylesheet().get(selector);
	if (!found) throw new Error(`design-tokens: apps/web/src/index.css has no "${selector}" rule`);
	return found;
}

/** Replace `var(--x)` / `var(--x, fallback)` from the given scopes (first match wins). */
function resolveVars(value: string, scopes: Declarations[], seen = new Set<string>()): string {
	return value.replace(
		/var\((--[\w-]+)\s*(?:,\s*([^)]+))?\)/g,
		(match, name: string, fallback?: string) => {
			if (seen.has(name)) return match;
			const raw = scopes.find((scope) => scope.has(name))?.get(name);
			if (raw === undefined) return fallback?.trim() ?? match;
			return resolveVars(raw, scopes, new Set([...seen, name]));
		},
	);
}

const remToPx = (value: string) => {
	const rem = /^(-?[\d.]+)rem$/.exec(value.trim());
	return rem ? `${Number(rem[1]) * 16}px` : value;
};

// ─── Presentation ────────────────────────────────────────────────────────────

function Swatch({ value }: { value: string }) {
	return (
		<span
			aria-hidden="true"
			className="inline-block size-5 shrink-0 rounded-[5px] border border-fd-border align-middle shadow-[inset_0_0_0_1px_rgb(0_0_0/0.04)]"
			style={{ background: value } as CSSProperties}
		/>
	);
}

/** Short values stay on one line; long ones (gradients, oklch with alpha) may wrap anywhere. */
const wrapClass = (value: string) =>
	value.length > 22 ? "[overflow-wrap:anywhere]" : "whitespace-nowrap";

function Value({ raw, resolved, note }: { raw: string; resolved: string; note?: string }) {
	const showResolved = resolved !== raw && !/var\(/.test(resolved);
	return (
		<span className="flex items-center gap-2">
			<Swatch value={resolved} />
			<span className="flex min-w-0 flex-col">
				<code className={wrapClass(raw)}>{raw}</code>
				{showResolved || note ? (
					<span className="text-xs text-fd-muted-foreground [overflow-wrap:anywhere]">
						{showResolved ? `= ${resolved}` : null}
						{showResolved && note ? " · " : null}
						{note ?? null}
					</span>
				) : null}
			</span>
		</span>
	);
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
	return (
		<div className="relative my-6 overflow-auto prose-no-margin">
			<table>
				<thead>
					<tr>
						{head.map((cell) => (
							<th key={cell}>{cell}</th>
						))}
					</tr>
				</thead>
				<tbody>{children}</tbody>
			</table>
		</div>
	);
}

// ─── Components ──────────────────────────────────────────────────────────────

type Row = readonly [token: string, use: string];

/**
 * Light/dark color table for one scope. `light` and `dark` are selectors as
 * written in index.css; a token the dark rule does not set inherits the light
 * value (both rules apply to the same element), which the table says.
 */
export function TokenTable({
	light,
	dark,
	rows,
	fallback,
}: {
	light: string;
	dark: string;
	rows: Row[];
	/** Extra scope to resolve var() references against (e.g. ":root, .public-scope"). */
	fallback?: string;
}) {
	const lightRule = rule(light);
	const darkRule = rule(dark);
	const extra = fallback ? [rule(fallback)] : [];
	return (
		<Table head={["Token", "Light", "Dark", "Use"]}>
			{rows.map(([token, use]) => {
				const lightRaw = lightRule.get(token);
				if (lightRaw === undefined) {
					throw new Error(`design-tokens: "${light}" in index.css no longer sets ${token}`);
				}
				const darkOwn = darkRule.get(token);
				const darkRaw = darkOwn ?? lightRaw;
				return (
					<tr key={token}>
						<td>
							<code className="whitespace-nowrap">{token}</code>
						</td>
						<td>
							<Value raw={lightRaw} resolved={resolveVars(lightRaw, [lightRule, ...extra])} />
						</td>
						<td>
							<Value
								raw={darkRaw}
								resolved={resolveVars(darkRaw, [darkRule, lightRule, ...extra])}
								note={darkOwn === undefined ? "inherits light" : undefined}
							/>
						</td>
						<td>{use}</td>
					</tr>
				);
			})}
		</Table>
	);
}

const RADIUS_STEPS = ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "pill"] as const;

/** The radius scale: global `@theme`, then the `.admin-scope` and `.public-scope` overrides. */
export function RadiusScale() {
	const base = rule("@theme");
	const admin = rule(".admin-scope");
	const publicScope = rule(".public-scope");
	const cell = (scope: Declarations, step: string) => {
		const own = scope.get(`--radius-${step}`);
		const value = own ?? base.get(`--radius-${step}`);
		if (value === undefined) return "—";
		const px = value === "9999px" ? "9999px (full)" : remToPx(value);
		return own === undefined && scope !== base ? `${px} (inherits)` : px;
	};
	return (
		<Table head={["Utility", "Global @theme", ".admin-scope", ".public-scope"]}>
			{RADIUS_STEPS.map((step) => {
				if (!base.has(`--radius-${step}`)) {
					throw new Error(`design-tokens: @theme in index.css no longer sets --radius-${step}`);
				}
				return (
					<tr key={step}>
						<td>
							<code className="whitespace-nowrap">rounded-{step}</code>
						</td>
						<td>{cell(base, step)}</td>
						<td>{cell(admin, step)}</td>
						<td>{cell(publicScope, step)}</td>
					</tr>
				);
			})}
		</Table>
	);
}

const TYPE_STEPS = ["h1", "h2", "body", "small", "micro"] as const;

/** The fluid `text-*` roles from `@theme inline`, with the clamp() bounds in px. */
export function TypeScale() {
	const theme = rule("@theme inline");
	return (
		<Table head={["Utility", "Range", "Line height", "Tracking", "Declared size"]}>
			{TYPE_STEPS.map((step) => {
				const size = theme.get(`--text-${step}`);
				if (!size) throw new Error(`design-tokens: @theme inline no longer sets --text-${step}`);
				const bounds = /^clamp\(\s*([\d.]+rem)\s*,.*,\s*([\d.]+rem)\s*\)$/.exec(size);
				const range =
					bounds?.[1] && bounds[2] ? `${remToPx(bounds[1])}–${remToPx(bounds[2])}` : size;
				return (
					<tr key={step}>
						<td>
							<code className="whitespace-nowrap">text-{step}</code>
						</td>
						<td className="whitespace-nowrap">{range}</td>
						<td>{theme.get(`--text-${step}--line-height`) ?? "—"}</td>
						<td>{theme.get(`--text-${step}--letter-spacing`) ?? "—"}</td>
						<td>
							<code className={wrapClass(size)}>{size}</code>
						</td>
					</tr>
				);
			})}
		</Table>
	);
}

const CONTROL_TOKENS = [
	["--control-height", "Button default, icon"],
	["--control-height-compact", "Button sm, xs, icon-sm, icon-xs"],
	["--control-height-large", "Button lg, icon-lg"],
	["--control-font-size", "Button text from md"],
] as const;

/** Control-size tokens: `.admin-scope`, its coarse-pointer override and the `.public-scope` reset. */
export function ControlScale() {
	const admin = rule(".admin-scope");
	const coarse = rule("@media (pointer: coarse) .admin-scope");
	const publicScope = rule(".public-scope");
	return (
		<Table head={["Token", ".admin-scope", "Coarse pointer", ".public-scope", "Read by"]}>
			{CONTROL_TOKENS.map(([token, use]) => {
				const value = admin.get(token);
				if (!value) throw new Error(`design-tokens: .admin-scope no longer sets ${token}`);
				const coarseValue = coarse.get(token);
				return (
					<tr key={token}>
						<td>
							<code className="whitespace-nowrap">{token}</code>
						</td>
						<td>{remToPx(value)}</td>
						<td>{coarseValue ? remToPx(coarseValue) : "unchanged"}</td>
						<td>
							<code>{publicScope.get(token) ?? "—"}</code>
						</td>
						<td>{use}</td>
					</tr>
				);
			})}
		</Table>
	);
}

// ─── themes.ts ───────────────────────────────────────────────────────────────

interface Preset {
	name: string;
	label: string;
	description: string;
	light: Record<string, string>;
	dark: Record<string, string>;
}

function vars(block: string): Record<string, string> {
	return Object.fromEntries(
		[...block.matchAll(/"(--ld-[\w-]+)"\s*:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
	);
}

let presetCache: Preset[] | null = null;
function presets(): Preset[] {
	if (presetCache) return presetCache;
	const source = sourceFile("packages/ui/src/themes.ts");
	const pattern =
		/name:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*description:\s*"([^"]+)",\s*cssVars:\s*\{\s*light:\s*\{([^}]*)\},\s*dark:\s*\{([^}]*)\}/g;
	const parsed = [...source.matchAll(pattern)].map((m) => ({
		name: m[1] ?? "",
		label: m[2] ?? "",
		description: m[3] ?? "",
		light: vars(m[4] ?? ""),
		dark: vars(m[5] ?? ""),
	}));
	const declared = source.match(/^\t\tname:/gm)?.length ?? 0;
	if (parsed.length === 0 || parsed.length !== declared) {
		throw new Error(
			`design-tokens: parsed ${parsed.length} of ${declared} presets in packages/ui/src/themes.ts; update the parser`,
		);
	}
	presetCache = parsed;
	return parsed;
}

function Chip({ value }: { value: string | undefined }) {
	if (!value) return <span>—</span>;
	return (
		<span className="flex items-center gap-1.5">
			<Swatch value={value} />
			<span className="whitespace-nowrap font-mono text-xs">{value}</span>
		</span>
	);
}

/** Every public preset with the colors that differ between presets. */
export function PresetPalette() {
	return (
		<Table
			head={[
				"Preset",
				"Light primary",
				"Light accent",
				"Light ground",
				"Dark primary",
				"Dark accent",
			]}
		>
			{presets().map((preset) => (
				<tr key={preset.name}>
					<td>
						<span className="flex flex-col">
							<strong className="whitespace-nowrap">{preset.label}</strong>
							<span className="whitespace-nowrap font-mono text-xs text-fd-muted-foreground">
								{preset.name}
							</span>
						</span>
					</td>
					<td>
						<Chip value={preset.light["--ld-primary"]} />
					</td>
					<td>
						<Chip value={preset.light["--ld-accent"]} />
					</td>
					<td>
						<Chip value={preset.light["--ld-background"]} />
					</td>
					<td>
						<Chip value={preset.dark["--ld-primary"]} />
					</td>
					<td>
						<Chip value={preset.dark["--ld-accent"]} />
					</td>
				</tr>
			))}
		</Table>
	);
}

/** One preset's full light and dark variable set (the ten `--ld-*` roles). */
export function PresetVars({ name }: { name: string }) {
	const preset = presets().find((p) => p.name === name);
	if (!preset) throw new Error(`design-tokens: no preset named "${name}" in themes.ts`);
	return (
		<Table head={["Variable", "Light", "Dark"]}>
			{Object.keys(preset.light).map((key) => (
				<tr key={key}>
					<td>
						<code className="whitespace-nowrap">{key}</code>
					</td>
					<td>
						<Chip value={preset.light[key]} />
					</td>
					<td>
						<Chip value={preset.dark[key]} />
					</td>
				</tr>
			))}
		</Table>
	);
}

/** Dark values shared by every preset (the neutral dark surfaces), computed from themes.ts. */
export function SharedDarkSurfaces() {
	const all = presets();
	const first = all[0];
	if (!first) return null;
	const shared = Object.keys(first.dark).filter((key) =>
		all.every((preset) => preset.dark[key] === first.dark[key]),
	);
	return (
		<Table head={["Variable", `Dark value in all ${all.length} presets`]}>
			{shared.map((key) => (
				<tr key={key}>
					<td>
						<code className="whitespace-nowrap">{key}</code>
					</td>
					<td>
						<Chip value={first.dark[key]} />
					</td>
				</tr>
			))}
		</Table>
	);
}
