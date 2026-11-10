// ─── Components group ────────────────────────────────────────────────────────
// Element crops for apps/docs/content/docs/design-system/components.mdx: the
// shared primitives and admin building blocks exactly where the real app
// renders them (buttons, fields, ColorField, ImageUploadField, cards, page
// headers, navigation, StickySaveBar, the publication pill, badges, dialogs,
// toasts and QueryError).
//
// Read-only: every page aborts non-GET requests to /trpc and /api, so a stray
// click can never save, apply, delete, upload or mark a message read. Edits are
// typed and then abandoned with the context; dialogs and menus are dismissed.
// The QueryError capture also aborts the settings read itself (a simulated
// network failure), the EmptyState capture rewrites the Inbox list read to an
// empty list in the browser, and the skeleton capture holds that read open.
// None of these change anything on the server.
//
// COMPONENTS_ONLY=buttons,fields,… limits a run to some sections (see SECTIONS).

import type { Locator, Page } from "@playwright/test";
import { type CaptureContext, type ContextOptions, env, type Scheme } from "../lib";

const SECTIONS = [
	"buttons",
	"fields",
	"color",
	"uploads",
	"cards",
	"headers",
	"nav",
	"mobile",
	"save",
	"pill",
	"badges",
	"dialogs",
	"feedback",
	"extras",
] as const;
type Section = (typeof SECTIONS)[number];

function wanted(section: Section): boolean {
	const only = env("COMPONENTS_ONLY");
	if (!only) return true;
	return only.split(",").includes(section);
}

const SCHEMES: readonly Scheme[] = ["light", "dark"];

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
	// A long run opens many signed-in contexts; the session probe can be briefly
	// rate-limited and report "Sign-in failed". Back off and retry a few times.
	let page: Page | undefined;
	for (let attempt = 1; !page; attempt++) {
		try {
			page = await ctx.page(options);
		} catch (error) {
			if (attempt >= 4 || !String(error).includes("Sign-in failed")) throw error;
			console.warn(`  sign-in check failed (attempt ${attempt}); retrying in 15s`);
			await new Promise((resolve) => setTimeout(resolve, 15_000));
		}
	}
	// Fail fast on a wrong selector instead of Playwright's 30s default.
	page.setDefaultTimeout(12_000);
	await readOnly(page);
	return page;
}

/** An element-scale (2x) signed-in admin page at `path`. */
async function admin(
	ctx: CaptureContext,
	scheme: Scheme,
	path: string,
	device: ContextOptions["device"] = "element",
): Promise<Page> {
	const page = await open(ctx, { device, scheme, signedIn: true });
	await ctx.goto(page, path);
	return page;
}

/** A viewport clip around several elements (all must be on screen), padded. */
async function unionClip(
	page: Page,
	targets: Locator[],
	pad = 16,
): Promise<{ x: number; y: number; width: number; height: number }> {
	const boxes = [];
	for (const target of targets) {
		const box = await target.boundingBox();
		if (!box) throw new Error(`unionClip: target not visible (${target})`);
		boxes.push(box);
	}
	const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
	const left = Math.min(...boxes.map((b) => b.x));
	const top = Math.min(...boxes.map((b) => b.y));
	const right = Math.max(...boxes.map((b) => b.x + b.width));
	const bottom = Math.max(...boxes.map((b) => b.y + b.height));
	const x = Math.max(0, Math.floor(left - pad));
	const y = Math.max(0, Math.floor(top - pad));
	return {
		x,
		y,
		width: Math.min(viewport.width, Math.ceil(right + pad)) - x,
		height: Math.min(viewport.height, Math.ceil(bottom + pad)) - y,
	};
}

/** Park the pointer where it hovers nothing interactive. */
async function parkMouse(page: Page): Promise<void> {
	await page.mouse.move(700, 880);
}

/** "View live" is an anchor rendered through Button (`nativeButton={false}`), so its role is button. */
const viewLive = (page: Page): Locator => page.locator("header a", { hasText: "View live" });

const card = (page: Page, text: string): Locator =>
	page.locator('[data-slot="card"]', { hasText: text }).first();

