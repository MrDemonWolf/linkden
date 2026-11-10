// ─── Stateful group ──────────────────────────────────────────────────────────
// Captures that need saved state, which the read-only groups cannot create:
// a saved non-Classic preset, the stacked public layout, feature toggles off,
// Wallet back fields, a long Inbox, a saved email key with its success toast,
// and the real two-factor flow (enrollment, then the TOTP / backup-code step on
// the login page).
//
// Only for the disposable screenshot stack (README.md). Each section reads the
// values it is about to change, changes them, captures, and restores them in a
// `finally`, so running seed.ts and then this group again gives the same result.
// The two-factor section turns 2FA off again with the seeded password. Saved
// email keys are cleared to "" (secret settings survive seed.ts's replace import).
//
// Two captures change only what this browser receives, never the server:
// the publication pill (`publication.status` rewritten, since the stack has no
// publication target) and the 2FA enrollment dialog (the manual-entry key and
// backup codes are swapped for placeholders before they reach the page; the
// real secret is kept here only to compute the verification code).
//
// STATEFUL_ONLY=pills,theme,… limits a run to some sections (see SECTIONS).

import { createHmac } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { APIRequestContext, Locator, Page } from "@playwright/test";
import {
	BASE_URL,
	type CaptureContext,
	type ContextOptions,
	env,
	type Scheme,
	SEED_ACCOUNT,
	scratchShot,
	trpcMutation,
	trpcQuery,
} from "../lib";

const SECTIONS = [
	"pills",
	"theme",
	"layout",
	"feature",
	"wallet",
	"inbox",
	"email",
	"twofactor",
] as const;
type Section = (typeof SECTIONS)[number];

function wanted(section: Section): boolean {
	const only = env("STATEFUL_ONLY");
	if (!only) return true;
	return only.split(",").includes(section);
}

const SCHEMES: readonly Scheme[] = ["light", "dark"];
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

// ─── Pages, API, settings ────────────────────────────────────────────────────

/** A page in a fresh context; retries a sign-in check that a busy stack refused. */
async function open(ctx: CaptureContext, options: ContextOptions): Promise<Page> {
	let page: Page | undefined;
	for (let attempt = 1; !page; attempt++) {
		try {
			page = await ctx.page(options);
		} catch (error) {
			if (attempt >= 4 || !String(error).includes("Sign-in failed")) throw error;
			console.warn(`  sign-in check failed (attempt ${attempt}); retrying in 15s`);
			await sleep(15_000);
		}
	}
	page.setDefaultTimeout(20_000);
	return page;
}

/** A signed-in request context (a fresh one, so a rotated session never leaks in). */
async function adminApi(ctx: CaptureContext): Promise<APIRequestContext> {
	const page = await open(ctx, { device: "desktop", signedIn: true });
	return page.context().request;
}

/** Retries a call the stack's rate limiter refused (429), waiting out the 60s window. */
async function patiently<T>(label: string, attempt: () => Promise<T>): Promise<T> {
	for (let tries = 0; ; tries++) {
		try {
			return await attempt();
		} catch (error) {
			if ((error as { status?: number }).status !== 429 || tries >= 2) throw error;
			console.log(`  ${label}: rate limited, waiting 61s`);
			await sleep(61_000);
		}
	}
}

type Saved = Record<string, string | undefined>;

async function readSettings(api: APIRequestContext, keys: string[]): Promise<Saved> {
	const all = await trpcQuery<Record<string, string>>(api, "settings.getAll");
	return Object.fromEntries(keys.map((key) => [key, all[key]]));
}

/** One settings.updateBulk; an unset value restores as "" (the app's "not set"). */
async function writeSettings(api: APIRequestContext, values: Saved): Promise<void> {
	const entries = Object.entries(values).map(([key, value]) => ({ key, value: value ?? "" }));
	await patiently("settings.updateBulk", () => trpcMutation(api, "settings.updateBulk", entries));
}

