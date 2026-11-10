// ─── overview: captures for design-system/index.mdx ──────────────────────────
// The admin editor and the public profile side by side, so the overview page
// can show the two visual layers before the detailed pages, plus numbered
// anatomy diagrams of both. Read-only: pages are opened and photographed,
// nothing is typed or saved. The anatomy markers are a capture-time overlay
// (pointer-events: none) injected into the page; they are not app UI.
//
// OVERVIEW_ONLY=<prefix>[,<prefix>] limits a run to shots whose names start
// with one of the prefixes (handy while retaking a single image).

import type { Page } from "@playwright/test";
import { type CaptureContext, env, type Scheme } from "../lib";

const SCHEMES: readonly Scheme[] = ["light", "dark"];

const only = (env("OVERVIEW_ONLY") ?? "")
	.split(",")
	.map((value) => value.trim())
	.filter(Boolean);
const wanted = (name: string) =>
	only.length === 0 || only.some((prefix) => name.startsWith(prefix));
/** True when any of the named shots will be taken (decides whether a page is opened at all). */
const anyWanted = (...names: string[]) => names.some(wanted);

/** Wait until the shell preview has rendered the real public page (not "Loading preview…"). */
async function previewReady(page: Page): Promise<void> {
	const preview = page.getByRole("img", { name: "Live preview of your page" });
	await preview.waitFor({ state: "visible", timeout: 30_000 });
	await page.waitForFunction(
		() => !document.querySelector('aside[aria-label="Preview"] [aria-busy="true"]'),
		undefined,
		{ timeout: 30_000 },
	);
}

/** One numbered region: a CSS selector (first match) and the badge number. */
interface Marker {
	n: number;
	selector: string;
	/** Use the nth match instead of the first. */
	index?: number;
	/** Walk up to this ancestor (closest) before measuring. */
	closest?: string;
	/**
	 * Where the badge sits, chosen so it never covers the region's own text:
	 * `tl`/`tr` inside the top corners, `te` centered on the top edge at the
	 * right, `rc` inside the right edge (vertically centered), `ol` just outside
	 * the left edge, `bl` just below the left edge. Default `tl`.
	 */
	at?: "tl" | "tr" | "te" | "rc" | "ol" | "bl";
}

/**
 * Draw a dashed outline and a numbered badge over each region, in document
 * coordinates, on a pointer-events-free layer above everything. Throws when a
 * selector matches nothing, so a markup change fails loudly instead of
 * producing a diagram with missing numbers.
 */
async function annotate(page: Page, markers: Marker[]): Promise<void> {
	await page.evaluate((list) => {
		document.getElementById("ds-anatomy")?.remove();
		const layer = document.createElement("div");
		layer.id = "ds-anatomy";
		layer.setAttribute("aria-hidden", "true");
		Object.assign(layer.style, {
			position: "absolute",
			left: "0",
			top: "0",
			width: "0",
			height: "0",
			zIndex: "2147483647",
			pointerEvents: "none",
		});
		const missing: string[] = [];
		for (const marker of list) {
			const matches = document.querySelectorAll(marker.selector);
			let el = matches[marker.index ?? 0] as Element | undefined;
			if (el && marker.closest) el = el.closest(marker.closest) ?? undefined;
			if (!el) {
				missing.push(`${marker.n}: ${marker.selector}`);
				continue;
			}
			const box = el.getBoundingClientRect();
			const x = box.left + window.scrollX;
			const y = box.top + window.scrollY;
			const outline = document.createElement("div");
			Object.assign(outline.style, {
				position: "absolute",
				left: `${x + 2}px`,
				top: `${y + 2}px`,
				width: `${Math.max(0, box.width - 4)}px`,
				height: `${Math.max(0, box.height - 4)}px`,
				border: "2px dashed #E11D48",
				borderRadius: "6px",
				boxSizing: "border-box",
			});
			const badge = document.createElement("div");
			badge.textContent = String(marker.n);
			const size = 24;
			const place = {
				tl: { left: x + 6, top: y + 6 },
				tr: { left: x + box.width - size - 6, top: y + 6 },
				te: { left: x + box.width - size - 6, top: y - size / 2 },
				rc: { left: x + box.width - size - 6, top: y + (box.height - size) / 2 },
				ol: { left: x - size - 2, top: y + 6 },
				bl: { left: x + 6, top: y + box.height + 2 },
			}[marker.at ?? "tl"];
			Object.assign(badge.style, {
				position: "absolute",
				left: `${place.left}px`,
				top: `${place.top}px`,
				width: `${size}px`,
				height: `${size}px`,
				borderRadius: "9999px",
				background: "#E11D48",
				color: "#FFFFFF",
				border: "2px solid #FFFFFF",
				boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
				font: "700 12px/20px system-ui, -apple-system, sans-serif",
				textAlign: "center",
				boxSizing: "border-box",
			});
			layer.append(outline, badge);
		}
		if (missing.length > 0)
			throw new Error(`anatomy selectors matched nothing: ${missing.join(", ")}`);
		document.body.append(layer);
	}, markers);
	await page.evaluate(
		() =>
			new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
	);
}