// ─── Buttons ─────────────────────────────────────────────────────────────────

async function buttons(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const page = await admin(ctx, scheme, "/admin/settings/data");
	await ctx.shot(card(page, "Danger zone"), {
		name: `danger-zone-${scheme}`,
		description: `Settings → Data danger zone: outline sm "Delete" and destructive sm "Reset…" buttons on the destructive-tinted card, ${scheme}`,
	});

	const pill = page.getByRole("button", { name: /^Publishing:/ });
	const live = viewLive(page);
	await parkMouse(page);
	await ctx.shot(page, {
		name: `top-bar-actions-${scheme}`,
		description: `Top-bar actions: publication pill (outline xs, rounded-full), Share (ghost icon), View live (outline sm), ${scheme}`,
		clip: await unionClip(page, [pill, live], 12),
	});
}

// ─── Inputs, Textarea, Select, Switch, Checkbox ──────────────────────────────

async function fields(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	// Profile card: SectionHeader, avatar ImageUploadField, Input, Textarea, CharCount.
	const profile = await admin(ctx, scheme, "/admin/links/profile");
	await ctx.shot(card(profile, "Profile Info"), {
		name: `profile-card-${scheme}`,
		description: `Links → Profile card: SectionHeader, round ImageUploadField with Replace/Re-crop/Remove, Input and Textarea with CharCount, ${scheme}`,
	});
	const name = profile.getByLabel("Display Name");
	await name.focus();
	await ctx.prepare(profile, { keepFocus: true });
	await ctx.shot(name.locator("xpath=.."), {
		name: `input-focus-${scheme}`,
		description: `Display Name Input with keyboard focus: 2px ring with offset, ${scheme}`,
	});

	// Email: SectionCard + FieldGroup columns={2} + SecretInput + Input, at rest.
	const email = await admin(ctx, scheme, "/admin/settings/email");
	await ctx.shot(card(email, "Email provider"), {
		name: `email-provider-card-${scheme}`,
		description: `Settings → Email: SectionCard with FieldGroup columns={2}, SecretInput (API Key) and Input (From Address), ${scheme}`,
	});

	// Select open (the popup is a portal: clip the trigger and the list together).
	const trigger = email.getByRole("combobox", { name: "Deliver messages to" });
	await trigger.click();
	const listbox = email.getByRole("listbox");
	await listbox.waitFor();
	await email.getByRole("option", { name: "Inbox and email" }).hover();
	await ctx.prepare(email, { keepFocus: true, settleMs: 150 });
	await ctx.shot(email, {
		name: `select-open-${scheme}`,
		description: `Select open: selected item check, highlighted option with primary tint and inset ring, ${scheme}`,
		clip: await unionClip(email, [trigger.locator("xpath=.."), listbox]),
	});
	await email.keyboard.press("Escape");

	// Invalid value: aria-invalid border + FieldError, and the save bar's error mode.
	const from = email.getByLabel("From Address");
	await from.fill("studio@");
	await from.blur();
	await email.getByText("Fix the highlighted fields to save").waitFor();
	await email.waitForTimeout(900); // FieldError appears after its 700ms debounce.
	await ctx.prepare(email);
	await parkMouse(email);
	const column = email.locator("main .space-y-6").first();
	await ctx.shot(column, {
		name: `field-error-save-bar-${scheme}`,
		description: `Invalid From Address: destructive border and FieldError, StickySaveBar in error mode with Save disabled, ${scheme}`,
	});

	// Account: Switch off / disabled, secondary Badge, outline buttons.
	const account = await admin(ctx, scheme, "/admin/settings");
	await ctx.shot(card(account, "Login & Security"), {
		name: `login-security-card-${scheme}`,
		description: `Settings → Account: Switch off and disabled, secondary Badge, outline Change buttons, ${scheme}`,
	});

	// Checkbox on the signed-out login page.
	const login = await open(ctx, { device: "element", scheme });
	await ctx.goto(login, "/admin/login");
	const remember = login.getByRole("checkbox", { name: "Keep me signed in" });
	const label = login.locator('label[for="remember-me"]');
	// The label is flex-1 (a 44px-tall full-width hit area); clip to its text.
	const checkboxClip = async () => {
		const box = await remember.boundingBox();
		const text = await label.evaluate((el) => {
			const range = document.createRange();
			range.selectNodeContents(el);
			const r = range.getBoundingClientRect();
			return { right: r.right, top: r.top, bottom: r.bottom };
		});
		if (!box) throw new Error("checkbox not visible");
		const pad = 12;
		const top = Math.min(box.y, text.top) - pad;
		const bottom = Math.max(box.y + box.height, text.bottom) + pad;
		return {
			x: Math.floor(box.x - pad),
			y: Math.floor(top),
			width: Math.ceil(text.right + pad - (box.x - pad)),
			height: Math.ceil(bottom - top),
		};
	};
	// "Keep me signed in" starts checked; capture both states (toggling is local state only).
	for (let i = 0; i < 2; i++) {
		const checked = (await remember.getAttribute("aria-checked")) === "true";
		await ctx.prepare(login);
		await parkMouse(login);
		await ctx.shot(login, {
			name: `checkbox-${checked ? "checked" : "unchecked"}-${scheme}`,
			description: checked
				? `Checkbox checked: primary fill with primary-foreground check ("Keep me signed in" on the login page), ${scheme}`
				: `Checkbox unchecked: 3:1 input-border boundary ("Keep me signed in" on the login page), ${scheme}`,
			clip: await checkboxClip(),
		});
		await label.click();
		await login.waitForFunction(
			(was) =>
				document.querySelector('[role="checkbox"]')?.getAttribute("aria-checked") !== String(was),
			checked,
		);
	}
}