// ─── Capture helpers ─────────────────────────────────────────────────────────

/** Park the pointer where it hovers nothing. */
async function parkPointer(page: Page): Promise<void> {
	const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
	await page.mouse.move(viewport.width - 2, viewport.height - 2);
}

/** Bottom edge of the sticky 64px admin top bar, in viewport pixels (0 on public pages). */
async function topBarBottom(page: Page): Promise<number> {
	return page.evaluate(
		() => document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0,
	);
}

/** Viewport clip around several on-screen elements, padded, kept below the top bar. */
async function clipAround(
	page: Page,
	targets: Locator[],
	pad = 16,
	belowTopBar = true,
): Promise<{ x: number; y: number; width: number; height: number }> {
	const boxes = [];
	for (const target of targets) {
		const box = await target.boundingBox();
		if (!box) throw new Error(`clipAround: a target is not visible (${target})`);
		boxes.push(box);
	}
	const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
	const floor = belowTopBar ? Math.ceil(await topBarBottom(page)) : 0;
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
	return { x, y, width: right - x, height: bottom - y };
}

/** Start a clip at the top edge of `first` (no half-cut content above it). */
async function fromTopOf(
	page: Page,
	first: Locator,
	clip: { x: number; y: number; width: number; height: number },
): Promise<{ x: number; y: number; width: number; height: number }> {
	const box = await first.boundingBox();
	if (!box) throw new Error("fromTopOf: element is not visible");
	const top = Math.max(clip.y, Math.floor(box.y));
	const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
	return { ...clip, y: top, height: Math.min(viewport.height - top, clip.height - (top - clip.y)) };
}

/** Wait until the preview viewport finished loading the public page. */
async function previewReady(page: Page): Promise<void> {
	await page
		.getByRole("img", { name: "Live preview of your page" })
		.first()
		.waitFor({ state: "visible", timeout: 30_000 });
	await page.waitForTimeout(400);
}

const card = (page: Page, text: string): Locator =>
	page.locator('[data-slot="card"]', { hasText: text }).first();

/** "View live": a plain anchor styled with `buttonVariants` (link role, not button). */
const viewLive = (page: Page): Locator =>
	page.locator("header").getByRole("link", { name: "View live" });

/** Abort writes so a capture that only needs to look can never change saved data. */
async function readOnly(page: Page): Promise<void> {
	await page.route(/\/(trpc|api)\//, (route) => {
		const method = route.request().method();
		if (method === "GET" || method === "HEAD" || method === "OPTIONS") return route.continue();
		console.warn(`  blocked ${method} ${new URL(route.request().url()).pathname}`);
		return route.abort();
	});
}