/** Admin editor regions, numbered top-left to bottom-right (the MDX table uses the same numbers). */
const ADMIN_MARKERS: Marker[] = [
	{ n: 1, selector: '[data-slot="sidebar-header"]', at: "rc" },
	{ n: 2, selector: '[data-slot="sidebar-content"]', at: "tr" },
	{ n: 3, selector: '[data-slot="sidebar-footer"]', at: "te" },
	{ n: 4, selector: 'header.sticky nav[aria-label="breadcrumb"]', at: "rc" },
	{ n: 5, selector: "header.sticky > div:last-child", at: "bl" },
	{ n: 6, selector: "main header", at: "rc" },
	{ n: 7, selector: 'nav[aria-label="Links sections"]', at: "rc" },
	{ n: 8, selector: 'main [data-slot="card"]', at: "tr" },
	{ n: 9, selector: 'aside[aria-label="Preview"]', at: "ol" },
	{
		n: 10,
		selector: '[role="img"][aria-label="Live preview of your page"]',
		closest: ".rounded-xl",
	},
	{ n: 11, selector: "footer.border-t" },
];

/** Public page regions at 1440px (split layout). */
const PUBLIC_MARKERS: Marker[] = [
	{ n: 1, selector: "div.fixed.right-4.top-4", at: "ol" },
	{ n: 2, selector: ".ld-hero", at: "ol" },
	{ n: 3, selector: ".ld-hero-cover" },
	{ n: 4, selector: ".ld-hero h1", at: "ol" },
	{ n: 5, selector: ".ld-bio", at: "ol" },
	{ n: 6, selector: ".ld-social-icons", at: "ol" },
	{ n: 7, selector: "section > .ld-blocks", at: "ol" },
	{ n: 8, selector: "ul.ld-blocks > li", index: 0, at: "ol" },
	{ n: 9, selector: "ul.ld-blocks > li", index: 1, at: "ol" },
	{ n: 10, selector: "ul.ld-blocks > li", index: 2, at: "ol" },
	{ n: 11, selector: "ul.ld-blocks > li", index: 3, at: "ol" },
	{ n: 12, selector: "ul.ld-blocks > li", index: 4, at: "ol" },
];