// ─── ColorField ──────────────────────────────────────────────────────────────

async function color(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const page = await admin(ctx, scheme, "/admin/design");
	const primary = page.locator("#color-primary");
	const accent = page.locator("#color-accent");
	const grid = primary.locator('xpath=ancestor::div[contains(@class,"grid")][1]');

	// The guard compares against the preset background of the previewed mode, so
	// "passes" and "fails" need a different sample colour per scheme.
	const sample =
		scheme === "light"
			? { pass: "#1D4ED8", fail: "#0FACED" }
			: { pass: "#7DD3FC", fail: "#1D4ED8" };
	await primary.fill(sample.pass);
	await primary.blur();
	await ctx.prepare(page);
	await parkMouse(page);
	await ctx.shot(primary.locator('xpath=ancestor::div[contains(@class,"space-y-1.5")][1]'), {
		name: `color-field-pass-${scheme}`,
		description: `ColorField with a passing contrast guard (ratio vs background, passes AA), ${scheme}`,
		padding: 12,
	});

	await primary.fill(sample.fail);
	await primary.blur();
	await accent.fill("teal");
	await accent.blur();
	await page.getByText("Enter a valid hex colour").waitFor();
	await ctx.prepare(page);
	await parkMouse(page);
	await ctx.shot(grid, {
		name: `color-field-states-${scheme}`,
		description: `ColorField grid: Primary fails AA with the Fix chip, Accent shows the invalid-hex error, Secondary/Background empty with preset placeholders, ${scheme}`,
	});
}

// ─── ImageUploadField, crop dialog, toast ────────────────────────────────────

