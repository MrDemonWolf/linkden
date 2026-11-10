// ─── Design-system screenshot helpers ────────────────────────────────────────
// Shared by seed.ts, capture.ts and every groups/<group>.ts module. Captures run
// against a disposable local stack (see README.md), never a real deployment:
// sign-in uses the development login endpoint, which only exists on a loopback
// stack with DEV_LOGIN="true".
//
// Output: WebP files in apps/docs/content/docs/design-system/images/<group>/
// plus one manifest.json per group, so parallel runs of different groups never
// write the same file.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type APIRequestContext,
	type Browser,
	type BrowserContext,
	chromium,
	type Locator,
	type Page,
} from "@playwright/test";
import fixture from "./fixture.json";

/** Reads an optional DESIGN_SHOTS_* override (runtime only, not a build input). */
export const env = (name: string): string | undefined => process.env[name] || undefined;

/** Web origin of the screenshot stack (never the owner's review stack on :3001). */
export const BASE_URL = (env("DESIGN_SHOTS_URL") ?? "http://localhost:3101").replace(/\/+$/, "");

export const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, "../..");
export const IMAGES_DIR = join(REPO_ROOT, "apps/docs/content/docs/design-system/images");

/** Image groups the docs use (see the design-system MDX pages). */
export const GROUPS = ["overview", "foundations", "components", "patterns", "stateful"] as const;

/** Per-image and whole-folder budgets from the capture rules. */
export const IMAGE_BUDGET_BYTES = 250 * 1024;
export const FOLDER_BUDGET_BYTES = 8 * 1024 * 1024;
export const WEBP_QUALITY = 82;

/**
 * The seeded admin. Synthetic and LOCAL-ONLY: it exists so a stack without
 * DEV_LOGIN can still be signed in to. Never reuse it on a reachable instance.
 */
export const SEED_ACCOUNT = {
	name: fixture.account.name,
	email: env("DESIGN_SHOTS_EMAIL") ?? fixture.account.email,
	password: env("DESIGN_SHOTS_PASSWORD") ?? "linkden-design-shots-local",
} as const;

// ─── Browser + contexts ──────────────────────────────────────────────────────

export type Scheme = "light" | "dark";
/** desktop 1440×900 @1x · phone 390×844 @2x (touch) · element 1440×900 @2x for crops. */
export type Device = "desktop" | "phone" | "element";
/**
 * Public-page consent banner state stored before the page loads.
 * "essential" (default) records "Essential only" so the banner never covers a
 * capture; "unset" leaves storage empty so the banner shows. "media" would let
 * embeds load third-party iframes, so it is deliberately not offered.
 */
export type ConsentState = "essential" | "unset";

export const DEVICES: Record<
	Device,
	{
		viewport: { width: number; height: number };
		deviceScaleFactor: number;
		isMobile: boolean;
		hasTouch: boolean;
	}
> = {
	desktop: {
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		isMobile: false,
		hasTouch: false,
	},
	phone: {
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	},
	element: {
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		isMobile: false,
		hasTouch: false,
	},
};

export interface ContextOptions {
	device?: Device;
	scheme?: Scheme;
	/** Sign in as the seeded admin (dev login, falling back to the seeded password). */
	signedIn?: boolean;
	consent?: ConsentState;
	/** Override the viewport size (keeps the device's scale factor and touch flags). */
	viewport?: { width: number; height: number };
}

export function launchBrowser(): Promise<Browser> {
	return chromium.launch({ headless: true });
}

/** Mirrors components/public/consent-banner.tsx (CONSENT_KEY / CONSENT_VERSION). */
const CONSENT_KEY = "linkden-consent";
const CONSENT_VERSION = 2;

