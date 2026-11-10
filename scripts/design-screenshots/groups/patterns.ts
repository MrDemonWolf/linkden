// ─── Patterns group ──────────────────────────────────────────────────────────
// Captures for apps/docs/content/docs/design-system/patterns.mdx: the admin page
// structure, the preview rail and sheet, the unsaved → save bar → discard flow,
// the block editor, a settings form, the Inbox, empty states, the setup wizard,
// login, public layouts and the Wallet preview.
//
// Read-only: every page here aborts non-GET requests to /trpc and /api, so a
// stray click can never save, apply, delete or mark a message read. Edits are
// typed and then abandoned with the context.
//
// A few states cannot exist on the seeded stack without saving (an empty block
// list, an empty Inbox, a first-run wizard while an admin exists, a two-factor
// prompt with 2FA off). Those captures rewrite GET responses in the browser
// only (`overrideTrpc`) or answer one auth POST locally (`mockTwoFactor`), so
// the real components render the state while the database never changes.
//
// PATTERNS_ONLY=shell,preview,… limits a run to some sections (see SECTIONS).

import type { Locator, Page } from "@playwright/test";
import { type CaptureContext, type ContextOptions, env, type Scheme } from "../lib";

const SECTIONS = [
	"shell",
	"preview",
	"save",
	"editor",
	"settings",
	"inbox",
	"empty",
	"setup",
	"login",
	"public",
	"wallet",
] as const;
type Section = (typeof SECTIONS)[number];

function wanted(section: Section): boolean {
	const only = env("PATTERNS_ONLY");
	if (!only) return true;
	return only.split(",").includes(section);
}

/** Abort writes so a capture can never change saved data. */
async function readOnly(page: Page): Promise<void> {
	await page.route(/\/(trpc|api)\//, (route) => {
		const method = route.request().method();
		if (method === "GET" || method === "HEAD" || method === "OPTIONS") return route.continue();
		console.warn(`  blocked ${method} ${new URL(route.request().url()).pathname}`);
		return route.abort();
	});
}

async function open(ctx: CaptureContext, options: ContextOptions): Promise<Page> {
	const page = await ctx.page(options);
	await readOnly(page);
	return page;
}

type Override = (data: unknown) => unknown;

/**
 * Rewrite the data of some tRPC queries in the browser (GET only; batched or
 * not). Registered after `readOnly`, so it runs first and hands every other
 * request back to it.
 */
async function overrideTrpc(page: Page, overrides: Record<string, Override>): Promise<void> {
	await page.route(/\/trpc\//, async (route) => {
		const request = route.request();
		if (request.method() !== "GET") return route.fallback();
		const url = new URL(request.url());
		const paths = decodeURIComponent(url.pathname.replace(/^.*\/trpc\//, "")).split(",");
		if (!paths.some((path) => path in overrides)) return route.fallback();
		const response = await route.fetch();
		const body: unknown = await response.json();
		const batch = url.searchParams.has("batch");
		const items = (batch ? body : [body]) as Array<{ result?: { data: unknown } } | undefined>;
		paths.forEach((path, i) => {
			const fn = overrides[path];
			const item = items[i];
			if (fn && item?.result) items[i] = { result: { data: fn(item.result.data) } };
		});
		await route.fulfill({ response, json: batch ? items : items[0] });
	});
}

/**
 * Fail one tRPC query in the browser with an INTERNAL_SERVER_ERROR item (other
 * queries in the same batch keep their real data), to show an error state.
 */
async function failTrpc(page: Page, failing: string): Promise<void> {
	await page.route(/\/trpc\//, async (route) => {
		const request = route.request();
		if (request.method() !== "GET") return route.fallback();
		const url = new URL(request.url());
		const paths = decodeURIComponent(url.pathname.replace(/^.*\/trpc\//, "")).split(",");
		if (!paths.includes(failing)) return route.fallback();
		const response = await route.fetch();
		const body: unknown = await response.json();
		const batch = url.searchParams.has("batch");
		const items = (batch ? body : [body]) as unknown[];
		paths.forEach((path, i) => {
			if (path !== failing) return;
			items[i] = {
				error: {
					message: "Internal server error",
					code: -32603,
					data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
				},
			};
		});
		await route.fulfill({ response, json: batch ? items : items[0] });
	});
}

/**
 * Answer password sign-in with Better Auth's `twoFactorRedirect`, locally: the
 * request never reaches the server, so no account or 2FA setting changes.
 */
async function mockTwoFactor(page: Page): Promise<void> {
	await page.route(/\/api\/auth\/sign-in\/email/, (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ twoFactorRedirect: true }),
		}),
	);
}