/** Rewrite the data of some tRPC GET queries in this browser only (batched or not). */
async function overrideTrpc(
	page: Page,
	overrides: Record<string, (data: unknown) => unknown>,
): Promise<void> {
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

// ─── Publication pill (browser-side status, no saved state) ──────────────────

const DIGEST_A = "5f0c".repeat(16);
const DIGEST_B = "a93e".repeat(16);
const LIVE_REVISION = "7d3f2c1a-5b8e-4c6d-9a0f-1e2b3c4d5e6f";
const FAILED_REVISION = "c4a1e9b7-2d6f-4f3a-8b5c-9e0d1f2a3b4c";

function fakeStatus(real: unknown, state: "published" | "failed"): unknown {
	const finished = new Date(Date.now() - 2 * 3_600_000).toISOString();
	const revision = (revisionId: string, status: string) => ({
		revision: revisionId,
		sourceDigest: DIGEST_A,
		approvedSourceDigest: DIGEST_B,
		approvalRevision: null,
		requestKind: "manual",
		targetId: "example-public-site",
		rendererSourceId: "example",
		publicOrigin: "https://example.com",
		status,
		createdAt: finished,
		startedAt: finished,
		finishedAt: finished,
		nextVisibilityBoundary: null,
		artifactDigest: DIGEST_A,
		deploymentId: null,
		providerVersionId: null,
		failureCode: status === "failed" ? "verification_failed" : null,
	});
	const lastGood = revision(LIVE_REVISION, "published");
	return {
		...(real as Record<string, unknown>),
		status: state,
		available: true,
		unavailableReason: null,
		sourceDigest: DIGEST_A,
		approvalDigest: DIGEST_B,
		hasUnpublishedChanges: state === "failed",
		current: state === "published" ? lastGood : revision(FAILED_REVISION, "failed"),
		lastGood,
		liveVerified: true,
		recoveryRequired: false,
	};
}

async function pills(ctx: CaptureContext): Promise<void> {
	for (const scheme of SCHEMES) {
		for (const state of ["published", "failed"] as const) {
			const label = state === "published" ? "Published" : "Failed";
			const page = await open(ctx, { device: "element", scheme, signedIn: true });
			await readOnly(page);
			await overrideTrpc(page, { "publication.status": (data) => fakeStatus(data, state) });
			await ctx.goto(page, "/admin/links");
			const trigger = page.getByRole("button", { name: `Publishing: ${label}` });
			await trigger.waitFor();
			// Closed first: an open trigger (aria-expanded) takes the outline
			// variant's muted fill and foreground text instead of the state color.
			await page.mouse.move(700, 880);
			await ctx.prepare(page, { settleMs: 200 });
			await ctx.shot(page, {
				name: `state-pill-${state}-${scheme}`,
				description: `StatePill reading ${label} beside Share and View live; publication.status rewritten in the capture browser (no publication target on the stack), ${scheme}`,
				clip: await clipAround(page, [trigger, viewLive(page)], 12, false),
			});
			await trigger.click();
			const popover = page.locator('[data-slot="popover-content"]').first();
			await popover.waitFor();
			await ctx.prepare(page, { keepFocus: true, settleMs: 200 });
			await page.mouse.move(700, 880);
			await ctx.shot(page, {
				name: `state-pill-${state}-menu-${scheme}`,
				description: `StatePill popover for ${label}: description, last verified revision, Refresh status and Publish; publication.status rewritten in the capture browser, ${scheme}`,
				clip: await clipAround(page, [trigger, popover], 16, false),
			});
		}
	}
}

// ─── Saved non-Classic preset: admin chrome vs. the preview ──────────────────

async function theme(ctx: CaptureContext): Promise<void> {
	const api = await adminApi(ctx);
	const before = await readSettings(api, ["theme_preset"]);
	try {
		await writeSettings(api, { theme_preset: "sunset" });
		for (const scheme of SCHEMES) {
			const page = await open(ctx, { device: "desktop", scheme, signedIn: true });
			await ctx.goto(page, "/admin/links/profile");
			await previewReady(page);
			// Same framing as overview/admin-editor: the viewport grows to the document.
			const height = await page.evaluate(() => document.documentElement.scrollHeight);
			await page.setViewportSize({ width: 1440, height: Math.max(900, height) });
			await parkPointer(page);
			await ctx.prepare(page, { settleMs: 500 });
			await ctx.shot(page, {
				name: `theme-isolation-${scheme}`,
				description: `Profile page with the Sunset preset saved: admin chrome unchanged, preview rail in Sunset (${scheme})`,
			});
		}
	} finally {
		await writeSettings(api, { theme_preset: before.theme_preset ?? "default" });
	}
}

// ─── Stacked public layout ───────────────────────────────────────────────────

async function layout(ctx: CaptureContext): Promise<void> {
	const api = await adminApi(ctx);
	const before = await readSettings(api, ["page_layout"]);
	try {
		await writeSettings(api, { page_layout: "stacked" });
		for (const scheme of SCHEMES) {
			const page = await open(ctx, { device: "desktop", scheme });
			await ctx.goto(page, "/");
			await ctx.prepare(page, { settleMs: 800 });
			await ctx.shot(page, {
				name: `public-stacked-${scheme}`,
				description: `Public page at 1440px with page_layout stacked: profile card above one max-w-2xl block column (${scheme})`,
			});
		}
	} finally {
		await writeSettings(api, { page_layout: before.page_layout ?? "split" });
	}
}

// ─── Feature toggles off: "Hidden — turn on in …" rows ───────────────────────

async function feature(ctx: CaptureContext): Promise<void> {
	const api = await adminApi(ctx);
	const before = await readSettings(api, ["vcard_enabled", "contact_form_enabled"]);
	try {
		await writeSettings(api, { vcard_enabled: "false", contact_form_enabled: "false" });
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await readOnly(page);
		await ctx.goto(page, "/admin/links");
		const rows = ["Get in touch", "Work with me", "Save my contact", "Studio"].map((title) =>
			page.getByRole("group", { name: title, exact: true }),
		);
		await page.getByText("Hidden — turn on in Branding").waitFor();
		await rows[1]?.evaluate((el) => el.scrollIntoView({ block: "center" }));
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page, {
			name: "block-row-feature-hidden-light",
			description:
				"Block rows with vCard and the contact form turned off: warning links Hidden — turn on in Inbox / Branding",
			clip: await clipAround(page, rows),
		});
	} finally {
		await writeSettings(api, {
			vcard_enabled: before.vcard_enabled ?? "true",
			contact_form_enabled: before.contact_form_enabled ?? "true",
		});
	}
}