async function uploads(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const branding = await admin(ctx, scheme, "/admin/design/branding");
	// Logo + favicon: two unlabeled fields, each named by its fieldset legend.
	const logo = branding.getByRole("button", { name: "Change logo" });
	await parkMouse(branding);
	await ctx.shot(logo.locator("xpath=ancestor::fieldset[1]/.."), {
		name: `image-upload-empty-${scheme}`,
		description: `Empty ImageUploadField dropzones inside fieldsets: logo (aspectRatio "logo", rounded square) and favicon ("square", circle), ${scheme}`,
	});

	const banner = await admin(ctx, scheme, "/admin/design/banner");
	await ctx.shot(banner.getByRole("button", { name: "Change Banner Image" }).locator("xpath=.."), {
		name: `image-upload-banner-${scheme}`,
		description: `Banner ImageUploadField with an uploaded image and its Replace/Re-crop/Remove actions, ${scheme}`,
	});

	// Choosing a file opens the crop dialog; nothing uploads until Use image.
	const profile = await admin(ctx, scheme, "/admin/links/profile");
	const avatarSrc = await profile
		.getByRole("button", { name: "Change Avatar" })
		.locator("img")
		.getAttribute("src");
	if (!avatarSrc) throw new Error("avatar image not found");
	const bytes = await (await profile.request.get(new URL(avatarSrc, ctx.baseUrl).href)).body();
	const input = profile.locator('input[type="file"]').first();
	await input.setInputFiles({ name: "studio-avatar.png", mimeType: "image/png", buffer: bytes });
	const dialog = profile.getByRole("dialog");
	await dialog.waitFor();
	await ctx.prepare(profile, { settleMs: 300 });
	await parkMouse(profile);
	await ctx.shot(dialog, {
		name: `image-crop-dialog-${scheme}`,
		description: `ImageCropDialog for an avatar: square crop area, zoom slider, rotate, Cancel (ghost) and confirm, ${scheme}`,
	});
	await dialog.getByRole("button", { name: "Cancel" }).click();
	await dialog.waitFor({ state: "hidden" });

	// A non-image file is rejected client-side with an error toast.
	await input.setInputFiles({
		name: "notes.txt",
		mimeType: "text/plain",
		buffer: Buffer.from("not an image"),
	});
	const toast = profile.locator("[data-sonner-toast]").first();
	await toast.waitFor();
	await ctx.prepare(profile, { settleMs: 400 });
	await parkMouse(profile);
	await ctx.shot(toast, {
		name: `toast-error-${scheme}`,
		description: `Sonner error toast (richColors) after choosing a non-image file, ${scheme}`,
		padding: 8,
	});
}

// ─── Cards and section labels ────────────────────────────────────────────────

async function cards(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const seo = await admin(ctx, scheme, "/admin/design/seo");
	const seoCard = card(seo, "SEO & Open Graph");
	await seoCard.evaluate((el) => el.scrollIntoView({ block: "start" }));
	await seo.evaluate(() => window.scrollBy(0, -40));
	await ctx.prepare(seo);
	await parkMouse(seo);
	// From above the card's top edge down to the first field's hint (the card continues below).
	const cardBox = await seoCard.boundingBox();
	const hintBox = await seo.getByText(/^Shown in browser tab/).boundingBox();
	if (!cardBox || !hintBox) throw new Error("SEO card not visible");
	await ctx.shot(seo, {
		name: `section-label-${scheme}`,
		description: `SectionCard header (icon tile, title, description, hairline) with a SectionLabel ("Meta Tags") and a field, ${scheme}`,
		clip: {
			x: Math.floor(cardBox.x - 16),
			y: Math.floor(cardBox.y - 16),
			width: Math.ceil(cardBox.width + 32),
			height: Math.ceil(hintBox.y + hintBox.height + 20 - (cardBox.y - 16)),
		},
	});

	const pub = await open(ctx, { device: "element", scheme });
	await ctx.goto(pub, "/");
	// HeaderBlock: SectionRule (as="div") wraps the real h2 with the dash and running hairline.
	await ctx.shot(
		pub.locator(".ld-header-block", { hasText: "Latest work" }).locator("> div").first(),
		{
			name: `section-rule-public-${scheme}`,
			description: `Public SectionRule: signal dash, h2 and hairline rule ("Latest work" header block), ${scheme}`,
			padding: 12,
		},
	);
}

// ─── PageHeader, SubTabs, settings nav ───────────────────────────────────────

