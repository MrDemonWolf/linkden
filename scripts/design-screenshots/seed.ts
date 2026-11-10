// ─── Seed the screenshot stack ───────────────────────────────────────────────
// bun scripts/design-screenshots/seed.ts
//
// Idempotent: every run leaves the stack in the same state.
//   1. First run only: creates the admin the way /admin/setup step 1 does
//      (POST /api/auth/sign-up/email), with the synthetic account in
//      fixture.json. Setup's profile and theme steps are covered by step 4.
//   2. Signs in (dev login, else the seeded password).
//   3. Generates the sample images with ImageMagick and uploads them through
//      POST /api/upload. An image already stored with identical bytes is reused,
//      so re-runs do not pile up orphan uploads.
//   4. backup.import (replace) of fixture.data with the image paths filled in.
//      This also clears the Inbox (`contactSubmissions: []`).
//   5. Sends fixture.seedMessages through the public contact form
//      (public.submitContact, CAPTCHA provider "none"), then backdates them and
//      sets their read state so the Inbox shows "2h ago", "1d ago", ...
//   6. Restores contact_form_enabled to the fixture value and prints a summary.
//
// It replaces the stack's content, so it only runs against a loopback URL.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { APIRequestContext } from "@playwright/test";
import fixture from "./fixture.json";
import {
	BASE_URL,
	env,
	hasAdmin,
	launchBrowser,
	newContext,
	SEED_ACCOUNT,
	signIn,
	trpcMutation,
	trpcQuery,
} from "./lib";

type FixtureData = typeof fixture.data;
type SeedImage = (typeof fixture.seedImages)[number];
type ImageTarget = SeedImage["targets"][number];

interface ExportedBackup {
	data: {
		blocks: { id: string; config: string | null }[];
		settings: Record<string, string>;
		contactSubmissions: (Record<string, unknown> & { id: string; email: string })[];
	};
}

// ─── Safety ──────────────────────────────────────────────────────────────────