// ─── Wallet back fields ──────────────────────────────────────────────────────

const BACK_FIELDS = [
	{ key: "hours", label: "STUDIO HOURS", value: "Tuesday to Friday, 10:00 to 16:00" },
	{ key: "website", label: "WEBSITE", value: "https://example.com" },
	{
		key: "bookings",
		label: "BOOKINGS",
		value: "Design reviews are booked through the profile page.",
	},
];

async function wallet(ctx: CaptureContext): Promise<void> {
	const api = await adminApi(ctx);
	const before = await readSettings(api, ["wallet_back_fields"]);
	try {
		await patiently("wallet.updateConfig", () =>
			trpcMutation(api, "wallet.updateConfig", { backFields: BACK_FIELDS }),
		);
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await readOnly(page);
		await ctx.goto(page, "/admin/settings/wallet");
		const rail = page.getByRole("complementary", { name: "Preview" });
		const cardEl = rail.locator(".rounded-\\[20px\\]").first();
		await cardEl.waitFor({ timeout: 30_000 });
		await rail.getByRole("button", { name: "Back ›" }).waitFor();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(cardEl, {
			name: "wallet-pass-front-with-back",
			description:
				"Pass card front with back fields saved: the Back › control in its bottom-right row under the QR caption",
			padding: 12,
		});
		await rail.getByRole("button", { name: "Back ›" }).click();
		await rail.getByRole("button", { name: "Front ›" }).waitFor();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(rail.locator(".rounded-\\[20px\\]").first(), {
			name: "wallet-pass-back",
			description: "Pass card reverse: organization name, Front › control and three back fields",
			padding: 12,
		});
	} finally {
		let restore: unknown[] = [];
		try {
			restore = JSON.parse(before.wallet_back_fields ?? "[]") as unknown[];
		} catch {
			restore = [];
		}
		await patiently("wallet.updateConfig", () =>
			trpcMutation(api, "wallet.updateConfig", { backFields: restore }),
		);
	}
}

// ─── Inbox with more than one page of messages ───────────────────────────────

const FIRST = ["Avery", "Blair", "Casey", "Devon", "Emery", "Finley", "Harper", "Jules"];
const LAST = ["Morgan", "Quinn", "Reyes", "Sato", "Varga", "Lindqvist", "Okoro"];
const WHERE = ["Conference", "Online", "Mutual Friend", "Social Media"];
const MESSAGES = [
	"Loved the Field Notes zine. Do you ship the print edition overseas?",
	"Could we book a design review for our onboarding flow next month?",
	"Is the open-source UI kit available under a permissive license?",
	"Would you be open to a short interview for our design newsletter?",
];

