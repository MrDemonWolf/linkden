// ─── Screenshot runner ───────────────────────────────────────────────────────
// bun scripts/design-screenshots/capture.ts [group...]
// bun scripts/design-screenshots/capture.ts --list
//
// Runs groups/<group>.ts modules (each exports `capture(ctx)`) against the
// seeded stack at DESIGN_SHOTS_URL (default http://localhost:3101). With no
// arguments it runs every module in groups/ whose name does not start with "_".
// Each group writes only images/<group>/ and its own manifest.json, so
// different groups can run in parallel processes.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { BrowserContext } from "@playwright/test";
import {
	BASE_URL,
	type CaptureContext,
	FOLDER_BUDGET_BYTES,
	type GroupModule,
	goto,
	IMAGE_BUDGET_BYTES,
	imagesFolderBytes,
	launchBrowser,
	newContext,
	prepare,
	SCRIPT_DIR,
	type ShotRecord,
	shot,
} from "./lib";

const GROUPS_DIR = join(SCRIPT_DIR, "groups");

function availableGroups(): string[] {
	if (!existsSync(GROUPS_DIR)) return [];
	return readdirSync(GROUPS_DIR)
		.filter((file) => file.endsWith(".ts") && !file.startsWith("_"))
		.map((file) => file.slice(0, -3))
		.sort();
}

interface GroupResult {
	group: string;
	records: ShotRecord[];
	error?: string;
	ms: number;
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

async function runGroup(
	group: string,
	browser: Awaited<ReturnType<typeof launchBrowser>>,
): Promise<GroupResult> {
	const started = Date.now();
	const records: ShotRecord[] = [];
	const contexts: BrowserContext[] = [];
	console.log(`\n[${group}]`);
	try {
		const mod = (await import(
			pathToFileURL(join(GROUPS_DIR, `${group}.ts`)).href
		)) as Partial<GroupModule>;
		if (typeof mod.capture !== "function") throw new Error("module does not export capture(ctx)");
		const ctx: CaptureContext = {
			group,
			browser,
			baseUrl: BASE_URL,
			async page(options) {
				const context = await newContext(browser, options);
				contexts.push(context);
				return context.newPage();
			},
			async shot(target, options) {
				const record = await shot(target, { ...options, group });
				records.push(record);
				return record;
			},
			goto,
			prepare,
		};
		await mod.capture(ctx);
		return { group, records, ms: Date.now() - started };
	} catch (error) {
		const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
		console.error(`  FAILED: ${message}`);
		return { group, records, error: message.split("\n")[0], ms: Date.now() - started };
	} finally {
		await Promise.all(contexts.map((context) => context.close().catch(() => {})));
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const available = availableGroups();
	if (args.includes("--list")) {
		console.log(available.length ? available.join("\n") : "(no group modules in groups/)");
		return;
	}
	const requested = args.length > 0 ? args : available;
	const missing = requested.filter((group) => !existsSync(join(GROUPS_DIR, `${group}.ts`)));
	if (missing.length > 0) {
		throw new Error(
			`No module for: ${missing.join(", ")} (available: ${available.join(", ") || "none"})`,
		);
	}
	if (requested.length === 0) {
		console.log("No group modules in scripts/design-screenshots/groups/. Nothing to capture.");
		return;
	}

	const health = await fetch(`${BASE_URL}/api/health`).catch(() => null);
	if (!health?.ok) {
		throw new Error(`${BASE_URL} is not reachable. Start the stack (README.md) and run seed.ts.`);
	}

	console.log(`Capturing ${requested.join(", ")} from ${BASE_URL}`);
	const browser = await launchBrowser();
	const results: GroupResult[] = [];
	try {
		for (const group of requested) results.push(await runGroup(group, browser));
	} finally {
		await browser.close();
	}

	console.log("\nSummary");
	let failed = false;
	for (const result of results) {
		const total = result.records.reduce((sum, record) => sum + record.bytes, 0);
		const over = result.records.filter((record) => record.bytes > IMAGE_BUDGET_BYTES);
		const status = result.error ? `FAILED (${result.error})` : "ok";
		console.log(
			`  ${result.group}: ${result.records.length} images, ${kb(total)}, ` +
				`${(result.ms / 1000).toFixed(1)}s, ${status}`,
		);
		for (const record of over) {
			console.log(`    over ${kb(IMAGE_BUDGET_BYTES)}: ${record.name}.webp (${kb(record.bytes)})`);
		}
		if (result.error || over.length > 0) failed = true;
	}
	const folder = imagesFolderBytes();
	const folderNote = folder > FOLDER_BUDGET_BYTES ? "  OVER BUDGET" : "";
	console.log(
		`  images folder: ${(folder / 1024 / 1024).toFixed(2)} MB of ` +
			`${FOLDER_BUDGET_BYTES / 1024 / 1024} MB${folderNote}`,
	);
	if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