/** Park the pointer where it hovers nothing, so no row or card shows a hover state. */
async function parkPointer(page: Page): Promise<void> {
	const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
	await page.mouse.move(viewport.width - 2, viewport.height - 2);
}

const SCHEMES: readonly Scheme[] = ["light", "dark"];

/** The shell-owned preview rail (≥lg). */
const rail = (page: Page): Locator => page.getByRole("complementary", { name: "Preview" });

/** Bottom edge of the sticky 64px top bar, in viewport pixels. */
async function topBarBottom(page: Page): Promise<number> {
	return page.evaluate(
		() => document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0,
	);
}

/** Crop the preview rail without the sticky top bar above it. */
async function shotRail(
	ctx: CaptureContext,
	page: Page,
	name: string,
	description: string,
): Promise<void> {
	const box = await rail(page).boundingBox();
	if (!box) throw new Error(`${name}: preview rail is not visible`);
	const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
	const pad = 16;
	const x = Math.max(0, Math.floor(box.x - pad));
	const y = Math.max(Math.ceil(await topBarBottom(page)), Math.floor(box.y - pad));
	const right = Math.min(viewport.width, Math.ceil(box.x + box.width + pad));
	const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + pad));
	await ctx.shot(page, { name, description, clip: { x, y, width: right - x, height: bottom - y } });
}

/** Crop the smallest box around several elements (viewport coordinates, padded). */
async function shotUnion(
	ctx: CaptureContext,
	page: Page,
	targets: Locator[],
	name: string,
	description: string,
	pad = 16,
): Promise<void> {
	const boxes = [];
	for (const target of targets) {
		const box = await target.boundingBox();
		if (!box) throw new Error(`${name}: a target is not visible`);
		boxes.push(box);
	}
	const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
	const floor = Math.ceil(await topBarBottom(page));
	const x = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.x)) - pad));
	const y = Math.max(floor, Math.floor(Math.min(...boxes.map((b) => b.y)) - pad));
	const right = Math.min(
		viewport.width,
		Math.ceil(Math.max(...boxes.map((b) => b.x + b.width)) + pad),
	);
	const bottom = Math.min(
		viewport.height,
		Math.ceil(Math.max(...boxes.map((b) => b.y + b.height)) + pad),
	);
	await ctx.shot(page, { name, description, clip: { x, y, width: right - x, height: bottom - y } });
}

/** Wait until the preview viewport finished loading the public page. */
async function previewReady(page: Page): Promise<void> {
	await page
		.getByRole("img", { name: "Live preview of your page" })
		.first()
		.waitFor({ state: "visible", timeout: 30_000 });
	await page.waitForTimeout(400);
}

// ─── Admin page structure ────────────────────────────────────────────────────