interface ExportedContact {
	id: string;
	email: string;
}

async function inbox(ctx: CaptureContext): Promise<void> {
	const api = await adminApi(ctx);
	const exported = await trpcQuery<{ data: { contactSubmissions: ExportedContact[] } }>(
		api,
		"backup.export",
	);
	const original = exported.data.contactSubmissions;
	const now = Date.now();
	const extra = Array.from({ length: 52 }, (_, i) => {
		const first = FIRST[i % FIRST.length] as string;
		const last = LAST[(i * 3) % LAST.length] as string;
		const at = new Date(now - (6 + i) * 86_400_000 - (i % 5) * 3_600_000).toISOString();
		return {
			id: `ds-older-${String(i + 1).padStart(2, "0")}`,
			name: `${first} ${last}`,
			email: `${first}.${last}@example.org`.toLowerCase(),
			message: MESSAGES[i % MESSAGES.length] as string,
			whereMet: WHERE[i % WHERE.length] as string,
			blockId: "ds-connect-work-with-me",
			blockTitle: "Work with me",
			isRead: true,
			createdAt: at,
			updatedAt: at,
		};
	});
	try {
		await trpcMutation(api, "backup.import", {
			mode: "merge",
			data: { contactSubmissions: extra },
		});
		const page = await open(ctx, { device: "element", scheme: "light", signedIn: true });
		await readOnly(page);
		await ctx.goto(page, "/admin/inbox");
		const more = page.getByRole("button", { name: "Load older messages" });
		await more.waitFor();
		const footer = more.locator("xpath=..");
		await footer.evaluate((el) => el.scrollIntoView({ block: "center" }));
		const items = page.getByRole("list", { name: "Messages" }).getByRole("listitem");
		const count = await items.count();
		await parkPointer(page);
		await ctx.prepare(page, { settleMs: 300 });
		await ctx.shot(page, {
			name: "inbox-load-older-light",
			description: `Inbox list footer with ${original.length + extra.length} messages: the last rows, Load older messages and Showing 50 of n`,
			clip: await fromTopOf(
				page,
				items.nth(count - 2),
				await clipAround(page, [items.nth(count - 2), items.nth(count - 1), footer]),
			),
		});
	} finally {
		await trpcMutation(api, "backup.import", {
			mode: "replace",
			data: { contactSubmissions: original },
		});
	}
}

// ─── Saved email key: SecretInput mask + success toast ───────────────────────

const toastLocator = (page: Page): Locator => page.locator("[data-sonner-toast]").first();

/** Save the dirty settings form and capture the success toast (hovered, so it stays). */
async function saveAndShootToast(ctx: CaptureContext, page: Page, scheme: Scheme): Promise<void> {
	await page.getByRole("button", { name: "Save changes" }).click();
	const toast = toastLocator(page);
	await toast.filter({ hasText: "Email settings saved" }).waitFor();
	await toast.hover();
	await ctx.prepare(page, { settleMs: 400 });
	await ctx.shot(toast, {
		name: `toast-success-${scheme}`,
		description: `Sonner success toast (richColors) after saving Settings → Email: "Email settings saved", ${scheme}`,
	});
	await parkPointer(page);
	await toast.waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
}

