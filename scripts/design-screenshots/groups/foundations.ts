// ─── Foundations captures ────────────────────────────────────────────────────
// Images for apps/docs/content/docs/design-system/foundations.mdx: the token
// map, light/dark surfaces, typography in context, control sizes, radii, focus
// rings and the public theme presets as the Design preview renders them.
//
// Every measurement label is computed in the browser from getComputedStyle at
// capture time (token names are matched against the resolved custom
// properties), so a label can never disagree with the stylesheet it shows.
// The labels are a docs overlay drawn in fuchsia (#C026D3), a colour the app
// itself never uses.
//
// Read-only: presets are picked in Design → Theme without saving and the form
// is discarded afterwards. Nothing is saved, applied or toggled.
//
// FOUNDATIONS_ONLY=<prefix>[,<prefix>] limits a run to shots whose names start
// with one of the prefixes (handy while retaking a single image).

import type { Locator, Page } from "@playwright/test";
import { type CaptureContext, env, type Scheme } from "../lib";

const SCHEMES: Scheme[] = ["light", "dark"];

const only = (env("FOUNDATIONS_ONLY") ?? "")
	.split(",")
	.map((value) => value.trim())
	.filter(Boolean);
const wanted = (name: string) =>
	only.length === 0 || only.some((prefix) => name.startsWith(prefix));

/** Presets rendered in the catalogue (labels as the Theme Presets card names them). */
const PRESET_SHOTS = [
	{ label: "Classic", slug: "classic" },
	{ label: "Graphite", slug: "graphite" },
	{ label: "Ocean Blue", slug: "ocean-blue" },
	{ label: "Sunset", slug: "sunset" },
	{ label: "Forest", slug: "forest" },
	{ label: "Abyssal", slug: "abyssal" },
] as const;

/** Radius utilities by computed px, per scope (index.css `@theme` and `.admin-scope`). */
const ADMIN_RADII: Record<string, string> = {
	"6": "rounded-sm",
	"8": "rounded-md",
	"12": "rounded-lg",
	"16": "rounded-xl",
	"20": "rounded-2xl",
	"32": "rounded-3xl",
};
const PUBLIC_RADII: Record<string, string> = {
	"8": "rounded-sm",
	"12": "rounded-md",
	"18": "rounded-lg",
	"24": "rounded-xl",
	"28": "rounded-2xl",
	"32": "rounded-3xl",
};

type Box = { x: number; y: number; width: number; height: number };

async function boxOf(locator: Locator): Promise<Box> {
	const box = await locator.boundingBox();
	if (!box) throw new Error(`not visible: ${locator}`);
	return box;
}

function union(boxes: Box[]): Box {
	const x = Math.min(...boxes.map((b) => b.x));
	const y = Math.min(...boxes.map((b) => b.y));
	const right = Math.max(...boxes.map((b) => b.x + b.width));
	const bottom = Math.max(...boxes.map((b) => b.y + b.height));
	return { x, y, width: right - x, height: bottom - y };
}

const frames = (page: Page) =>
	page.evaluate(
		() =>
			new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
	);

/**
 * Scroll so the union of `parts` sits in the middle of the viewport, then
 * return a viewport clip around it with `pad` CSS px on every side. Optional
 * `horizontal` overrides the left/right edges (absolute viewport x values).
 */
async function regionClip(
	page: Page,
	parts: Locator[],
	pad = 16,
	horizontal?: { left: number; right: number },
): Promise<Box> {
	const first = parts[0];
	if (!first) throw new Error("regionClip needs at least one locator");
	await first.evaluate((el) => el.scrollIntoView({ block: "start" }));
	const before = union(await Promise.all(parts.map(boxOf)));
	const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
	await page.evaluate(
		(delta) => window.scrollBy(0, delta),
		before.y + before.height / 2 - viewport.height / 2,
	);
	await frames(page);
	const area = union(await Promise.all(parts.map(boxOf)));
	const left = horizontal ? horizontal.left : area.x - pad;
	const right = horizontal ? horizontal.right : area.x + area.width + pad;
	const x = Math.max(0, Math.floor(left));
	const y = Math.max(0, Math.floor(area.y - pad));
	return {
		x,
		y,
		width: Math.min(viewport.width, Math.ceil(right)) - x,
		height: Math.min(viewport.height, Math.ceil(area.y + area.height + pad)) - y,
	};
}

// ─── Annotation overlay ──────────────────────────────────────────────────────

type Place =
	| "right"
	| "left"
	| "above"
	| "below"
	| "text-right"
	| "inside-r"
	| "inside-tl"
	| "inside-tr"
	| "inside-bl"
	| "below-r"
	| "at";