async function shell(ctx: CaptureContext): Promise<void> {
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "desktop", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links");
		await previewReady(page);
		await parkPointer(page);
		await ctx.shot(page, {
			name: `admin-shell-${scheme}`,
			description: `Links destination at 1440px: sidebar, top bar, PageHeader, SubTabs, block list and preview rail (${scheme})`,
		});
	}

	// Sidebar collapsed to its icon rail (Cmd/Ctrl+B), preview rail kept.
	{
		const page = await open(ctx, { device: "desktop", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/design");
		await previewReady(page);
		await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 400 });
		await ctx.shot(page, {
			name: "admin-shell-sidebar-collapsed-light",
			description: "Design → Theme with the sidebar collapsed to its icon rail",
		});
	}

	// Top bar and page header crops (2x).
	{
		// 1100px wide, so the bar crop stays legible at docs width.
		const page = await open(ctx, {
			device: "element",
			scheme: "light",
			signedIn: true,
			viewport: { width: 1100, height: 800 },
		});
		// Design → SEO: the breadcrumb maps the "seo" path segment to "SEO" (subTabLabel).
		await ctx.goto(page, "/admin/design/seo");
		await previewReady(page);
		await parkPointer(page);
		await ctx.shot(page.locator("header.sticky").first(), {
			name: "top-bar-light",
			description:
				"64px top bar on Design → SEO: sidebar trigger, breadcrumb Design › SEO, StatePill, share, View live",
			padding: 0,
		});
		await ctx.goto(page, "/admin/design/branding");
		await previewReady(page);
		await parkPointer(page);
		await shotUnion(
			ctx,
			page,
			[
				page.locator("main header").first(),
				page.getByRole("navigation", { name: "Design sections" }),
			],
			"page-header-subtabs-light",
			"PageHeader h1 above the path-segment SubTabs strip on Design → Branding",
		);
	}

	// Phone: top bar + bottom tab bar, and the More menu.
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "phone", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links");
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page, {
			name: `admin-shell-mobile-${scheme}`,
			description: `Links on a 390px phone: compact top bar, page content and the 56px bottom tab bar (${scheme})`,
		});
	}
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "phone", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links");
		await page.getByRole("button", { name: "More navigation" }).click();
		await ctx.prepare(page, { keepFocus: true, settleMs: 300 });
		await ctx.shot(page, {
			name: `bottom-nav-more-mobile-${scheme}`,
			description: `Bottom tab bar with the More menu open (Design, Settings) (${scheme})`,
		});
	}
}

// ─── Preview rail and sheet ──────────────────────────────────────────────────

async function preview(ctx: CaptureContext): Promise<void> {
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "element", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links/profile");
		await previewReady(page);
		await parkPointer(page);
		await shotRail(
			ctx,
			page,
			`preview-rail-${scheme}`,
			`Expanded preview rail: header row, mode toggle, copy/open actions, status line and the 390px viewport (${scheme})`,
		);
	}

	// Collapsed rail (localStorage admin.preview.collapsed, per context only).
	{
		const page = await open(ctx, { device: "desktop", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/links/profile");
		await previewReady(page);
		await page.getByRole("button", { name: "Hide preview" }).click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 400 });
		await ctx.shot(page, {
			name: "preview-rail-collapsed-light",
			description: "Profile with the preview rail collapsed to its 40px Show preview button",
		});
	}

	// SEO: the rail's alternate view (Social card).
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "element", scheme, signedIn: true });
		await ctx.goto(page, "/admin/design/seo");
		await previewReady(page);
		await page.getByRole("button", { name: "Social card" }).click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 1500 });
		await shotRail(
			ctx,
			page,
			`preview-rail-social-card-${scheme}`,
			`SEO registers an altView: the rail header toggles between Page and Social card (${scheme})`,
		);
	}

	// Phone: header Preview action → full-height sheet.
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "phone", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links");
		await page.getByRole("button", { name: "Open live preview" }).click();
		await previewReady(page);
		await ctx.prepare(page, { settleMs: 500 });
		await ctx.shot(page, {
			name: `mobile-preview-sheet-${scheme}`,
			description: `MobilePreviewSheet below 1024px: Preview title, Share and Close above the fitted page (${scheme})`,
		});
	}
}

// ─── Unsaved edit → save bar → discard ───────────────────────────────────────

async function chooseLayout(page: Page, label: "Stacked" | "Side by side"): Promise<void> {
	await page.getByRole("combobox", { name: "Page layout" }).click();
	await page.getByRole("option", { name: label }).click();
}