async function email(ctx: CaptureContext): Promise<void> {
	const api = await adminApi(ctx);
	const before = await readSettings(api, ["email_api_key", "email_from"]);
	try {
		for (const scheme of SCHEMES) {
			const page = await open(ctx, { device: "element", scheme, signedIn: true });
			await ctx.goto(page, "/admin/settings/email");
			const key = page.locator("#s-email-key");
			await key.waitFor();
			const from = page.getByLabel("From Address");
			if (scheme === "light") {
				await key.fill("re_docs_example_not_a_real_key_1");
				await from.fill("Ellis Studio <studio@example.com>");
				await from.blur();
				await saveAndShootToast(ctx, page, scheme);
			}
			await page.getByText("Saved — type or paste a new value to replace it").waitFor();
			await parkPointer(page);
			await ctx.prepare(page, { settleMs: 300 });
			await ctx.shot(card(page, "Email provider"), {
				name: `secret-input-saved-${scheme}`,
				description: `Email provider card with a saved API key: SecretInput shows the mask and the Saved hint, ${scheme}`,
			});
			if (scheme === "dark") {
				// Focus selects the mask; typing replaces it.
				await key.click();
				await page.keyboard.type("re_docs_example_not_a_real_key_2");
				await key.blur();
				await saveAndShootToast(ctx, page, scheme);
			}
		}
	} finally {
		// Secrets are kept by seed.ts's replace import, so clear the key here.
		await writeSettings(api, {
			email_api_key: before.email_api_key ?? "",
			email_from: before.email_from ?? "",
		});
	}
}

// ─── Two-factor: enrollment, login step, then off again ──────────────────────

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
	const out: number[] = [];
	let bits = 0;
	let value = 0;
	for (const char of input.replace(/=+$/, "").toUpperCase()) {
		const index = BASE32.indexOf(char);
		if (index < 0) throw new Error("Invalid base32 secret");
		value = ((value << 5) | index) & 0xffff;
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 0xff);
			bits -= 8;
		}
	}
	return Buffer.from(out);
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30s), as Better Auth's twoFactor plugin verifies it. */
function totp(secret: string, at = Date.now()): string {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
	const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
	const offset = (hmac[hmac.length - 1] as number) & 0x0f;
	const code =
		((((hmac[offset] as number) & 0x7f) << 24) |
			((hmac[offset + 1] as number) << 16) |
			((hmac[offset + 2] as number) << 8) |
			(hmac[offset + 3] as number)) %
		1_000_000;
	return String(code).padStart(6, "0");
}

/** A code with at least 6s left in its 30s step. */
async function freshTotp(secret: string): Promise<string> {
	const into = (Date.now() / 1000) % 30;
	if (into > 24) await sleep((30 - into) * 1000 + 500);
	return totp(secret);
}

const PLACEHOLDER_KEY = "DOCSPLACEHOLDERKEY234567";
const PLACEHOLDER_CODES = [
	"a1b2c-d3e4f",
	"g5h6i-j7k8l",
	"m9n0p-q1r2s",
	"t3u4v-w5x6y",
	"z7a8b-c9d0e",
	"f1g2h-i3j4k",
	"l5m6n-o7p8q",
	"r9s0t-u1v2w",
	"x3y4z-a5b6c",
	"d7e8f-g9h0i",
];

/**
 * Pass the real enable call through, keep its secret for computing codes, and
 * hand the page a placeholder key and placeholder backup codes to display.
 */
async function maskEnrollment(page: Page, onSecret: (secret: string) => void): Promise<void> {
	await page.route(/\/api\/auth\/two-factor\/enable/, async (route) => {
		const response = await route.fetch();
		const body = (await response.json().catch(() => null)) as {
			totpURI?: string;
			backupCodes?: string[];
		} | null;
		if (!response.ok() || !body?.totpURI) {
			await route.fulfill({ response, json: body });
			return;
		}
		const uri = new URL(body.totpURI);
		const secret = uri.searchParams.get("secret") ?? "";
		onSecret(secret);
		uri.searchParams.set(
			"secret",
			PLACEHOLDER_KEY.repeat(Math.ceil(secret.length / PLACEHOLDER_KEY.length)).slice(
				0,
				secret.length,
			),
		);
		await route.fulfill({
			response,
			json: {
				...body,
				totpURI: uri.toString(),
				backupCodes: PLACEHOLDER_CODES.slice(0, body.backupCodes?.length ?? 10),
			},
		});
	});
}

async function hideDevLogin(page: Page): Promise<void> {
	await page.evaluate(() => {
		for (const button of document.querySelectorAll("button")) {
			if (button.textContent?.trim() === "Dev login (bypass)") button.style.display = "none";
		}
	});
}