async function headers(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const links = await admin(ctx, scheme, "/admin/links");
	await parkMouse(links);
	await ctx.shot(links, {
		name: `page-header-links-${scheme}`,
		description: `PageHeader h1, SubTabs (Blocks active), block filter ToggleGroup and the primary "Apply 1 new" button, ${scheme}`,
		clip: await unionClip(links, [
			links.getByRole("heading", { level: 1, name: "Links" }),
			links.getByRole("navigation", { name: "Links sections" }),
			links.getByRole("button", { name: /Apply/ }),
		]),
	});

	const inbox = await admin(ctx, scheme, "/admin/inbox");
	await parkMouse(inbox);
	await ctx.shot(inbox.locator("main header").first(), {
		name: `page-header-inbox-${scheme}`,
		description: `Inbox PageHeader with actions: instant-save Switch (on), filter buttons, Select and Mark All Read, ${scheme}`,
	});

	const settings = await admin(ctx, scheme, "/admin/settings/email");
	await parkMouse(settings);
	const nav = settings.getByRole("navigation", { name: "Settings sections" }).last();
	await ctx.shot(settings, {
		name: `settings-nav-${scheme}`,
		description: `Settings section nav at xl: ghost lg Buttons rendered as links, active item with primary/10 fill, ${scheme}`,
		clip: await unionClip(settings, [nav], 12),
	});
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

async function nav(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const page = await admin(ctx, scheme, "/admin/links");
	const header = page.locator('[data-sidebar="header"]').first();
	const mainNav = page.locator('[data-sidebar="sidebar"] nav[aria-label="Main navigation"]');
	await page.getByRole("link", { name: "Design", exact: true }).first().hover();
	await ctx.prepare(page, { settleMs: 150 });
	await ctx.shot(page, {
		name: `sidebar-${scheme}`,
		description: `Sidebar: brand row, Create/Manage group labels, active Profile page, hovered Design, Inbox unread badge, ${scheme}`,
		clip: await unionClip(page, [header, mainNav], 0),
	});

	// Account menu (dropdown) from the sidebar footer.
	const accountButton = page.locator('[data-sidebar="footer"]').getByRole("button", {
		name: "Account menu",
	});
	await accountButton.click();
	const menu = page.getByRole("menu");
	await menu.waitFor();
	await ctx.prepare(page, { keepFocus: true, settleMs: 150 });
	await parkMouse(page);
	await ctx.shot(page, {
		name: `account-menu-${scheme}`,
		description: `Account DropdownMenu opened from the sidebar footer: identity header and account actions, ${scheme}`,
		clip: await unionClip(page, [accountButton, menu]),
	});
	await page.keyboard.press("Escape");

	// Collapsed icon rail with a tooltip (a per-browser UI preference, not saved data).
	await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
	await page.waitForTimeout(400);
	const inbox = page.getByRole("link", { name: /^Inbox/ }).first();
	await inbox.hover();
	const tooltip = page.locator('[data-slot="tooltip-content"]').first();
	await tooltip.waitFor();
	await ctx.prepare(page, { settleMs: 200 });
	await ctx.shot(page, {
		name: `sidebar-collapsed-${scheme}`,
		description: `Collapsed icon rail: active item, badge hidden, label shown as a Tooltip on hover, ${scheme}`,
		clip: await unionClip(page, [header, mainNav, tooltip], 0),
	});
}

// ─── Phone: bottom tab bar, More menu, save bar above the tab bar ────────────

async function mobile(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const page = await admin(ctx, scheme, "/admin/links", "phone");
	const bar = page
		.locator("nav.fixed")
		.filter({ has: page.getByRole("button", { name: "More navigation" }) });
	await ctx.shot(bar, {
		name: `bottom-tab-bar-${scheme}-mobile`,
		description: `Bottom tab bar below lg: Profile active, Inbox with unread badge, More, ${scheme}`,
		padding: 0,
	});
	await page.getByRole("button", { name: "More navigation" }).click();
	const menu = page.getByRole("menu");
	await menu.waitFor();
	await ctx.prepare(page, { keepFocus: true, settleMs: 150 });
	await ctx.shot(page, {
		name: `bottom-tab-more-${scheme}-mobile`,
		description: `More menu above the tab bar: Design and Settings, ${scheme}`,
		clip: await unionClip(page, [bar, menu], 0),
	});
	await page.keyboard.press("Escape");

	// A long form, so the sticky save bar rests above the fixed tab bar.
	const branding = await admin(ctx, scheme, "/admin/design/branding", "phone");
	const site = branding.getByLabel("Site Name");
	await site.fill("Ellis Studio");
	await site.blur();
	const saveBar = branding.getByText("You have unsaved changes").locator("xpath=..");
	await saveBar.waitFor();
	await branding.evaluate(() => window.scrollTo(0, 900));
	await ctx.prepare(branding);
	const tabBar = branding
		.locator("nav.fixed")
		.filter({ has: branding.getByRole("button", { name: "More navigation" }) });
	await ctx.shot(branding, {
		name: `sticky-save-bar-${scheme}-mobile`,
		description: `StickySaveBar on a phone: stacked message and actions, resting 8px above the 56px bottom tab bar, ${scheme}`,
		clip: await unionClip(branding, [saveBar, tabBar], 0).then((clip) => ({
			...clip,
			y: Math.max(0, clip.y - 24),
			height: clip.height + Math.min(24, clip.y),
		})),
	});
}

// ─── StickySaveBar (desktop) + Unsaved pill ──────────────────────────────────

async function save(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const page = await admin(ctx, scheme, "/admin/settings/email");
	const from = page.getByLabel("From Address");
	await from.fill("studio@example.com");
	await from.blur();
	const bar = page.getByText("You have unsaved changes").locator("xpath=..");
	await bar.waitFor();
	await ctx.prepare(page);
	await parkMouse(page);
	await ctx.shot(bar, {
		name: `sticky-save-bar-${scheme}`,
		description: `StickySaveBar while a form is dirty: message, ghost Discard, default Save changes, ${scheme}`,
	});
	const pill = page.getByRole("button", { name: /^Publishing:/ });
	await ctx.shot(page, {
		name: `state-pill-unsaved-${scheme}`,
		description: `Publication pill reading "Unsaved" with the warning outline while any form is dirty, ${scheme}`,
		clip: await unionClip(page, [pill, viewLive(page)], 12),
	});
}

// ─── Publication pill menu ───────────────────────────────────────────────────

async function pill(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const page = await admin(ctx, scheme, "/admin/links");
	const trigger = page.getByRole("button", { name: /^Publishing:/ });
	await trigger.click();
	const popover = page.locator('[data-slot="popover-content"]').first();
	await popover.waitFor();
	await ctx.prepare(page, { keepFocus: true, settleMs: 150 });
	await parkMouse(page);
	await ctx.shot(page, {
		name: `state-pill-menu-${scheme}`,
		description: `StatePill popover: Publish changes title, unavailable reason, Review block drafts link, Refresh status (ghost) and disabled Publish, ${scheme}`,
		clip: await unionClip(page, [trigger, popover]),
	});
	await page.keyboard.press("Escape");
}

// ─── Badges ──────────────────────────────────────────────────────────────────

async function badges(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const wallet = await admin(ctx, scheme, "/admin/settings/wallet");
	const heading = wallet.getByRole("heading", { name: "Apple Wallet pass" });
	await ctx.shot(heading.locator("xpath=../.."), {
		name: `badge-wallet-${scheme}`,
		description: `Outline Badge with warning text ("Setup required") beside a section heading, plus an off Switch, ${scheme}`,
		padding: 12,
	});
	const tabs = wallet.getByRole("tablist").first();
	// The strip overflows its 421px column and loads scrolled to the end, which
	// hides the active first tab; show it from the start (a user scroll).
	await tabs.evaluate((el) => {
		el.scrollLeft = 0;
	});
	await ctx.prepare(wallet);
	await ctx.shot(tabs, {
		name: `wallet-tabs-${scheme}`,
		description: `Tabs from @linkden/ui styled like SubTabs: icon + label, 2px foreground underline on the active tab, ${scheme}`,
		padding: 12,
	});

	// A message that is already read: opening it never marks anything.
	const inbox = await admin(ctx, scheme, "/admin/inbox");
	await inbox.getByText("Sam Okafor").first().click();
	const detail = inbox.getByRole("heading", { level: 2, name: "Sam Okafor" });
	await detail.waitFor();
	await ctx.prepare(inbox);
	await parkMouse(inbox);
	const panel = inbox.locator('[data-slot="card"]').filter({ has: detail }).first();
	await ctx.shot(panel, {
		name: `inbox-detail-${scheme}`,
		description: `Inbox message detail: secondary "Read" Badge, message body, Reply and destructive Delete actions, ${scheme}`,
	});
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────

async function dialogs(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const links = await admin(ctx, scheme, "/admin/links");
	await links.getByRole("button", { name: "Delete Section break" }).click();
	const confirm = links.getByRole("alertdialog");
	await confirm.waitFor();
	await ctx.prepare(links, { keepFocus: true, settleMs: 200 });
	await parkMouse(links);
	await ctx.shot(confirm, {
		name: `confirm-dialog-${scheme}`,
		description: `ConfirmDialog for deleting a block: title, description, Cancel first (initial focus), destructive Delete, ${scheme}`,
		padding: 24,
	});
	await confirm.getByRole("button", { name: "Cancel" }).click();
	await confirm.waitFor({ state: "hidden" });

	const data = await admin(ctx, scheme, "/admin/settings/data");
	await data.getByRole("button", { name: "Reset…" }).click();
	const danger = data.getByRole("alertdialog");
	await danger.waitFor();
	await danger.getByRole("textbox").fill("RES");
	await ctx.prepare(data, { keepFocus: true, settleMs: 200 });
	await parkMouse(data);
	await ctx.shot(danger, {
		name: `danger-confirm-dialog-${scheme}`,
		description: `DangerConfirmDialog: type-to-confirm input with a partial word, destructive action still disabled, ${scheme}`,
		padding: 24,
	});
	await danger.getByRole("button", { name: "Cancel" }).click();
	await danger.waitFor({ state: "hidden" });
}

// ─── QueryError + AdminFooter ────────────────────────────────────────────────

async function feedback(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	const page = await open(ctx, { device: "element", scheme, signedIn: true });
	// Simulated outage of the settings read only (React Query retries, then errors).
	await page.route(/\/trpc\/[^?]*settings\.getAll/, (route) => route.abort());
	await ctx.goto(page, "/admin/settings/email");
	const error = page.getByRole("alert").filter({ hasText: "Couldn't load settings" });
	await error.waitFor({ timeout: 45_000 });
	await error.evaluate((el) => el.scrollIntoView({ block: "center" }));
	await ctx.prepare(page);
	await parkMouse(page);
	await ctx.shot(page, {
		clip: await unionClip(
			page,
			[error.locator("svg").first(), error.locator("p"), error.getByRole("button")],
			32,
		),
		name: `query-error-${scheme}`,
		description: `QueryError after the settings read failed: destructive icon, message and outline Retry, ${scheme}`,
	});

	const links = await admin(ctx, scheme, "/admin/links/social");
	await parkMouse(links);
	await ctx.shot(links.locator("footer").last(), {
		name: `admin-footer-${scheme}`,
		description: `AdminFooter: Powered by LinkDen, version, Development tag and the ThemeToggle segmented control, ${scheme}`,
		padding: 0,
	});
}

// ─── Dialog, EmptyState, SkeletonRows, link button ───────────────────────────

/**
 * Replace the data of some tRPC queries in the browser (batched GETs included),
 * leaving every other procedure in the batch untouched. Server state is never
 * read differently or written: only this page's copy of the response changes.
 */
async function stubQueries(page: Page, stubs: Record<string, unknown>): Promise<void> {
	await page.route(/\/trpc\//, async (route) => {
		const request = route.request();
		if (request.method() !== "GET") return route.fallback();
		const url = new URL(request.url());
		const procedures = decodeURIComponent(url.pathname.replace(/^.*\/trpc\//, "")).split(",");
		if (!procedures.some((name) => name in stubs)) return route.fallback();
		const response = await route.fetch();
		let body = (await response.json()) as unknown;
		if (url.searchParams.has("batch") && Array.isArray(body)) {
			const batch = body as unknown[];
			procedures.forEach((name, i) => {
				if (name in stubs) batch[i] = { result: { data: stubs[name] } };
			});
		} else {
			body = { result: { data: stubs[procedures[0] ?? ""] } };
		}
		return route.fulfill({ response, json: body });
	});
}

async function extras(ctx: CaptureContext, scheme: Scheme): Promise<void> {
	// Dialog: Social → "Add Behance" with an invalid URL typed (Add Network stays disabled).
	const social = await admin(ctx, scheme, "/admin/links/social");
	await social.getByRole("button", { name: /^Behance/ }).click();
	const dialog = social.getByRole("dialog");
	await dialog.waitFor();
	await dialog.getByLabel("URL").fill("behance.net/ellis");
	await dialog.getByText("Enter a valid URL").waitFor();
	await ctx.prepare(social, { settleMs: 200 });
	await parkMouse(social);
	await ctx.shot(dialog, {
		name: `dialog-add-network-${scheme}`,
		description: `Dialog (Social → Add Behance): title with brand tile, description, Input in its invalid state with the inline error, ghost Cancel and disabled default "Add Network", ${scheme}`,
		padding: 24,
	});
	await dialog.getByRole("button", { name: "Cancel" }).click();
	await dialog.waitFor({ state: "hidden" });

	// EmptyState: the Inbox with its list read rewritten to an empty list.
	const empty = await open(ctx, { device: "element", scheme, signedIn: true });
	await stubQueries(empty, {
		"forms.list": [],
		"forms.count": { total: 0 },
		"forms.unreadCount": { count: 0 },
	});
	await ctx.goto(empty, "/admin/inbox");
	const emptyCard = card(empty, "No messages yet");
	await emptyCard.waitFor();
	await parkMouse(empty);
	await ctx.shot(emptyCard, {
		name: `empty-state-${scheme}`,
		description: `EmptyState in the Inbox ("No messages yet"): Card, tinted icon disc, title and description, ${scheme}`,
	});

	// SkeletonRows: the Inbox while its list read is still in flight.
	const loading = await open(ctx, { device: "element", scheme, signedIn: true });
	let release: () => void = () => {};
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await loading.route(/\/trpc\/[^?]*forms\.list/, async (route) => {
		await held;
		await route.abort().catch(() => {});
	});
	await loading.goto(`${ctx.baseUrl}/admin/inbox`, {
		waitUntil: "domcontentloaded",
		timeout: 90_000,
	});
	const skeleton = loading.locator('main [aria-busy="true"]').first();
	await skeleton.waitFor();
	await ctx.prepare(loading);
	await parkMouse(loading);
	await ctx.shot(skeleton, {
		name: `skeleton-rows-${scheme}`,
		description: `SkeletonRows (count 4, h-14) while the Inbox list loads: role="status", aria-busy, ${scheme}`,
	});
	release();

	// Link variant: the login page's forgot-password view. Email is not configured
	// on this stack, so it shows the "Reset from the server" status card.
	const login = await open(ctx, { device: "element", scheme });
	await ctx.goto(login, "/admin/login");
	await login.getByRole("button", { name: "Forgot password?" }).click();
	const title = login.getByRole("heading", { name: "Reset from the server" });
	await login.getByRole("button", { name: "Back to sign in" }).waitFor();
	await ctx.prepare(login);
	await parkMouse(login);
	await ctx.shot(title.locator("xpath=.."), {
		name: `button-link-${scheme}`,
		description: `Login "Reset from the server" status card ending in a full-width link-variant Button ("Back to sign in"), ${scheme}`,
	});
}

const RUNNERS: Record<Section, (ctx: CaptureContext, scheme: Scheme) => Promise<void>> = {
	buttons,
	fields,
	color,
	uploads,
	cards,
	headers,
	nav,
	mobile,
	save,
	pill,
	badges,
	dialogs,
	feedback,
	extras,
};

export async function capture(ctx: CaptureContext): Promise<void> {
	for (const section of SECTIONS) {
		if (!wanted(section)) continue;
		for (const scheme of SCHEMES) {
			console.log(`  · ${section} (${scheme})`);
			await RUNNERS[section](ctx, scheme);
		}
	}
}