async function save(ctx: CaptureContext): Promise<void> {
	// Picking a preset is an unsaved edit that the preview shows at once.
	const preset = "Forest";
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "desktop", scheme, signedIn: true });
		await ctx.goto(page, "/admin/design");
		await previewReady(page);
		await page.getByRole("button", { name: preset, exact: true }).click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 800 });
		await ctx.shot(page, {
			name: `unsaved-save-bar-${scheme}`,
			description: `Design → Theme after picking ${preset} without saving: Unsaved pill, recolored preview, sticky save bar (${scheme})`,
		});
	}
	{
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/design");
		await previewReady(page);
		const pill = page.getByRole("button", { name: /^Publishing:/ });
		await page.getByRole("button", { name: preset, exact: true }).click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 500 });
		await ctx.shot(page.getByText("You have unsaved changes").locator(".."), {
			name: "save-bar-light",
			description: "StickySaveBar: message, Discard and Save changes",
		});
		await ctx.shot(pill, {
			name: "state-pill-unsaved-light",
			description: "StatePill reading Unsaved while any form is dirty",
			padding: 12,
		});
		// Discard returns the form to its saved baseline; the bar disappears.
		await page.getByRole("button", { name: "Discard" }).click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(pill, {
			name: "state-pill-after-discard-light",
			description: "StatePill after Discard: back to the publication label",
			padding: 12,
		});
		await pill.click();
		await ctx.prepare(page, { keepFocus: true, settleMs: 600 });
		const popover = page.getByRole("dialog").filter({ hasText: "Publish changes" });
		await ctx.shot(popover, {
			name: "state-pill-popover-light",
			description: "Publish changes popover opened from the StatePill",
		});
	}

	// Phone: the save bar sits above the bottom tab bar.
	{
		const page = await open(ctx, { device: "phone", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/design");
		await chooseLayout(page, "Stacked");
		await ctx.prepare(page, { settleMs: 400 });
		await ctx.shot(page, {
			name: "save-bar-mobile-light",
			description:
				"Design → Theme on a phone after an unsaved layout change: save bar above the tab bar",
		});
	}
}

// ─── Block editor ────────────────────────────────────────────────────────────

async function editor(ctx: CaptureContext): Promise<void> {
	const block = "Book a design review";
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "desktop", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links");
		await previewReady(page);
		await page.getByRole("button", { name: `Edit ${block}` }).click();
		await page.getByRole("heading", { name: "Edit Link" }).waitFor();
		await page.locator("#edit-title").fill("Book a 30-minute design review");
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 600 });
		await ctx.shot(page, {
			name: `block-editor-xl-${scheme}`,
			description: `Block editor at 1440px: panel stacked above the preview, with an unsaved title (${scheme})`,
		});
	}

	// Rail scrolled to the seam: editor footer above, page preview below (2x).
	{
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/links");
		await previewReady(page);
		await page.getByRole("button", { name: `Edit ${block}` }).click();
		await page.getByRole("heading", { name: "Edit Link" }).waitFor();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 400 });
		// Scroll after `prepare`, so nothing it waits on can move the rail back.
		const scrolled = await rail(page).evaluate(async (aside) => {
			const save = [...aside.querySelectorAll("button")].find(
				(b) => b.textContent?.trim() === "Save Changes",
			);
			if (!save) return -1;
			const offset = save.getBoundingClientRect().top - aside.getBoundingClientRect().top;
			aside.scrollTop += offset - 200;
			await new Promise<void>((done) =>
				requestAnimationFrame(() => requestAnimationFrame(() => done())),
			);
			return aside.scrollTop;
		});
		if (scrolled <= 0) throw new Error("block-editor-xl-seam-light: the rail did not scroll");
		await shotRail(
			ctx,
			page,
			"block-editor-xl-seam-light",
			"Preview rail scrolled to the seam: the editor's Schedule, Advanced and Save Changes above the page preview",
		);
	}

	// 1024–1279px: the panel takes the preview's place, with Show preview.
	{
		const page = await open(ctx, {
			device: "desktop",
			scheme: "light",
			signedIn: true,
			viewport: { width: 1200, height: 900 },
		});
		await ctx.goto(page, "/admin/links");
		await page.getByRole("button", { name: `Edit ${block}` }).click();
		await page.getByRole("heading", { name: "Edit Link" }).waitFor();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 500 });
		await ctx.shot(page, {
			name: "block-editor-lg-light",
			description:
				"Block editor at 1200px: the panel replaces the preview; Show preview peeks at the page",
		});
	}

	// Phone: the editor opens in a 90vh bottom sheet.
	{
		const page = await open(ctx, { device: "phone", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/links");
		await page.getByRole("button", { name: `Edit ${block}` }).click();
		await page.getByRole("heading", { name: "Edit Link" }).waitFor();
		await ctx.prepare(page, { settleMs: 600 });
		await ctx.shot(page, {
			name: "block-editor-mobile-light",
			description: "Block editor below 1024px: a 90vh bottom sheet over the block list",
		});
	}

	// Block list filters: Drafts is a client-side view; Apply stays separate.
	{
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/links");
		await page.getByRole("button", { name: /^Drafts/ }).click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await shotUnion(
			ctx,
			page,
			[
				page.getByRole("group", { name: "Filter blocks" }),
				page.getByRole("list", { name: "Page blocks" }),
			],
			"block-filters-drafts-light",
			"Drafts filter: one draft row with its dot, beside the Apply 1 new action",
		);
		await page.getByRole("button", { name: /^Hidden/ }).click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await shotUnion(
			ctx,
			page,
			[
				page.getByRole("group", { name: "Filter blocks" }),
				page.getByRole("list", { name: "Page blocks" }),
			],
			"block-filters-hidden-light",
			"Hidden filter: the disabled block row at 60% opacity with its switch off",
		);
	}

	// Add block: the flat type picker below the list (opening it saves nothing).
	{
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/links");
		await page.getByRole("button", { name: "Add block" }).click();
		const cancel = page.getByRole("button", { name: "Cancel" });
		await cancel.scrollIntoViewIfNeeded();
		await page.evaluate(() => window.scrollBy(0, 220));
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		const grid = cancel.locator("xpath=following-sibling::div[1]");
		await shotUnion(
			ctx,
			page,
			[cancel, grid],
			"add-block-picker-light",
			"Add block opened: the dashed button turns into Cancel above the block type grid",
		);
	}
}

// ─── Settings form ───────────────────────────────────────────────────────────

async function settings(ctx: CaptureContext): Promise<void> {
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "desktop", scheme, signedIn: true });
		await ctx.goto(page, "/admin/settings/email");
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 400 });
		await ctx.shot(page, {
			name: `settings-form-${scheme}`,
			description: `Settings → Email at 1440px: 176px section nav, form cards, no preview rail (${scheme})`,
		});
	}
	{
		const page = await open(ctx, { device: "phone", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/settings/email");
		await ctx.prepare(page, { settleMs: 400 });
		await ctx.shot(page, {
			name: "settings-form-mobile-light",
			description: "Settings → Email on a phone: SubTabs strip instead of the side nav",
		});
	}
	// Invalid edit: email delivery without an API key or sender. Save disables.
	{
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/settings/email");
		await page.locator("#s-contact-delivery").click();
		await page.getByRole("option", { name: "Email only" }).click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 400 });
		const card = page.locator('[data-slot="card"]').filter({
			has: page.getByRole("heading", { name: "Contact-form delivery" }),
		});
		await shotUnion(
			ctx,
			page,
			[card, page.getByText("Fix the highlighted fields to save").locator("..")],
			"settings-invalid-light",
			"Settings → Email with Email only and no key: field error, save bar message and disabled Save",
		);
	}
}