interface Mark {
	target: Locator;
	/** font: family/weight/size · radius: border-radius · token: matching custom property · height: px · text: fixed. */
	kind: "font" | "radius" | "token" | "height" | "text";
	text?: string;
	prop?: "background-color" | "color" | "border-top-color";
	/** Candidate custom properties, in preference order (first match wins). */
	tokens?: string[];
	radii?: Record<string, string>;
	place?: Place;
	/** Viewport position of the tag's top-left corner when place is "at". */
	at?: { x: number; y: number };
	dx?: number;
	dy?: number;
	outline?: boolean;
	leader?: boolean;
	prefix?: string;
	/** Elbow leader: up from the tag at this viewport x, then across to the text's left edge. */
	elbowX?: number;
	suffix?: string;
}

/**
 * Draw measurement tags over the page (a fixed layer above everything). Each
 * label is derived from the element's computed style. Returns the labels so
 * the run log shows what was measured.
 */
async function annotate(page: Page, marks: Mark[], tagSize = 13): Promise<string[]> {
	await clearAnnotations(page);
	for (const [index, mark] of marks.entries()) {
		await mark.target.evaluate((el, id) => el.setAttribute("data-ds-mark", String(id)), index);
	}
	const items = marks.map(({ target: _target, ...rest }, id) => ({ id, tagSize, ...rest }));
	const labels = await page.evaluate((specs) => {
		const ACCENT = "#C026D3";
		const layer = document.createElement("div");
		layer.id = "ds-annotations";
		layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("width", String(window.innerWidth));
		svg.setAttribute("height", String(window.innerHeight));
		svg.style.cssText = "position:fixed;inset:0;overflow:visible";
		layer.append(svg);
		document.body.append(layer);

		const transparent = (c: string) => c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
		const effective = (el: Element, prop: string) => {
			let node: Element | null = el;
			while (node) {
				const value = getComputedStyle(node).getPropertyValue(prop);
				if (prop !== "background-color" || !transparent(value)) return { value, node };
				node = node.parentElement;
			}
			return { value: "", node: el };
		};
		const resolve = (host: Element, token: string) => {
			const probe = document.createElement("span");
			probe.style.cssText = `position:absolute;visibility:hidden;color:var(${token})`;
			(host.parentElement ?? host).append(probe);
			const color = getComputedStyle(probe).color;
			probe.remove();
			return color;
		};
		const family = (el: Element) =>
			(getComputedStyle(el).fontFamily.split(",")[0] ?? "")
				.trim()
				.replace(/^["']|["']$/g, "")
				.replace(/^__/, "")
				.replace(/_[0-9a-f]{5,}$/i, "")
				.replace(/_/g, " ");
		const textRect = (el: Element) => {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
				return el.getBoundingClientRect();
			}
			const range = document.createRange();
			range.selectNodeContents(el);
			const rect = range.getBoundingClientRect();
			return rect.width > 0 ? rect : el.getBoundingClientRect();
		};

		const out: string[] = [];
		for (const spec of specs) {
			const el = document.querySelector(`[data-ds-mark="${spec.id}"]`);
			if (!el) {
				out.push(`#${spec.id}: missing`);
				continue;
			}
			const style = getComputedStyle(el);
			let label = spec.text ?? "";
			if (spec.kind === "font") {
				const size = Number.parseFloat(style.fontSize);
				label = `${family(el)} ${style.fontWeight} · ${Number(size.toFixed(1))}px`;
			} else if (spec.kind === "radius") {
				const raw = style.borderTopLeftRadius;
				const px = Number.parseFloat(raw);
				if (raw.endsWith("%") || px > 999) label = "rounded-full";
				else {
					const name = spec.radii?.[String(Math.round(px))];
					label = name ? `${name} · ${Math.round(px)}px` : `${Math.round(px)}px`;
				}
			} else if (spec.kind === "height") {
				label = `${Math.round(el.getBoundingClientRect().height)}px`;
			} else if (spec.kind === "token") {
				const prop = spec.prop ?? "background-color";
				const { value, node } = effective(el, prop);
				const match = (spec.tokens ?? []).find((token) => resolve(node, token) === value);
				label = match ?? `? ${value}`;
			}
			label = `${spec.prefix ?? ""}${label}${spec.suffix ?? ""}`;
			out.push(label);
			const outlineOnly = spec.kind === "text" && label === "";

			const rect = el.getBoundingClientRect();
			const text = spec.kind === "font" || spec.place === "text-right" ? textRect(el) : rect;
			if (spec.outline) {
				const outline = document.createElement("div");
				const radius = Math.min(12, rect.height / 2);
				outline.style.cssText = `position:fixed;left:${rect.left - 3}px;top:${rect.top - 3}px;width:${rect.width + 6}px;height:${rect.height + 6}px;border:1.5px dashed ${ACCENT};border-radius:${radius}px`;
				layer.append(outline);
			}
			if (outlineOnly) continue;
			const tag = document.createElement("div");
			tag.textContent = label;
			tag.style.cssText = `position:fixed;left:0;top:0;padding:2px 7px;border-radius:6px;background:${ACCENT};color:#fff;font:600 ${spec.tagSize}px/${spec.tagSize + 4}px ui-sans-serif,system-ui,-apple-system,sans-serif;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.25)`;
			layer.append(tag);
			const w = tag.offsetWidth;
			const h = tag.offsetHeight;
			const midY = (r: DOMRect) => r.top + r.height / 2 - h / 2;
			let left = 0;
			let top = 0;
			switch (spec.place ?? "right") {
				case "right":
					left = rect.right + 10;
					top = midY(rect);
					break;
				case "left":
					left = rect.left - 10 - w;
					top = midY(rect);
					break;
				case "above":
					left = rect.right - w;
					top = rect.top - h - 5;
					break;
				case "below":
					left = rect.left;
					top = rect.bottom + 5;
					break;
				case "below-r":
					left = rect.right - w;
					top = rect.bottom + 5;
					break;
				case "text-right":
					left = text.right + 10;
					top = midY(text);
					break;
				case "inside-r":
					left = rect.right - w - 10;
					top = midY(rect);
					break;
				case "inside-tl":
					left = rect.left + 10;
					top = rect.top + 10;
					break;
				case "inside-tr":
					left = rect.right - w - 10;
					top = rect.top + 10;
					break;
				case "inside-bl":
					left = rect.left + 10;
					top = rect.bottom - h - 10;
					break;
				case "at":
					left = spec.at?.x ?? 0;
					top = spec.at?.y ?? 0;
					break;
			}
			left += spec.dx ?? 0;
			top += spec.dy ?? 0;
			tag.style.left = `${left}px`;
			tag.style.top = `${top}px`;

			if (spec.elbowX !== undefined) {
				const ty = text.top + text.height / 2;
				const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
				path.setAttribute(
					"points",
					`${spec.elbowX},${top} ${spec.elbowX},${ty} ${text.left - 3},${ty}`,
				);
				path.setAttribute("fill", "none");
				path.setAttribute("stroke", ACCENT);
				path.setAttribute("stroke-width", "1.5");
				const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
				dot.setAttribute("cx", String(text.left - 3));
				dot.setAttribute("cy", String(ty));
				dot.setAttribute("r", "3");
				dot.setAttribute("fill", ACCENT);
				dot.setAttribute("stroke", "#fff");
				dot.setAttribute("stroke-width", "1");
				svg.append(path, dot);
			}
			if (spec.leader) {
				// From the tag edge nearest the target to the nearest point of the target.
				const cx = left + w / 2;
				const cy = top + h / 2;
				const tx = Math.min(Math.max(cx, text.left + 2), text.right - 2);
				const ty = Math.min(Math.max(cy, text.top + 2), text.bottom - 2);
				const sx = Math.min(Math.max(tx, left), left + w);
				const sy = Math.min(Math.max(ty, top), top + h);
				const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
				line.setAttribute("x1", String(sx));
				line.setAttribute("y1", String(sy));
				line.setAttribute("x2", String(tx));
				line.setAttribute("y2", String(ty));
				line.setAttribute("stroke", ACCENT);
				line.setAttribute("stroke-width", "1.5");
				const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
				dot.setAttribute("cx", String(tx));
				dot.setAttribute("cy", String(ty));
				dot.setAttribute("r", "3");
				dot.setAttribute("fill", ACCENT);
				dot.setAttribute("stroke", "#fff");
				dot.setAttribute("stroke-width", "1");
				svg.append(line, dot);
			}
		}
		return out;
	}, items);
	return labels;
}

async function clearAnnotations(page: Page): Promise<void> {
	await page.evaluate(() => {
		document.getElementById("ds-annotations")?.remove();
		for (const el of document.querySelectorAll("[data-ds-mark]"))
			el.removeAttribute("data-ds-mark");
	});
}

const log = (name: string, labels: string[]) => console.log(`    ${name}: ${labels.join(" | ")}`);

// ─── Captures ────────────────────────────────────────────────────────────────

export async function capture(ctx: CaptureContext): Promise<void> {
	// ── Token map: Links in both schemes, labels resolved from the CSS ──────
	for (const scheme of SCHEMES) {
		const name = `token-map-${scheme}`;
		if (!wanted(name)) continue;
		const page = await ctx.page({ device: "element", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links");
		const main = page.locator("main");
		const sidebar = page.locator('[data-slot="sidebar-inner"]');
		const active = sidebar.locator('[aria-current="page"]');
		const inboxBadge = sidebar.locator('[data-slot="sidebar-menu-badge"]');
		const topBar = page
			.locator("header")
			.filter({ has: page.locator('[data-slot="sidebar-trigger"]') });
		const heading = main.getByRole("heading", { level: 1 }).first();
		const chips = main.getByRole("group", { name: "Filter blocks" });
		const pressed = chips.locator('[aria-pressed="true"]');
		const apply = main.getByRole("button", { name: /Apply \d+ new/ });
		const row1 = main.getByRole("button", { name: "Reorder Latest work" }).locator("xpath=..");
		const row3 = main.getByRole("button", { name: "Reorder Portfolio" }).locator("xpath=..");
		const subtitle = row1.locator("span.text-micro");
		const toggle = row1.getByRole("switch");
		const rowBox = await boxOf(row1);
		const row3Box = await boxOf(row3);
		const headingBox = await boxOf(heading);
		const labels = await annotate(page, [
			{
				target: sidebar,
				kind: "token",
				tokens: ["--sidebar", "--card"],
				place: "at",
				at: { x: 16, y: 372 },
			},
			{
				target: active,
				kind: "token",
				tokens: ["--sidebar-accent", "--accent"],
				place: "inside-r",
				dx: 4,
			},
			{
				target: inboxBadge,
				kind: "token",
				tokens: ["--sidebar-primary", "--primary"],
				place: "left",
				dx: -4,
			},
			{
				target: topBar,
				kind: "token",
				tokens: ["--card"],
				place: "at",
				at: { x: 600, y: 22 },
			},
			{
				target: main,
				kind: "token",
				tokens: ["--background"],
				place: "at",
				at: { x: 560, y: headingBox.y + headingBox.height / 2 - 10 },
			},
			{
				target: pressed,
				kind: "token",
				tokens: ["--surface-2", "--secondary", "--muted"],
				place: "at",
				at: { x: rowBox.x + 260, y: headingBox.y + headingBox.height + 104 },
				leader: true,
			},
			{
				target: apply,
				kind: "token",
				tokens: ["--primary"],
				place: "left",
			},
			{
				target: row3,
				kind: "token",
				tokens: ["--card"],
				place: "at",
				at: { x: rowBox.x + 330, y: row3Box.y + row3Box.height / 2 - 10 },
				suffix: " · hairlines --border",
			},
			{
				target: subtitle,
				kind: "token",
				prop: "color",
				tokens: ["--muted-foreground"],
				prefix: "text ",
				place: "text-right",
			},
			{
				target: toggle,
				kind: "token",
				tokens: ["--primary"],
				place: "left",
			},
		]);
		log(name, labels);
		const bottom = row3Box.y + row3Box.height + 16;
		await ctx.shot(page, {
			name,
			description: `Links at 1440px (${scheme}) with token labels resolved from the computed styles: sidebar, top bar, ground, card rows, pressed chip, primary actions and muted text`,
			clip: {
				x: 0,
				y: 0,
				width: Math.ceil(rowBox.x + rowBox.width + 16),
				height: Math.ceil(bottom),
			},
		});
		await clearAnnotations(page);
	}

	// ── Light vs dark: one composite of the same view ────────────────────────
	if (wanted("surfaces-split")) {
		const halves: string[] = [];
		for (const scheme of SCHEMES) {
			const page = await ctx.page({ device: "desktop", scheme, signedIn: true });
			await ctx.goto(page, "/admin/settings");
			const png = await page.screenshot({ animations: "disabled", caret: "hide" });
			halves.push(`data:image/png;base64,${png.toString("base64")}`);
		}
		const canvas = await ctx.page({ device: "desktop", scheme: "light" });
		await canvas.setContent(`<!doctype html><html><body style="margin:0;background:#000">
<div style="position:relative;width:1440px;height:900px;overflow:hidden">
<div style="position:absolute;inset:0;background:url(${halves[0]}) left top/1440px 900px no-repeat;clip-path:inset(0 720px 0 0)"></div>
<div style="position:absolute;inset:0;background:url(${halves[1]}) left top/1440px 900px no-repeat;clip-path:inset(0 0 0 720px)"></div>
<div style="position:absolute;left:719px;top:0;bottom:0;width:2px;background:#C026D3"></div>
<div style="position:absolute;right:732px;bottom:16px;padding:3px 9px;border-radius:6px;background:#C026D3;color:#fff;font:600 14px/18px system-ui,sans-serif">Light</div>
<div style="position:absolute;left:732px;bottom:16px;padding:3px 9px;border-radius:6px;background:#C026D3;color:#fff;font:600 14px/18px system-ui,sans-serif">Dark</div>
</div></body></html>`);
		await canvas.waitForTimeout(200);
		await ctx.shot(canvas, {
			name: "surfaces-split",
			description:
				"Settings → Account at 1440×900: the left half from the light capture, the right half from the dark capture of the same view",
			clip: { x: 0, y: 0, width: 1440, height: 900 },
		});
	}

	// ── Admin typography in context (Design → SEO) ──────────────────────────
	for (const scheme of SCHEMES) {
		const name = `type-admin-${scheme}`;
		if (!wanted(name)) continue;
		const page = await ctx.page({ device: "element", scheme, signedIn: true });
		await ctx.goto(page, "/admin/design/seo");
		const main = page.locator("main");
		const heading = main.getByRole("heading", { level: 1 }).first();
		const card = main.locator('[data-slot="card"]').first();
		const cardTitle = card.getByText("SEO & Open Graph", { exact: true });
		const cardDescription = card.getByText("How your page appears", { exact: false });
		const rule = card.getByRole("heading", { name: "Meta Tags" });
		const label = card.getByText("Page Title", { exact: true });
		const input = card.getByRole("textbox", { name: "Page Title" });
		const helper = card.getByText("Shown in browser tab", { exact: false });
		const counter = card.getByText(/^\d+\/70$/);
		const cardBox = await boxOf(card);
		const clip = await regionClip(page, [heading, helper], 20, {
			left: cardBox.x - 20,
			right: cardBox.x + cardBox.width + 20,
		});
		const labels = await annotate(page, [
			{ target: heading, kind: "font", place: "text-right", dx: 6 },
			{ target: cardTitle, kind: "font", place: "text-right" },
			{ target: cardDescription, kind: "font", place: "text-right" },
			{ target: rule, kind: "font", place: "text-right", dx: 90 },
			{ target: label, kind: "font", place: "text-right" },
			{ target: input, kind: "font", place: "inside-r" },
			{ target: helper, kind: "font", place: "text-right" },
			{ target: counter, kind: "font", place: "below-r", dy: 2, suffix: " · tabular-nums" },
		]);
		log(name, labels);
		await ctx.shot(page, {
			name,
			description: `Design → SEO (${scheme}) with computed type labels: Montserrat page title, card title and section rule; Roboto description, label, field text, helper and tabular counter`,
			clip: { ...clip, height: clip.height + 18 },
		});
		await clearAnnotations(page);
	}

	// ── Numeric text: Geist Mono counts in the block filter chips ───────────
	for (const scheme of SCHEMES) {
		const name = `type-mono-${scheme}`;
		if (!wanted(name)) continue;
		const page = await ctx.page({ device: "element", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links");
		const filters = page.getByRole("group", { name: "Filter blocks" });
		const apply = page.getByRole("button", { name: /Apply \d+ new/ });
		const firstChip = filters.getByRole("button").first();
		const count = firstChip.locator("span.font-mono");
		const clip = await regionClip(page, [filters, apply], 16);
		const chipBox = await boxOf(firstChip);
		const labels = await annotate(page, [
			{ target: firstChip, kind: "font", place: "below", dy: 6, prefix: "label " },
			{
				target: count,
				kind: "font",
				place: "at",
				at: { x: chipBox.x + 230, y: chipBox.y + chipBox.height + 6 },
				leader: true,
				prefix: "count ",
			},
		]);
		log(name, labels);
		await ctx.shot(page, {
			name,
			description: `Links filter chips (${scheme}): Roboto chip labels with Geist Mono tabular counts, beside the compact primary Apply button`,
			clip: { ...clip, height: clip.height + 22 },
		});
		await clearAnnotations(page);
	}

	// ── Public typography: split layout in a 1000px window ──────────────────
	// 1000px keeps the profile column and block column in one readable crop;
	// the fluid roles are already at their maximum there (see the measure step).
	for (const scheme of SCHEMES) {
		const name = `type-public-${scheme}`;
		if (!wanted(name)) continue;
		const page = await ctx.page({
			device: "element",
			scheme,
			viewport: { width: 1000, height: 900 },
		});
		await ctx.goto(page, "/");
		const nameHeading = page.getByRole("heading", { level: 1 });
		const bio = page.locator(".ld-bio");
		const header = page.getByRole("heading", { name: "Latest work" });
		const portfolio = page.getByRole("link", { name: /Portfolio/ });
		const portfolioTitle = portfolio.getByText("Portfolio", { exact: true });
		const kitDesc = page
			.getByRole("link", { name: /Open-source UI kit/ })
			.getByText("Tokens, components", { exact: false });
		const featuredDesc = page.getByText("A 48-page zine", { exact: false });
		const newsletter = page.getByRole("link", { name: /Newsletter/ });
		const hero = page.locator(".ld-hero");
		await page.evaluate(() => window.scrollTo(0, 0));
		await frames(page);
		const heroBox = await boxOf(hero);
		const newsletterBox = await boxOf(newsletter);
		const below = heroBox.y + heroBox.height;
		const labels = await annotate(
			page,
			[
				{
					target: bio,
					kind: "font",
					place: "at",
					at: { x: heroBox.x + 14, y: below + 18 },
					elbowX: heroBox.x + 20,
					prefix: "bio ",
				},
				{
					target: nameHeading,
					kind: "font",
					place: "at",
					at: { x: heroBox.x - 4, y: below + 56 },
					elbowX: heroBox.x + 8,
					prefix: "name ",
				},
				{ target: header, kind: "font", place: "text-right", dx: 60 },
				{ target: featuredDesc, kind: "font", place: "text-right" },
				{ target: portfolioTitle, kind: "font", place: "text-right" },
				{ target: kitDesc, kind: "font", place: "text-right" },
			],
			15,
		);
		log(name, labels);
		await ctx.shot(page, {
			name,
			description: `Public page in a 1000px window (${scheme}, Classic) with computed type labels: Sora name and section header, DM Sans bio, link title and descriptions at the top of the fluid scale`,
			clip: {
				x: 0,
				y: 0,
				width: 1000,
				height: Math.ceil(Math.max(newsletterBox.y + newsletterBox.height, below + 90) + 16),
			},
		});
		await clearAnnotations(page);
	}

	// ── Measured fluid sizes at 390px and 1440px (logged, not captured) ─────
	if (wanted("measure")) {
		for (const device of ["phone", "desktop"] as const) {
			const page = await ctx.page({ device, scheme: "light" });
			await ctx.goto(page, "/");
			const sizes = await page.evaluate(() => {
				const px = (sel: string) => {
					const el = document.querySelector(sel);
					return el ? getComputedStyle(el).fontSize : "missing";
				};
				return {
					h1: px("h1"),
					h2: px(".ld-blocks h2"),
					bio: px(".ld-bio"),
					linkTitle: px(".ld-link-block .text-body"),
					linkDesc: px(".ld-link-block .text-small"),
				};
			});
			console.log(`    measure ${device}: ${JSON.stringify(sizes)}`);
		}
	}

	// ── Control sizes: fine pointer vs touch (Design → SEO) ─────────────────
	for (const device of ["element", "phone"] as const) {
		const name = device === "phone" ? "control-sizes-mobile" : "control-sizes-desktop";
		if (!wanted(name)) continue;
		const page = await ctx.page({ device, scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/design/seo");
		const main = page.locator("main");
		const metaLabel = main.getByRole("heading", { name: "Meta Tags" });
		const title = main.getByRole("textbox", { name: "Page Title" });
		const description = main.getByRole("textbox", { name: "Meta Description" });
		const template = main.getByRole("button", { name: "Template" });
		const upload = main.getByRole("button", { name: "Upload Image" });
		const card = main.locator('[data-slot="card"]').first();
		const cardBox = await boxOf(card);
		const clip = await regionClip(page, [metaLabel, upload], 20, {
			left: cardBox.x,
			right: cardBox.x + cardBox.width,
		});
		const labels = await annotate(page, [
			{ target: title, kind: "height", outline: true, place: "above", suffix: " Input" },
			{
				target: description,
				kind: "height",
				outline: true,
				place: "above",
				suffix: " Textarea (min-h-20)",
			},
			{ target: template, kind: "text", text: "", outline: true },
			{ target: upload, kind: "height", outline: true, place: "right", dx: 4, suffix: " toggle" },
		]);
		log(name, labels);
		await ctx.shot(page, {
			name,
			description:
				device === "phone"
					? "Design → SEO at 390px with a touch pointer: 44px Input and mode toggles, 16px field text, 80px Textarea minimum (measurement outlines added)"
					: "Design → SEO at 1440px with a fine pointer: 36px Input, 32px mode toggles, 14px field text, 80px Textarea minimum (measurement outlines added)",
			clip,
		});
		await clearAnnotations(page);
	}

	// ── Radii: admin scale (Design → SEO) and public scale (public page) ────
	// Light only: corner radii do not change with the colour scheme.
	if (wanted("radius-admin-light")) {
		const name = "radius-admin-light";
		const page = await ctx.page({ device: "element", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/design/seo");
		const main = page.locator("main");
		const card = main.locator('[data-slot="card"]').first();
		const iconTile = card
			.locator('[data-slot="card-header"] div')
			.filter({ has: page.locator("svg") })
			.first();
		const title = main.getByRole("textbox", { name: "Page Title" });
		const template = main.getByRole("button", { name: "Template" });
		const option = main.getByRole("button", { name: /Gradient/ }).first();
		const cardBox = await boxOf(card);
		const clip = await regionClip(page, [card], 20, {
			left: cardBox.x - 20,
			right: cardBox.x + cardBox.width + 20,
		});
		const labels = await annotate(page, [
			{ target: card, kind: "radius", radii: ADMIN_RADII, place: "inside-tr", prefix: "Card " },
			{
				target: iconTile,
				kind: "radius",
				radii: ADMIN_RADII,
				outline: true,
				place: "below",
				dy: 6,
				prefix: "icon tile ",
			},
			{ target: title, kind: "radius", radii: ADMIN_RADII, place: "inside-r", prefix: "Input " },
			{
				target: template,
				kind: "radius",
				radii: ADMIN_RADII,
				outline: true,
				place: "right",
				dx: 140,
				prefix: "mode toggle ",
			},
			{
				target: option,
				kind: "radius",
				radii: ADMIN_RADII,
				outline: true,
				place: "below",
				dy: 8,
				prefix: "template option ",
			},
		]);
		log(name, labels);
		await ctx.shot(page, {
			name,
			description:
				"Design → SEO card with computed corner radii on the admin scale: card, icon tile, Input, mode toggle and template option",
			clip: { ...clip, height: Math.min(clip.height + 24, 900 - clip.y) },
		});
		await clearAnnotations(page);
	}

	if (wanted("radius-public-light")) {
		const name = "radius-public-light";
		const page = await ctx.page({
			device: "element",
			scheme: "light",
			viewport: { width: 1000, height: 900 },
		});
		await ctx.goto(page, "/");
		await page.evaluate(() => window.scrollTo(0, 0));
		await frames(page);
		const hero = page.locator(".ld-hero");
		const social = page.locator(".ld-social-icons > a").first();
		const featured = page.getByRole("link", { name: /Field Notes, Vol\. 3/ });
		const pill = featured.getByText("Field Notes, Vol. 3", { exact: true }).locator("xpath=..");
		const review = page.getByRole("link", { name: /Book a design review/ });
		const newsletter = page.getByRole("link", { name: /Newsletter/ });
		const heroBox = await boxOf(hero);
		const newsletterBox = await boxOf(newsletter);
		const below = heroBox.y + heroBox.height;
		const labels = await annotate(
			page,
			[
				{
					target: hero,
					kind: "radius",
					radii: PUBLIC_RADII,
					place: "inside-tl",
					prefix: "profile card ",
				},
				{
					target: social,
					kind: "radius",
					radii: PUBLIC_RADII,
					outline: true,
					place: "at",
					at: { x: heroBox.x, y: below + 18 },
					elbowX: heroBox.x + 12,
					prefix: "social icon (circle) ",
				},
				{
					target: featured,
					kind: "radius",
					radii: PUBLIC_RADII,
					place: "inside-tr",
					prefix: "featured link ",
				},
				{
					target: pill,
					kind: "radius",
					radii: PUBLIC_RADII,
					place: "right",
					dx: 8,
					prefix: "title pill ",
				},
				{
					target: review,
					kind: "radius",
					radii: PUBLIC_RADII,
					place: "inside-r",
					dx: -40,
					dy: -16,
					prefix: "highlighted ",
				},
				{
					target: newsletter,
					kind: "radius",
					radii: PUBLIC_RADII,
					place: "inside-r",
					dx: -40,
					prefix: "link card ",
				},
			],
			15,
		);
		log(name, labels);
		await ctx.shot(page, {
			name,
			description:
				"Public page in a 1000px window (Classic) with computed corner radii on the public scale: profile card, social icon, featured link, title pill and link cards",
			clip: {
				x: 0,
				y: 0,
				width: 1000,
				height: Math.ceil(newsletterBox.y + newsletterBox.height + 16),
			},
		});
		await clearAnnotations(page);
	}

	// ── Focus rings (keyboard focus kept for the capture) ───────────────────
	for (const scheme of SCHEMES) {
		const name = `focus-ring-input-${scheme}`;
		if (!wanted(name)) continue;
		const page = await ctx.page({ device: "element", scheme, signedIn: true });
		await ctx.goto(page, "/admin/design/seo");
		const main = page.locator("main");
		const title = main.getByRole("textbox", { name: "Page Title" });
		const titleLabel = main.getByText("Page Title", { exact: true });
		const helper = main.getByText("Shown in browser tab", { exact: false });
		await title.focus();
		await page.keyboard.press("End");
		await ctx.prepare(page, { keepFocus: true });
		const clip = await regionClip(page, [titleLabel, helper], 16);
		const focused = await title.evaluate((el) => el === document.activeElement);
		if (!focused) console.warn(`    ${name}: input lost focus`);
		await ctx.shot(page, {
			name,
			description: `Page Title Input with keyboard focus (${scheme}): --ring border plus a solid 2px --ring ring, offset 2px`,
			clip,
		});
	}

	for (const scheme of SCHEMES) {
		const name = `focus-ring-button-${scheme}`;
		if (!wanted(name)) continue;
		const page = await ctx.page({ device: "element", scheme, signedIn: true });
		await ctx.goto(page, "/admin/settings");
		const card = page.locator('[data-slot="card"]', { hasText: "Login & Security" });
		const changes = card.getByRole("button", { name: /^Change/ });
		const first = changes.first();
		const toggles = card.getByRole("switch");
		const cardBox = await boxOf(card);
		const clip = await regionClip(page, [first, toggles.last()], 16, {
			left: cardBox.x + cardBox.width - 330,
			right: cardBox.x + cardBox.width + 16,
		});
		// A key press sets keyboard modality, so programmatic focus matches :focus-visible.
		await page.keyboard.press("Shift");
		await first.focus();
		await ctx.prepare(page, { keepFocus: true });
		const focusVisible = await first.evaluate((el) => el.matches(":focus-visible"));
		if (!focusVisible) console.warn(`    ${name}: button is not :focus-visible`);
		await ctx.shot(page, {
			name,
			description: `Settings → Account (${scheme}): the first outline Change Button with keyboard focus (--ring border, 2px ring at 50% opacity, no offset) above an unfocused one, the secondary badge and Switches`,
			clip,
		});
	}

	// ── Theme presets: the picker card, then each preset in the preview ─────
	for (const scheme of SCHEMES) {
		const pickerName = `theme-presets-${scheme}`;
		const presetNames = PRESET_SHOTS.map((p) => `preset-${p.slug}-${scheme}`);
		if (!wanted(pickerName) && !presetNames.some(wanted)) continue;
		const page = await ctx.page({ device: "element", scheme, signedIn: true });
		await ctx.goto(page, "/admin/design");
		const card = page.locator('[data-slot="card"]', {
			has: page.getByRole("heading", { name: "Theme Presets" }),
		});
		if (wanted(pickerName)) {
			// Scroll by hand: the shell's scroll-padding (top bar, tab bar) would
			// otherwise centre the card partly under the sticky 64px top bar.
			const clip = await regionClip(page, [card], 12);
			await ctx.shot(page, {
				clip,
				name: pickerName,
				description: `Design → Theme Presets card (${scheme}): all eleven presets, each tile split diagonally into its light and dark ground, card, primary and accent; Classic selected`,
			});
		}
		const img = page.getByRole("img", { name: "Live preview of your page" });
		const scroller = img.locator("xpath=..");
		const frame = img.locator("xpath=../..");
		try {
			for (const preset of PRESET_SHOTS) {
				const name = `preset-${preset.slug}-${scheme}`;
				if (!wanted(name)) continue;
				await card.getByRole("button", { name: preset.label, exact: true }).click();
				await ctx.prepare(page, { settleMs: 400 });
				// Start the visible window at the social row: hero card edge, signal
				// header, featured card and the primary-filled highlighted link.
				await scroller.evaluate((el) => {
					const icons = el.querySelector(".ld-social-icons");
					if (!icons) return;
					const delta = icons.getBoundingClientRect().top - el.getBoundingClientRect().top;
					el.scrollTop += delta - 14;
				});
				await frames(page);
				await frame.evaluate((el) => el.scrollIntoView({ block: "center" }));
				await frames(page);
				const box = await boxOf(frame);
				await ctx.shot(page, {
					name,
					description: `${preset.label} preset in the Design preview (${scheme}), unsaved: page ground, hero card edge, social icons, signal header, featured and link cards, highlighted link`,
					clip: {
						x: Math.floor(box.x),
						y: Math.floor(box.y),
						width: Math.ceil(box.width),
						height: Math.ceil(box.height),
					},
				});
			}
		} finally {
			const discard = page.getByRole("button", { name: "Discard" });
			if (await discard.isVisible().catch(() => false)) {
				await discard.click();
				await ctx.prepare(page);
			}
		}
	}
}