export async function newContext(
	browser: Browser,
	options: ContextOptions = {},
): Promise<BrowserContext> {
	const device = DEVICES[options.device ?? "desktop"];
	const context = await browser.newContext({
		baseURL: BASE_URL,
		viewport: options.viewport ?? device.viewport,
		deviceScaleFactor: device.deviceScaleFactor,
		isMobile: device.isMobile,
		hasTouch: device.hasTouch,
		colorScheme: options.scheme ?? "light",
		reducedMotion: "reduce",
		locale: "en-US",
		timezoneId: "America/Los_Angeles",
		// The dev service worker only retires itself; keep it out of captures.
		serviceWorkers: "block",
	});
	// The admin uses next-themes (localStorage "theme", default "dark"), so a
	// light capture needs an explicit choice; the public page follows the
	// context's prefers-color-scheme on its own.
	await context.addInitScript((theme) => {
		try {
			if (!localStorage.getItem("theme")) localStorage.setItem("theme", theme);
		} catch {
			/* opaque origin (about:blank) */
		}
	}, options.scheme ?? "light");
	if ((options.consent ?? "essential") === "essential") {
		await context.addInitScript(
			({ key, version }) => {
				try {
					if (!localStorage.getItem(key)) {
						const choice = {
							essential: true,
							analytics: false,
							marketing: false,
							functional: false,
						};
						localStorage.setItem(key, JSON.stringify({ ...choice, v: version, ts: Date.now() }));
					}
				} catch {
					/* opaque origin (about:blank) */
				}
			},
			{ key: CONSENT_KEY, version: CONSENT_VERSION },
		);
	}
	if (options.signedIn) await signIn(context);
	return context;
}