// ─── Inbox ───────────────────────────────────────────────────────────────────

/** Only already-read messages are opened: opening an unread one marks it read. */
const READ_MESSAGE = "Sam Okafor";

async function inbox(ctx: CaptureContext): Promise<void> {
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "desktop", scheme, signedIn: true });
		await ctx.goto(page, "/admin/inbox");
		await page.getByRole("list", { name: "Messages" }).getByText(READ_MESSAGE).first().click();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 500 });
		await ctx.shot(page, {
			name: `inbox-split-${scheme}`,
			description: `Inbox list and detail at 1440px with a read message open (${scheme})`,
		});
	}
	{
		const page = await open(ctx, { device: "desktop", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/inbox");
		await page.getByRole("button", { name: "Select messages" }).click();
		const boxes = page.getByRole("list", { name: "Messages" }).getByRole("checkbox");
		await boxes.nth(2).check();
		await boxes.nth(3).check();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page, {
			name: "inbox-select-mode-light",
			description: "Inbox select mode: bulk bar with Select all, count, Mark Read, Delete and Done",
		});
	}
	{
		const page = await open(ctx, { device: "phone", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/inbox");
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page, {
			name: "inbox-mobile-light",
			description: "Inbox list on a phone",
		});
		await page.getByRole("list", { name: "Messages" }).getByText(READ_MESSAGE).first().click();
		await ctx.prepare(page, { settleMs: 600 });
		await ctx.shot(page, {
			name: "inbox-detail-mobile-light",
			description: "Inbox message in a bottom sheet below 768px",
		});
	}
}

// ─── Empty states (browser-side response overrides) ──────────────────────────

async function empty(ctx: CaptureContext): Promise<void> {
	// No blocks at all: the list's EmptyState and the preview's sample blocks.
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "desktop", scheme, signedIn: true });
		await overrideTrpc(page, {
			"blocks.list": () => [],
			"blocks.hasDraft": () => ({ hasDraft: false }),
		});
		await ctx.goto(page, "/admin/links");
		await page.getByText("No blocks yet", { exact: true }).waitFor();
		await previewReady(page);
		await parkPointer(page);
		await ctx.shot(page, {
			name: `links-empty-${scheme}`,
			description: `Links with no blocks: EmptyState card and the preview's Sample badge and sample blocks (${scheme})`,
		});
	}

	// Saved blocks that are all hidden: an honest empty preview, never samples.
	{
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await overrideTrpc(page, {
			"blocks.list": (data) =>
				Array.isArray(data) ? data.map((b) => ({ ...(b as object), isEnabled: false })) : data,
		});
		await ctx.goto(page, "/admin/links");
		await page.getByText("No visible blocks", { exact: true }).waitFor();
		await previewReady(page);
		await parkPointer(page);
		await shotRail(
			ctx,
			page,
			"preview-no-visible-blocks-light",
			"Every saved block hidden: No visible blocks and the public page's Nothing here yet panel",
		);
	}

	// A failed first load: QueryError with Retry instead of a permanent skeleton.
	{
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await failTrpc(page, "settings.getAll");
		await ctx.goto(page, "/admin/settings/email");
		const alert = page.getByRole("alert").filter({ hasText: "Couldn't load settings" });
		await alert.waitFor({ timeout: 45_000 });
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await shotUnion(
			ctx,
			page,
			[
				page.locator("main header").first(),
				page.getByRole("navigation", { name: "Settings sections" }).last(),
				alert,
			],
			"settings-query-error-light",
			"Settings → Email when settings.getAll fails: QueryError with Retry in place of the form",
		);
	}

	// Inbox with no messages.
	{
		const page = await open(ctx, { device: "desktop", scheme: "light", signedIn: true });
		await overrideTrpc(page, {
			"forms.list": () => [],
			"forms.count": () => ({ total: 0 }),
			"forms.unreadCount": () => ({ count: 0 }),
		});
		await ctx.goto(page, "/admin/inbox");
		await page.getByText("No messages yet", { exact: true }).waitFor();
		await parkPointer(page);
		await ctx.shot(page, {
			name: "inbox-empty-light",
			description: "Inbox with no messages: the shared EmptyState card under the header controls",
		});
	}
}