/** Fresh signed-out page: email + password sign-in, which answers with the 2FA step. */
async function passwordStep(ctx: CaptureContext, scheme: Scheme): Promise<Page> {
	const page = await open(ctx, { device: "element", scheme });
	await ctx.goto(page, "/admin/login");
	await page.getByLabel("Email").fill(SEED_ACCOUNT.email);
	await page.locator("#password").fill(SEED_ACCOUNT.password);
	await hideDevLogin(page);
	await sleep(4_000); // Better Auth allows 3 sign-in calls per 10s.
	await page.getByRole("button", { name: "Sign in", exact: true }).click();
	await page.getByRole("heading", { name: "Two-factor check" }).waitFor();
	await hideDevLogin(page);
	return page;
}

/**
 * A page with its own new development-login session. The 2FA verify replaces
 * the session that ran it, so the two-factor steps never use the session
 * lib.ts shares with other contexts (lib.ts would notice a replaced session
 * and sign in again, but a fresh one keeps each step independent).
 */
async function freshAdmin(ctx: CaptureContext, options: ContextOptions = {}): Promise<Page> {
	const page = await open(ctx, { ...options, signedIn: false });
	const res = await page.context().request.post(`${BASE_URL}/api/auth/dev-login`, {
		headers: { origin: BASE_URL },
		data: {},
	});
	if (!res.ok()) throw new Error(`Development login failed (${res.status()})`);
	return page;
}

/** Reads the user from the database (not the signed session cache). */
async function twoFactorEnabled(ctx: CaptureContext): Promise<boolean> {
	const api = (await freshAdmin(ctx)).context().request;
	const res = await api.get(`${BASE_URL}/api/auth/get-session?disableCookieCache=true`);
	const body = (await res.json().catch(() => null)) as {
		user?: { twoFactorEnabled?: boolean };
	} | null;
	if (!body?.user) throw new Error("Could not read the admin's two-factor state");
	return !!body.user.twoFactorEnabled;
}

async function disableTwoFactor(ctx: CaptureContext): Promise<void> {
	if (!(await twoFactorEnabled(ctx))) return;
	const api = (await freshAdmin(ctx)).context().request;
	await sleep(4_000);
	const res = await api.post(`${BASE_URL}/api/auth/two-factor/disable`, {
		headers: { origin: BASE_URL },
		data: { password: SEED_ACCOUNT.password },
	});
	if (!res.ok()) {
		throw new Error(`Turning two-factor off failed (${res.status()}): ${await res.text()}`);
	}
	if (await twoFactorEnabled(ctx)) throw new Error("Two-factor is still on after disable");
	console.log("  two-factor turned off again");
}