export async function capture(ctx: CaptureContext): Promise<void> {
	for (const scheme of SCHEMES) {
		// 1. The whole admin shell on the Profile page: sidebar, top bar, page header with
		//    sub-tabs, one form card, the preview rail and the shared footer. The viewport
		//    grows to the document height so the fixed sidebar reaches the footer.
		if (anyWanted(`admin-editor-${scheme}`, `admin-anatomy-${scheme}`)) {
			const editor = await ctx.page({ device: "desktop", scheme, signedIn: true });
			await ctx.goto(editor, "/admin/links/profile");
			await previewReady(editor);
			const height = await editor.evaluate(() => document.documentElement.scrollHeight);
			await editor.setViewportSize({ width: 1440, height: Math.max(900, height) });
			await ctx.prepare(editor);
			if (wanted(`admin-editor-${scheme}`)) {
				await ctx.shot(editor, {
					name: `admin-editor-${scheme}`,
					description: `Profile page (Profile sub-tab) in the admin shell with the preview rail and footer, ${scheme} mode`,
				});
			}

			// 1b. The same screen with numbered regions for the anatomy table.
			if (wanted(`admin-anatomy-${scheme}`)) {
				await annotate(editor, ADMIN_MARKERS);
				await ctx.shot(editor, {
					name: `admin-anatomy-${scheme}`,
					description: `Admin editor with numbered regions: sidebar header, navigation, account footer, breadcrumb, top-bar actions, PageHeader, SubTabs, card, preview rail, page viewport, footer, ${scheme} mode`,
				});
			}
		}

		// 2. Admin scope close-up: the Profile Info card (Montserrat title, Roboto fields,
		//    8px control radius, neutral surfaces, blue icon chip).
		// A taller viewport keeps the whole shell on screen, so the sticky preview rail is
		// cropped where it rests instead of sliding under the top bar.
		if (
			anyWanted(`scope-admin-${scheme}`, `surface-preview-${scheme}`, `surface-wallet-${scheme}`)
		) {
			const adminCrop = await ctx.page({
				device: "element",
				scheme,
				signedIn: true,
				viewport: { width: 1440, height: 1000 },
			});
			await ctx.goto(adminCrop, "/admin/links/profile");
			if (wanted(`scope-admin-${scheme}`)) {
				await ctx.shot(
					adminCrop
						.locator('[data-slot="card"]')
						.filter({ has: adminCrop.getByRole("heading", { name: "Profile Info" }) }),
					{
						name: `scope-admin-${scheme}`,
						description: `Admin scope: the Profile Info form card, ${scheme} mode`,
					},
				);
			}

			// 3. Page preview rail: unscaled admin toolbar above the real public page.
			if (wanted(`surface-preview-${scheme}`)) {
				await previewReady(adminCrop);
				await ctx.shot(adminCrop.locator('aside[aria-label="Preview"]'), {
					name: `surface-preview-${scheme}`,
					description: `Preview rail: admin toolbar and status line above the inert public page, ${scheme} mode`,
				});
			}

			// 4. Wallet preview: the pass card in the same rail, with its own colors and type.
			if (wanted(`surface-wallet-${scheme}`)) {
				await ctx.goto(adminCrop, "/admin/settings/wallet");
				await ctx.shot(adminCrop.locator('aside[aria-label="Preview"]'), {
					name: `surface-wallet-${scheme}`,
					description: `Settings → Wallet preview rail showing the pass card, ${scheme} mode`,
				});
			}
		}

		// 5. Public profile at desktop width: split layout (sticky profile column + blocks).
		if (anyWanted(`public-split-${scheme}`, `public-anatomy-${scheme}`)) {
			const publicDesktop = await ctx.page({ device: "desktop", scheme });
			await ctx.goto(publicDesktop, "/");
			if (wanted(`public-split-${scheme}`)) {
				await ctx.shot(publicDesktop, {
					name: `public-split-${scheme}`,
					description: `Public profile, split layout at 1440px: sticky profile card left, block list right, ${scheme} mode`,
				});
			}

			// 5b. The same view with numbered regions for the public anatomy table.
			if (wanted(`public-anatomy-${scheme}`)) {
				await annotate(publicDesktop, PUBLIC_MARKERS);
				await ctx.shot(publicDesktop, {
					name: `public-anatomy-${scheme}`,
					description: `Public profile at 1440px with numbered regions: floating controls, profile card, banner, name, bio, social icons, section header and five link styles, ${scheme} mode`,
				});
			}
		}

		// 6. Public scope close-up: the inline Connect form (Sora/DM Sans, pill controls,
		//    theme-colored submit button), and the page footer.
		if (anyWanted(`scope-public-${scheme}`, `public-footer-${scheme}`)) {
			const publicCrop = await ctx.page({ device: "element", scheme });
			await ctx.goto(publicCrop, "/");
			if (wanted(`scope-public-${scheme}`)) {
				// 10px padding: the next block (the vCard button) starts 12px below the card.
				await ctx.shot(publicCrop.locator(".ld-connect-block").first(), {
					padding: 10,
					name: `scope-public-${scheme}`,
					description: `Public scope: the inline Connect form block, ${scheme} mode`,
				});
			}

			// 6b. The end of the page: the legal row and the branding footer.
			if (wanted(`public-footer-${scheme}`)) {
				// The footer spans the page width but its content is centered: clip a
				// 560px band around the center so the text stays legible in the docs.
				const tail = publicCrop.locator(".ld-page > .mt-auto");
				await tail.evaluate((el) => el.scrollIntoView({ block: "end" }));
				await ctx.prepare(publicCrop);
				const box = await tail.boundingBox();
				if (!box) throw new Error("public footer is not visible");
				const width = 560;
				await ctx.shot(publicCrop, {
					name: `public-footer-${scheme}`,
					description: `Public page footer: Privacy and Cookie settings links above the Powered by LinkDen branding line, ${scheme} mode`,
					clip: {
						x: Math.round(box.x + box.width / 2 - width / 2),
						y: Math.max(0, Math.round(box.y - 8)),
						width,
						height: Math.round(box.height + 8),
					},
				});
			}
		}

		// 7. Public profile on a phone: the stacked structure every narrow page uses.
		if (wanted(`public-profile-mobile-${scheme}`)) {
			const phone = await ctx.page({ device: "phone", scheme });
			await ctx.goto(phone, "/");
			await ctx.shot(phone, {
				name: `public-profile-mobile-${scheme}`,
				description: `Public profile on a 390px phone: profile card above the block list, ${scheme} mode`,
			});
		}
	}
}