// ─── Setup wizard (browser-side hasUsers override) ───────────────────────────

const SETUP_PROGRESS_KEY = "linkden_setup_progress";

/** Crop the wizard column from the brand row to the bottom of the step card. */
async function shotWizard(
	ctx: CaptureContext,
	page: Page,
	name: string,
	description: string,
): Promise<void> {
	const rect = await page.evaluate(() => {
		const column = document.querySelector("main > div");
		const card = column?.querySelector(":scope > div.min-w-0 > div.rounded-xl");
		const brand = column?.firstElementChild;
		if (!column || !card || !brand) return null;
		const c = column.getBoundingClientRect();
		const top = brand.getBoundingClientRect().top + window.scrollY;
		const bottom = card.getBoundingClientRect().bottom + window.scrollY;
		return { x: c.left, y: top, width: c.width, height: bottom - top };
	});
	if (!rect) throw new Error(`${name}: wizard column not found`);
	const pad = 16;
	// 8px below the card: the restored-progress note sits 12px under it.
	const below = 8;
	await ctx.shot(page, {
		name,
		description,
		fullPage: true,
		clip: {
			x: Math.max(0, Math.floor(rect.x - pad)),
			y: Math.max(0, Math.floor(rect.y - pad)),
			width: Math.ceil(rect.width + 2 * pad),
			height: Math.ceil(rect.height + pad + below),
		},
	});
}