async function twoFactor(ctx: CaptureContext): Promise<void> {
	if (await twoFactorEnabled(ctx)) {
		// Left on by an interrupted run: start from the seeded state (off).
		console.log("  two-factor was on (interrupted run?); turning it off first");
		await disableTwoFactor(ctx);
	}
	let secret = "";
	try {
		// 1. Enrollment dialog: password step, then QR + backup codes. Light is
		//    cancelled (nothing turns on until a code verifies); dark verifies.
		for (const scheme of SCHEMES) {
			const page = await freshAdmin(ctx, { device: "element", scheme });
			await maskEnrollment(page, (value) => {
				secret = value;
			});
			await ctx.goto(page, "/admin/settings");
			await page.getByRole("switch", { name: "Two-factor authentication" }).click();
			const dialog = page.getByRole("dialog");
			await dialog.getByRole("heading", { name: "Enable two-factor" }).waitFor();
			await dialog.getByLabel("Current password").fill(SEED_ACCOUNT.password);
			await ctx.prepare(page, { settleMs: 300 });
			await ctx.shot(dialog, {
				name: `two-factor-enable-${scheme}`,
				description: `Enable two-factor dialog: explanation, Current password, Cancel and Continue (${scheme})`,
			});
			await sleep(4_000);
			await dialog.getByRole("button", { name: "Continue" }).click();
			await dialog.getByRole("heading", { name: "Verify authenticator" }).waitFor();
			await dialog.getByRole("img", { name: "TOTP QR code" }).waitFor();
			await dialog.getByText("Manual entry key").click();
			await page
				.locator("[data-sonner-toast]")
				.first()
				.waitFor({ state: "detached", timeout: 15_000 })
				.catch(() => {});
			await parkPointer(page);
			await ctx.prepare(page, { settleMs: 300 });
			await ctx.shot(dialog, {
				name: `two-factor-verify-${scheme}`,
				description: `Verify authenticator dialog: QR, manual entry key, backup codes (placeholders), verification code (${scheme})`,
			});
			if (scheme === "light") {
				await dialog.getByRole("button", { name: "Cancel" }).click();
				continue;
			}
			if (!secret) throw new Error("two-factor/enable returned no secret");
			await sleep(4_000);
			await dialog.getByLabel("Verification code").fill(await freshTotp(secret));
			await dialog.getByRole("button", { name: "Verify & activate" }).click();
			await page.getByText("Two-factor authentication enabled").first().waitFor();
			await dialog.waitFor({ state: "detached" });
		}

		// 2. Settings → Account with two-factor on (new sessions: the verify rotated it).
		for (const scheme of SCHEMES) {
			const page = await freshAdmin(ctx, { device: "element", scheme });
			await ctx.goto(page, "/admin/settings");
			const security = card(page, "Login & Security");
			await security.getByText("enabled", { exact: true }).waitFor();
			await parkPointer(page);
			await ctx.prepare(page, { settleMs: 300 });
			await ctx.shot(security, {
				name: `account-two-factor-on-${scheme}`,
				description: `Login & Security with two-factor on: default "enabled" badge and an on switch (${scheme})`,
			});
		}

		// 3. Sign in with the password: the real TOTP step, then the backup-code step.
		for (const scheme of SCHEMES) {
			const page = await passwordStep(ctx, scheme);
			const loginCard = page.locator("main .rounded-xl").first();
			await ctx.prepare(page, { settleMs: 300 });
			// Verification only (not published): the real step matches patterns/login-two-factor.
			await scratchShot(
				page,
				join(env("DESIGN_SHOTS_SCRATCH") ?? tmpdir(), `stateful-login-totp-${scheme}.png`),
			);
			await page.getByRole("button", { name: "Use a backup code instead" }).click();
			await page.getByLabel("Backup code").waitFor();
			await parkPointer(page);
			await ctx.prepare(page, { settleMs: 300 });
			await ctx.shot(loginCard, {
				name: `login-backup-code-${scheme}`,
				description: `Two-factor check in backup-code mode: key icon, Backup code field (xxxxx-xxxxx), 30-day trust, Verify, switch back to the app (${scheme})`,
			});
			if (scheme === "light") {
				// Finish one sign-in end to end with a real code.
				await page.getByRole("button", { name: "Use your authenticator app instead" }).click();
				await sleep(4_000);
				await page.getByLabel("Authentication code").fill(await freshTotp(secret));
				await page.getByRole("button", { name: "Verify", exact: true }).click();
				await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"), {
					timeout: 30_000,
				});
				console.log(`  two-factor sign-in completed: ${new URL(page.url()).pathname}`);
			}
		}
	} finally {
		await disableTwoFactor(ctx);
	}
}

// ─── Runner ──────────────────────────────────────────────────────────────────

const RUNNERS: Record<Section, (ctx: CaptureContext) => Promise<void>> = {
	pills,
	theme,
	layout,
	feature,
	wallet,
	inbox,
	email,
	twofactor: twoFactor,
};

export async function capture(ctx: CaptureContext): Promise<void> {
	for (const section of SECTIONS) {
		if (wanted(section)) await RUNNERS[section](ctx);
	}
}