function assertDisposableStack(): void {
	const url = new URL(BASE_URL);
	if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.protocol !== "http:") {
		throw new Error(`Refusing to seed ${BASE_URL}: seed.ts only targets a local http stack.`);
	}
	if (url.port === "3001" && env("DESIGN_SHOTS_ALLOW_DEFAULT_PORT") !== "1") {
		throw new Error(
			"Refusing to seed :3001, the default dev stack. Start a disposable stack (README.md) " +
				"or set DESIGN_SHOTS_ALLOW_DEFAULT_PORT=1 if :3001 really is disposable.",
		);
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

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

// ─── Images ──────────────────────────────────────────────────────────────────
// Flat abstract shapes in the Classic preset's navy/cyan with a sand and coral
// accent. No people, logos or text. Output is byte-stable (metadata stripped).

const NAVY = "#091533";
const DEEP = "#123A6B";
const BLUE = "#1E4E8C";
const CYAN = "#0FACED";
const SKY = "#7DD3FC";
const SAND = "#F4EDE4";
const CORAL = "#E8A87C";

const layer = (size: string, fill: string, draw: string) => [
	"(",
	"-size",
	size,
	"xc:none",
	"-fill",
	fill,
	"-draw",
	draw,
	")",
	"-composite",
];

const IMAGE_RECIPES: Record<string, string[]> = {
	avatar: [
		"-size",
		"512x512",
		`gradient:#0B1B42-${CYAN}`,
		...layer("512x512", SKY, "circle 340,170 340,250"),
		...layer("512x512", NAVY, "ellipse 120,520 320,170 0,360"),
		...layer("512x512", DEEP, "ellipse 430,560 300,200 0,360"),
		...layer("512x512", SAND, "circle 340,170 340,196"),
	],
	banner: [
		"-size",
		"500x1500",
		`gradient:${CYAN}-${NAVY}`,
		"-rotate",
		"90",
		...layer("1500x500", `${SKY}80`, "circle 1180,120 1180,330"),
		...layer("1500x500", `${SAND}40`, "circle 1180,120 1180,190"),
		...layer("1500x500", `${NAVY}99`, "ellipse 300,560 620,240 0,360"),
		...layer("1500x500", `${DEEP}cc`, "ellipse 900,620 700,260 0,360"),
	],
	"field-notes-cover": [
		"-size",
		"1200x675",
		`xc:${SAND}`,
		"-fill",
		NAVY,
		"-draw",
		"rectangle 0,430 1200,675",
		"-fill",
		CYAN,
		"-draw",
		"circle 860,250 860,400",
		"-fill",
		SAND,
		"-draw",
		"circle 860,250 860,300",
		"-fill",
		DEEP,
		"-draw",
		"polygon 0,430 260,250 520,430",
		"-fill",
		BLUE,
		"-draw",
		"polygon 300,430 560,190 820,430",
		"-fill",
		CORAL,
		"-draw",
		"rectangle 90,90 330,110",
		"-draw",
		"rectangle 90,130 250,150",
		"-fill",
		SKY,
		"-draw",
		"rectangle 0,520 1200,532",
	],
	"portfolio-tile": [
		"-size",
		"400x400",
		`xc:${NAVY}`,
		"-fill",
		CYAN,
		"-draw",
		"roundrectangle 40,40 190,190 18,18",
		"-fill",
		SAND,
		"-draw",
		"roundrectangle 210,40 360,190 18,18",
		"-fill",
		CORAL,
		"-draw",
		"roundrectangle 40,210 190,360 18,18",
		"-fill",
		BLUE,
		"-draw",
		"roundrectangle 210,210 360,360 18,18",
		"-fill",
		NAVY,
		"-draw",
		"circle 285,115 285,150",
	],
	"cover-study": [
		"-size",
		"675x1200",
		`gradient:${SAND}-#E8D5C0`,
		"-rotate",
		"90",
		"-fill",
		CORAL,
		"-draw",
		"circle 300,300 300,470",
		"-fill",
		NAVY,
		"-draw",
		"roundrectangle 520,140 1080,560 28,28",
		"-fill",
		CYAN,
		"-draw",
		"roundrectangle 580,200 1020,250 12,12",
		"-fill",
		SKY,
		"-draw",
		"roundrectangle 580,280 880,320 12,12",
		"-fill",
		BLUE,
		"-draw",
		"roundrectangle 580,350 960,390 12,12",
		"-fill",
		SAND,
		"-draw",
		"roundrectangle 580,440 760,500 20,20",
	],
};

function generateImage(id: string, dir: string): Buffer {
	const recipe = IMAGE_RECIPES[id];
	if (!recipe) throw new Error(`fixture.json names image "${id}", which has no recipe in seed.ts`);
	const out = join(dir, `${id}.png`);
	const args = [...recipe, "-depth", "8", "-strip", "-define", "png:exclude-chunks=date,time", out];
	const result = spawnSync("magick", args, { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(
			`ImageMagick failed for ${id}: ${(result.stderr || String(result.error)).trim()}`,
		);
	}
	return readFileSync(out);
}

function currentValue(backup: ExportedBackup, target: ImageTarget): string | undefined {
	if ("setting" in target && target.setting) return backup.data.settings[target.setting];
	if ("block" in target && target.block && target.config) {
		const block = backup.data.blocks.find((b) => b.id === target.block);
		try {
			const value = (JSON.parse(block?.config ?? "{}") as Record<string, unknown>)[target.config];
			return typeof value === "string" ? value : undefined;
		} catch {
			return undefined;
		}
	}
	return undefined;
}

/** The stored upload for this image when its bytes are unchanged, else null. */
async function reusableUpload(
	api: APIRequestContext,
	current: string | undefined,
	purpose: string,
	png: Buffer,
): Promise<string | null> {
	if (!current?.startsWith(`/api/images/${purpose}/`)) return null;
	const res = await api.get(`${BASE_URL}${current}`);
	if (!res.ok()) return null;
	return sha256(await res.body()) === sha256(png) ? current : null;
}

async function upload(
	api: APIRequestContext,
	id: string,
	purpose: string,
	png: Buffer,
): Promise<string> {
	return patiently(`upload ${id}`, async () => {
		const res = await api.post(`${BASE_URL}/api/upload`, {
			headers: { origin: BASE_URL },
			multipart: {
				file: { name: `${id}.png`, mimeType: "image/png", buffer: png },
				purpose,
			},
		});
		if (!res.ok()) {
			const error = new Error(
				`Upload of ${id} failed (${res.status()}): ${(await res.text()).slice(0, 200)}`,
			) as Error & { status?: number };
			error.status = res.status();
			throw error;
		}
		const { publicUrl } = (await res.json()) as { publicUrl: string };
		return publicUrl;
	});
}

function applyImage(data: FixtureData, target: ImageTarget, url: string): void {
	if ("setting" in target && target.setting) {
		(data.settings as Record<string, string>)[target.setting] = url;
		return;
	}
	if ("block" in target && target.block && target.config) {
		const block = data.blocks.find((b) => b.id === target.block);
		if (!block) throw new Error(`fixture.json: image target block "${target.block}" not found`);
		const config = JSON.parse(block.config) as Record<string, unknown>;
		config[target.config] = url;
		block.config = JSON.stringify(config);
		return;
	}
	throw new Error(`fixture.json: unsupported image target ${JSON.stringify(target)}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	assertDisposableStack();
	console.log(`Seeding ${BASE_URL}`);

	const health = await fetch(`${BASE_URL}/api/health`).catch(() => null);
	const status = (await health?.json().catch(() => null)) as { auth?: string } | null;
	if (!health?.ok || status?.auth !== "ok") {
		throw new Error(
			`${BASE_URL}/api/health is not healthy (auth: ${status?.auth ?? "unreachable"})`,
		);
	}

	const browser = await launchBrowser();
	try {
		const admin = await newContext(browser);
		const api = admin.request;

		// 1. First-run setup (what /admin/setup step 1 sends).
		if (await hasAdmin(api)) {
			console.log("- admin exists; skipping setup");
		} else {
			const res = await api.post(`${BASE_URL}/api/auth/sign-up/email`, {
				headers: { origin: BASE_URL },
				data: {
					name: SEED_ACCOUNT.name,
					email: SEED_ACCOUNT.email,
					password: SEED_ACCOUNT.password,
				},
			});
			if (!res.ok()) throw new Error(`Setup sign-up failed (${res.status()}): ${await res.text()}`);
			await admin.clearCookies();
			console.log(`- created admin ${SEED_ACCOUNT.email} (setup)`);
		}

		// 2. Sign in.
		await signIn(admin);
		const session = (await (await api.get(`${BASE_URL}/api/auth/get-session`)).json()) as {
			user: { email: string };
		};
		console.log(`- signed in as ${session.user.email}`);

		// 3. Images.
		const before = await trpcQuery<ExportedBackup>(api, "backup.export");
		const data = structuredClone(fixture.data);
		const scratch = mkdtempSync(join(tmpdir(), "linkden-seed-images-"));
		for (const image of fixture.seedImages) {
			const png = generateImage(image.id, scratch);
			const [first] = image.targets;
			const existing = first
				? await reusableUpload(api, currentValue(before, first), image.purpose, png)
				: null;
			const url = existing ?? (await upload(api, image.id, image.purpose, png));
			for (const target of image.targets) applyImage(data, target, url);
			console.log(`- image ${image.id}: ${existing ? "reused" : "uploaded"} ${url}`);
		}

		// 4. Content. The form must be on while the sample messages are sent.
		const contactFormSetting = fixture.data.settings.contact_form_enabled;
		data.settings.contact_form_enabled = "true";
		const imported = await trpcMutation<{
			skipped: Record<string, number>;
		}>(api, "backup.import", { mode: "replace", data });
		const skipped = Object.entries(imported.skipped).filter(([, n]) => n > 0);
		if (skipped.length > 0) {
			throw new Error(`backup.import skipped rows; fix fixture.json: ${JSON.stringify(skipped)}`);
		}
		console.log(
			`- imported ${data.blocks.length} blocks, ${Object.keys(data.settings).length} settings, ` +
				`${data.socialNetworks.length} social networks (replace)`,
		);

		// 5. Inbox, through the public form as an anonymous visitor.
		const connect = data.blocks.find((b) => b.type === "connect");
		const visitor = await newContext(browser);
		for (const message of fixture.seedMessages) {
			await patiently(`message from ${message.firstName}`, () =>
				trpcMutation(visitor.request, "public.submitContact", {
					firstName: message.firstName,
					lastName: message.lastName,
					email: message.email,
					whereMet: message.whereMet,
					message: message.message,
					blockId: connect?.id,
					blockTitle: connect?.title ?? undefined,
					consent: true,
				}),
			);
		}
		await visitor.close();

		// Backdate and mark read, so the Inbox looks lived-in and reads the same
		// on every run ("2h ago", "1d ago", ...). Captures should follow seeding.
		const now = Date.now();
		const after = await trpcQuery<ExportedBackup>(api, "backup.export");
		const contactSubmissions = after.data.contactSubmissions.map((row) => {
			const spec = fixture.seedMessages.find((m) => m.email === row.email);
			if (!spec) return row;
			const at = new Date(now - spec.ageHours * 3_600_000).toISOString();
			return { ...row, createdAt: at, updatedAt: at, isRead: spec.read };
		});
		await trpcMutation(api, "backup.import", { mode: "replace", data: { contactSubmissions } });
		console.log(`- inbox: ${contactSubmissions.length} messages via public.submitContact`);

		// 6. Restore the fixture's contact-form setting.
		await trpcMutation(api, "settings.update", {
			key: "contact_form_enabled",
			value: contactFormSetting,
		});

		// Summary from the same reads the app uses.
		const page = await trpcQuery<{
			profile: { name: string } | null;
			blocks: { type: string }[];
			socialNetworks: unknown[];
		}>(api, "public.getPage");
		const unread = await trpcQuery<{ count: number }>(api, "forms.unreadCount");
		const types = [...new Set(page.blocks.map((b) => b.type))].sort();
		console.log(
			`Done: "${page.profile?.name}" with ${page.blocks.length} public blocks ` +
				`(${types.join(", ")}), ${page.socialNetworks.length} social icons, ` +
				`${contactSubmissions.length} messages (${unread.count} unread).`,
		);
		await admin.close();
	} finally {
		await browser.close();
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