async function openWizard(
	ctx: CaptureContext,
	options: ContextOptions,
	progress?: Record<string, unknown>,
): Promise<Page> {
	const page = await open(ctx, options);
	await overrideTrpc(page, { "public.hasUsers": () => ({ hasUsers: false }) });
	if (progress) {
		await page.addInitScript(
			({ key, value }) => {
				try {
					localStorage.setItem(key, value);
				} catch {
					/* opaque origin */
				}
			},
			{ key: SETUP_PROGRESS_KEY, value: JSON.stringify(progress) },
		);
	}
	await ctx.goto(page, "/admin/setup");
	await page.locator("[data-step-heading]").first().waitFor({ timeout: 30_000 });
	await parkPointer(page);
	await ctx.prepare(page, { settleMs: 300 });
	return page;
}

async function setup(ctx: CaptureContext): Promise<void> {
	const profile = {
		name: "Rowan Ellis",
		displayName: "Rowan Ellis",
		bio: "Product designer and illustrator. I make calm interfaces, field guides and the occasional zine.",
		themePreset: "default",
	};
	for (const scheme of SCHEMES) {
		const page = await openWizard(ctx, { device: "element", scheme });
		await shotWizard(
			ctx,
			page,
			`setup-account-${scheme}`,
			`Setup step 1: step indicator and the Create your admin account card (${scheme})`,
		);
	}
	{
		const page = await openWizard(
			ctx,
			{ device: "element", scheme: "light" },
			{ ...profile, step: 2 },
		);
		await shotWizard(ctx, page, "setup-profile-light", "Setup step 2: Set up your profile");
	}
	{
		const page = await openWizard(
			ctx,
			{ device: "element", scheme: "light" },
			{ ...profile, step: 3 },
		);
		await shotWizard(ctx, page, "setup-theme-light", "Setup step 3: Choose a theme");
	}
	{
		const page = await openWizard(
			ctx,
			{ device: "element", scheme: "light" },
			{ ...profile, step: 4 },
		);
		await shotWizard(
			ctx,
			page,
			"setup-launch-light",
			"Setup step 4: the launch card, without the step indicator",
		);
	}
	// Phone: below sm the column starts under the top-right theme toggle (pt-20).
	{
		const page = await openWizard(ctx, { device: "phone", scheme: "light" });
		await ctx.shot(page, {
			name: "setup-account-mobile-light",
			fullPage: true,
			description:
				"Setup step 1 on a 390px phone: theme toggle at the top right, brand row below it, step indicator and the account card",
		});
	}
}

// ─── Login ───────────────────────────────────────────────────────────────────

/** The development-only bypass button is not part of the deployed login page. */
async function hideDevLogin(page: Page): Promise<void> {
	await page
		.getByRole("button", { name: "Dev login (bypass)" })
		.waitFor({ timeout: 5_000 })
		.catch(() => {});
	await page.evaluate(() => {
		for (const button of document.querySelectorAll("button")) {
			if (button.textContent?.trim() === "Dev login (bypass)") button.style.display = "none";
		}
	});
}