/** A page in a fresh context. Close it with `page.context().close()`. */
export async function newPage(browser: Browser, options: ContextOptions = {}): Promise<Page> {
	const context = await newContext(browser, options);
	return context.newPage();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

type Cookies = Awaited<ReturnType<BrowserContext["cookies"]>>;

/**
 * The admin session shared by every signed-in context in this process: only
 * the session token (and its "don't remember" companion), never Better Auth's
 * signed `session_data` cache cookie. That cache would keep vouching for a
 * session, with stale user data, after the session was revoked or replaced
 * (a 2FA verify, a password change, a sign-out), so each new context starts
 * without it and the app's first session read goes to the database.
 */
let cachedCookies: Cookies | null = null;

const SESSION_CACHE_COOKIE = /session_data(?:\.\d+)?$/;
const SESSION_TOKEN_COOKIE = /session_token$/;
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** Seconds to wait from a 429's Retry-After / X-Retry-After header (2–30s). */
function retryDelayMs(headers: Record<string, string>): number {
	const seconds = Number(headers["x-retry-after"] ?? headers["retry-after"]);
	return Math.min(30, Math.max(2, Number.isFinite(seconds) ? seconds : 5)) * 1000;
}

/**
 * Whether the context's session cookie names a live session, read from the
 * database (`disableCookieCache=true`), so a revoked or replaced session is
 * never reported as signed in. One GET per call, outside the Cloudflare auth
 * limiters; a 429 from Better Auth's own limiter is waited out and retried,
 * never read as "signed out" (which would spend sign-in attempts).
 */
async function hasSession(api: APIRequestContext): Promise<boolean> {
	for (let attempt = 1; ; attempt++) {
		const res = await api.get(`${BASE_URL}/api/auth/get-session?disableCookieCache=true`);
		if (res.status() === 429 && attempt < 4) {
			const wait = retryDelayMs(res.headers());
			console.warn(`  session check rate limited; retrying in ${wait / 1000}s`);
			await sleep(wait);
			continue;
		}
		if (!res.ok()) {
			throw new Error(`Session check failed on ${BASE_URL} (${res.status()}).`);
		}
		const body = (await res.json().catch(() => null)) as { user?: unknown } | null;
		return !!body?.user;
	}
}

/** The context's auth cookies minus the signed session cache (see `cachedCookies`). */
async function sessionCookies(context: BrowserContext): Promise<Cookies> {
	return (await context.cookies(BASE_URL)).filter(
		(cookie) => !SESSION_CACHE_COOKIE.test(cookie.name),
	);
}

export async function hasAdmin(api: APIRequestContext): Promise<boolean> {
	const { hasUsers } = await trpcQuery<{ hasUsers: boolean }>(api, "public.hasUsers");
	return hasUsers;
}

/**
 * Give `context` an admin session. Reuses the process's cached session after
 * one database-backed check (see `hasSession`); otherwise prefers POST
 * /api/auth/dev-login (needs a loopback stack with DEV_LOGIN="true") and falls
 * back to the seeded email and password only when dev login is unavailable,
 * never because a check was rate limited. Many contexts therefore cost one
 * sign-in plus one session read each. Refuses to run before seed.ts: dev login
 * on an empty database would create its own "Dev Admin" account instead.
 */
export async function signIn(context: BrowserContext): Promise<void> {
	const api = context.request;
	if (cachedCookies) {
		await context.addCookies(cachedCookies);
		if (await hasSession(api)) return;
		// Revoked or replaced since it was cached: start over with a new session.
		await context.clearCookies();
		cachedCookies = null;
	}
	if (!(await hasAdmin(api))) {
		throw new Error(`No admin exists on ${BASE_URL} yet. Run scripts/design-screenshots/seed.ts.`);
	}
	const dev = await api.post(`${BASE_URL}/api/auth/dev-login`, {
		headers: { origin: BASE_URL },
		data: {},
	});
	const hasToken = async () =>
		(await context.cookies(BASE_URL)).some((cookie) => SESSION_TOKEN_COOKIE.test(cookie.name));
	// A 200 that set a session token is a fresh session: no extra check needed.
	if (!(dev.ok() && (await hasToken()))) {
		if (dev.status() === 429) {
			throw new Error(`Development login on ${BASE_URL} is rate limited; wait a minute and retry.`);
		}
		const res = await api.post(`${BASE_URL}/api/auth/sign-in/email`, {
			headers: { origin: BASE_URL },
			data: { email: SEED_ACCOUNT.email, password: SEED_ACCOUNT.password },
		});
		const body = (await res.json().catch(() => null)) as { twoFactorRedirect?: boolean } | null;
		if (body?.twoFactorRedirect) {
			throw new Error("The admin has two-factor on; enable DEV_LOGIN on the stack instead.");
		}
		if (!res.ok() || !(await hasToken())) {
			throw new Error(
				`Sign-in failed on ${BASE_URL}: dev login answered ${dev.status()}, password sign-in ${res.status()}.`,
			);
		}
	}
	cachedCookies = await sessionCookies(context);
}

// ─── tRPC over HTTP (no transformer: plain JSON in, `{ result: { data } }` out) ─

interface TrpcEnvelope<T> {
	result?: { data: T };
	error?: { message?: string; data?: { code?: string; httpStatus?: number } };
}

async function unwrap<T>(path: string, res: Awaited<ReturnType<APIRequestContext["get"]>>) {
	const text = await res.text();
	let body: TrpcEnvelope<T> | null = null;
	try {
		body = JSON.parse(text) as TrpcEnvelope<T>;
	} catch {
		/* not JSON, e.g. a 429 text body */
	}
	if (!res.ok() || !body?.result) {
		const reason = body?.error?.message ?? text.slice(0, 200);
		const error = new Error(`${path} failed (${res.status()}): ${reason}`) as Error & {
			status?: number;
		};
		error.status = res.status();
		throw error;
	}
	return body.result.data;
}

/** GET a tRPC query. Capture groups may read; they must never mutate saved data. */
export async function trpcQuery<T>(
	api: APIRequestContext,
	path: string,
	input?: unknown,
): Promise<T> {
	const query = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify(input))}`;
	return unwrap<T>(path, await api.get(`${BASE_URL}/trpc/${path}${query}`));
}

/** POST a tRPC mutation (same-origin header included). Seed-only. */
export async function trpcMutation<T>(
	api: APIRequestContext,
	path: string,
	input?: unknown,
): Promise<T> {
	const res = await api.post(`${BASE_URL}/trpc/${path}`, {
		headers: { origin: BASE_URL },
		data: input ?? {},
	});
	return unwrap<T>(path, res);
}

// ─── Page preparation ────────────────────────────────────────────────────────

/** Hides development-only chrome: the Next.js dev indicator and the TanStack Query devtools button. */
const STABILIZE_CSS = "nextjs-portal,.tsqd-parent-container{display:none!important}";

export interface PrepareOptions {
	/** Keep the focused element focused (default: blur it, so no focus ring or caret). */
	keepFocus?: boolean;
	/** Extra wait after everything settled, for components that animate in JS. */
	settleMs?: number;
}

/**
 * Make the page deterministic: reduced motion, Next dev indicator hidden, lazy
 * images forced to load, network idle, fonts and images ready, focus cleared.
 * Call it after every navigation and after opening anything that loads data.
 */
export async function prepare(page: Page, options: PrepareOptions = {}): Promise<void> {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.addStyleTag({ content: STABILIZE_CSS });
	await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
	await page.evaluate(async () => {
		for (const img of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) {
			img.loading = "eager";
		}
		await document.fonts.ready;
		await Promise.all(
			[...document.images]
				.filter((img) => !img.complete)
				.map(
					(img) =>
						new Promise<void>((done) => {
							img.addEventListener("load", () => done(), { once: true });
							img.addEventListener("error", () => done(), { once: true });
						}),
				),
		);
	});
	await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
	if (!options.keepFocus) {
		await page.evaluate(() => {
			const active = document.activeElement;
			if (active instanceof HTMLElement && active !== document.body) active.blur();
		});
	}
	// Two frames, so layout from the last state change is painted.
	await page.evaluate(
		() =>
			new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
	);
	if (options.settleMs) await page.waitForTimeout(options.settleMs);
}

/** Navigate to a path on BASE_URL and prepare the page. */
export async function goto(page: Page, path: string, options: PrepareOptions = {}): Promise<void> {
	await page.goto(path.startsWith("http") ? path : `${BASE_URL}${path}`, {
		waitUntil: "domcontentloaded",
		// The first request to a route compiles it in `next dev`.
		timeout: 90_000,
	});
	await prepare(page, options);
}

// ─── Capture + encode ────────────────────────────────────────────────────────

export interface ShotOptions {
	group: string;
	/** kebab-case, with -light/-dark and -mobile suffixes where they apply. */
	name: string;
	/** What the image shows; becomes the manifest description (and a starting point for alt text). */
	description: string;
	/** CSS px around a Locator target (default 16). */
	padding?: number;
	/** Page targets only: capture the whole scrollable page. */
	fullPage?: boolean;
	/** Page targets only: a CSS-px region of the viewport. */
	clip?: { x: number; y: number; width: number; height: number };
	/** cwebp quality (default 82; only lower it when an image would exceed the budget). */
	quality?: number;
}

export interface ShotRecord {
	group: string;
	name: string;
	width: number;
	height: number;
	bytes: number;
	description: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let scratchRoot: string | null = null;
/** Per-process temp folder for the intermediate PNGs (created on first use). */
function scratchDir(): string {
	scratchRoot ??= mkdtempSync(join(tmpdir(), "linkden-design-shots-"));
	return scratchRoot;
}

function isPage(target: Page | Locator): target is Page {
	return typeof (target as Page).goto === "function";
}

/** PNG width/height from the IHDR chunk. */
function pngSize(png: Buffer): { width: number; height: number } {
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function capturePng(target: Page | Locator, options: ShotOptions): Promise<Buffer> {
	if (isPage(target)) {
		return target.screenshot({
			fullPage: options.fullPage,
			clip: options.clip,
			animations: "disabled",
			caret: "hide",
		});
	}
	const page = target.page();
	const pad = options.padding ?? 16;
	await target.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
	const box = await target.boundingBox();
	if (!box) throw new Error(`${options.group}/${options.name}: target is not visible`);
	const viewport = page.viewportSize() ?? DEVICES.desktop.viewport;
	const fits = box.width + 2 * pad <= viewport.width && box.height + 2 * pad <= viewport.height;
	if (fits) {
		const x = Math.max(0, Math.floor(box.x - pad));
		const y = Math.max(0, Math.floor(box.y - pad));
		const right = Math.min(viewport.width, Math.ceil(box.x + box.width + pad));
		const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + pad));
		return page.screenshot({
			clip: { x, y, width: right - x, height: bottom - y },
			animations: "disabled",
			caret: "hide",
		});
	}
	// Taller or wider than the viewport: crop the full-page image instead.
	const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
	const x = Math.max(0, Math.floor(box.x + scroll.x - pad));
	const y = Math.max(0, Math.floor(box.y + scroll.y - pad));
	return page.screenshot({
		fullPage: true,
		clip: {
			x,
			y,
			width: Math.ceil(box.width + 2 * pad),
			height: Math.ceil(box.height + 2 * pad),
		},
		animations: "disabled",
		caret: "hide",
	});
}

function encodeWebp(png: string, webp: string, quality: number): void {
	const result = spawnSync(
		"cwebp",
		["-quiet", "-q", String(quality), "-metadata", "none", png, "-o", webp],
		{ encoding: "utf8" },
	);
	if (result.status !== 0) {
		throw new Error(`cwebp failed for ${png}: ${(result.stderr || String(result.error)).trim()}`);
	}
}

/** Read a group's manifest (empty when the group has none yet). */
export function readManifest(group: string): ShotRecord[] {
	try {
		return JSON.parse(
			readFileSync(join(IMAGES_DIR, group, "manifest.json"), "utf8"),
		) as ShotRecord[];
	} catch {
		return [];
	}
}

async function recordManifest(record: ShotRecord): Promise<void> {
	const file = join(IMAGES_DIR, record.group, "manifest.json");
	let entries: ShotRecord[] = [];
	try {
		entries = JSON.parse(await readFile(file, "utf8")) as ShotRecord[];
	} catch {
		entries = [];
	}
	entries = entries.filter((entry) => entry.name !== record.name);
	entries.push(record);
	entries.sort((a, b) => a.name.localeCompare(b.name));
	await writeFile(file, `${JSON.stringify(entries, null, "\t")}\n`);
}

/**
 * Screenshot a page (viewport, `fullPage` or `clip`) or a Locator (with
 * padding), encode it to WebP with cwebp, write it to
 * images/<group>/<name>.webp and upsert its manifest entry. Warns when the
 * WebP exceeds the per-image budget.
 */
export async function shot(target: Page | Locator, options: ShotOptions): Promise<ShotRecord> {
	const { group, name } = options;
	if (!SLUG.test(group) || !SLUG.test(name)) {
		throw new Error(`Group and name must be kebab-case: ${group}/${name}`);
	}
	const png = await capturePng(target, options);
	const groupScratch = join(scratchDir(), group);
	await mkdir(groupScratch, { recursive: true });
	const pngPath = join(groupScratch, `${name}.png`);
	await writeFile(pngPath, png);

	const outDir = join(IMAGES_DIR, group);
	await mkdir(outDir, { recursive: true });
	const webpPath = join(outDir, `${name}.webp`);
	encodeWebp(pngPath, webpPath, options.quality ?? WEBP_QUALITY);

	const { width, height } = pngSize(png);
	const { size: bytes } = await stat(webpPath);
	const record: ShotRecord = {
		group,
		name,
		width,
		height,
		bytes,
		description: options.description,
	};
	await recordManifest(record);
	const kb = (bytes / 1024).toFixed(1);
	const warn =
		bytes > IMAGE_BUDGET_BYTES ? `  OVER BUDGET (> ${IMAGE_BUDGET_BYTES / 1024} KB)` : "";
	console.log(`  ${group}/${name}.webp  ${width}x${height}  ${kb} KB${warn}`);
	return record;
}

/** Total bytes of every file under the images folder (the 8 MB budget). */
export function imagesFolderBytes(dir: string = IMAGES_DIR): number {
	let total = 0;
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return 0;
	}
	for (const entry of entries) {
		const path = join(dir, entry);
		const info = statSync(path);
		total += info.isDirectory() ? imagesFolderBytes(path) : info.size;
	}
	return total;
}

/** Write a throwaway PNG outside the docs folder (verification, debugging). */
export async function scratchShot(page: Page, path: string, fullPage = false): Promise<void> {
	const png = await page.screenshot({ fullPage, animations: "disabled", caret: "hide" });
	writeFileSync(path, png);
}

// ─── Group modules ───────────────────────────────────────────────────────────

/** What capture.ts hands each groups/<group>.ts module. */
export interface CaptureContext {
	group: string;
	browser: Browser;
	baseUrl: string;
	/** A page in a fresh context; closed automatically when the group finishes. */
	page(options?: ContextOptions): Promise<Page>;
	/** `shot` with this group filled in. */
	shot(target: Page | Locator, options: Omit<ShotOptions, "group">): Promise<ShotRecord>;
	goto: typeof goto;
	prepare: typeof prepare;
}

export type GroupModule = { capture(ctx: CaptureContext): Promise<void> };