async function login(ctx: CaptureContext): Promise<void> {
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "desktop", scheme });
		await ctx.goto(page, "/admin/login");
		await page.getByLabel("Email").waitFor();
		await hideDevLogin(page);
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page, {
			name: `login-${scheme}`,
			description: `Login at 1440px: compact centered card with site branding (${scheme})`,
		});
	}
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "phone", scheme });
		await ctx.goto(page, "/admin/login");
		await page.getByLabel("Email").waitFor();
		await hideDevLogin(page);
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page, {
			name: `login-mobile-${scheme}`,
			description: `Login on a phone (${scheme})`,
		});
	}
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "element", scheme });
		await ctx.goto(page, "/admin/login");
		await page.getByRole("button", { name: "Forgot password?" }).click();
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page.locator("main .rounded-xl").first(), {
			name: `login-forgot-${scheme}`,
			description: `Forgot password without email configured: Reset from the server card (${scheme})`,
		});
	}
	// Two-factor step: the sign-in POST is answered locally with twoFactorRedirect.
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "element", scheme });
		await mockTwoFactor(page);
		await ctx.goto(page, "/admin/login");
		await page.getByLabel("Email").fill("rowan@example.com");
		await page.locator("#password").fill("not-a-real-password");
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await page.getByRole("heading", { name: "Two-factor check" }).waitFor();
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page.locator("main .rounded-xl").first(), {
			name: `login-two-factor-${scheme}`,
			description: `Two-factor check after a password sign-in: code field, 30-day trust, backup-code switch (${scheme})`,
		});
	}
}

// ─── Public layouts ──────────────────────────────────────────────────────────

async function publicLayouts(ctx: CaptureContext): Promise<void> {
	// The split page at 1440px and on a 390px phone are the overview group's
	// public-split-* and public-profile-mobile-* captures; patterns.mdx imports
	// those instead of keeping identical copies here.
	// Below the 896px container threshold a desktop window stacks too.
	for (const scheme of SCHEMES) {
		const page = await open(ctx, {
			device: "desktop",
			scheme,
			viewport: { width: 860, height: 900 },
		});
		await ctx.goto(page, "/");
		await ctx.prepare(page, { settleMs: 800 });
		await ctx.shot(page, {
			name: `public-narrow-860-${scheme}`,
			description: `Split page in an 860px window: under the 896px container threshold it stacks (${scheme})`,
		});
	}
}

// ─── Wallet preview ──────────────────────────────────────────────────────────

async function wallet(ctx: CaptureContext): Promise<void> {
	for (const scheme of SCHEMES) {
		const page = await open(ctx, { device: "desktop", scheme, signedIn: true });
		await ctx.goto(page, "/admin/settings/wallet");
		await rail(page).getByText("Scan to view profile").waitFor({ timeout: 30_000 });
		await ctx.prepare(page, { settleMs: 800 });
		await parkPointer(page);
		await ctx.shot(page, {
			name: `wallet-settings-${scheme}`,
			description: `Settings → Wallet: pass editor beside the 425px wide preview rail (${scheme})`,
		});
	}
	{
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await ctx.goto(page, "/admin/settings/wallet");
		const card = rail(page).locator(".rounded-\\[20px\\]").first();
		await card.waitFor({ timeout: 30_000 });
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 800 });
		await ctx.shot(card, {
			name: "wallet-pass-card",
			description:
				"WalletPassPreview card: logo chip, header field, name and thumbnail, secondary fields, QR",
			padding: 12,
		});
		// Focus inside a field section outlines the matching zone on the card.
		await page.getByRole("group", { name: "Secondary fields" }).locator("input").first().focus();
		await ctx.prepare(page, { keepFocus: true, settleMs: 300 });
		await ctx.shot(card, {
			name: "wallet-zone-highlight",
			description:
				"Focus in the Secondary fields editor outlines the secondary row on the pass card",
			padding: 12,
		});
	}
}

const RUNNERS: Record<Section, (ctx: CaptureContext) => Promise<void>> = {
	shell,
	preview,
	save,
	editor,
	settings,
	inbox,
	empty,
	setup,
	login,
	public: publicLayouts,
	wallet,
};

export async function capture(ctx: CaptureContext): Promise<void> {
	for (const section of SECTIONS) {
		if (wanted(section)) await RUNNERS[section](ctx);
	}
}
