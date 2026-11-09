import { execFile } from "node:child_process";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { PublicBuild } from "./publish";

const execute = promisify(execFile);
const serverRequire = createRequire(new URL("../server/package.json", import.meta.url));

/** No entrypoint, bindings, routes, domains or Worker-first fallback. */
export function nativeAssetConfiguration(accountId: string, workerName: string, directory: string) {
	if (
		!/^[a-f0-9]{32}$/.test(accountId) ||
		!/^linkden-public-(staging|production)$/.test(workerName)
	)
		throw new Error("Invalid native publication target");
	if (!path.isAbsolute(directory)) throw new Error("Publication assets require an absolute path");
	return {
		account_id: accountId,
		name: workerName,
		compatibility_date: "2026-04-24",
		workers_dev: workerName === "linkden-public-staging",
		preview_urls: false,
		assets: {
			directory,
			run_worker_first: false,
			html_handling: "auto-trailing-slash",
			not_found_handling: "404-page",
		},
		observability: { enabled: false },
	};
}

/** Upload one immutable version only. The caller verifies the target and activates separately. */
export async function stageNativeAssets(
	build: PublicBuild,
	config: { accountId: string; workerName: string; apiToken: string },
) {
	if (!config.apiToken || /[\r\n]/.test(config.apiToken))
		throw new Error("Publication credentials are not configured");
	if (!/^[A-Za-z0-9_-]{1,80}$/.test(build.manifest.revision))
		throw new Error("Invalid publication revision");
	const settings = nativeAssetConfiguration(config.accountId, config.workerName, build.destination);
	const temporary = await mkdtemp(path.join(tmpdir(), "linkden-public-stage-"));
	try {
		const configPath = path.join(temporary, "wrangler.json");
		const outputPath = path.join(temporary, "output.jsonl");
		await writeFile(configPath, JSON.stringify(settings), { mode: 0o600, flag: "wx" });
		try {
			await execute(
				process.execPath,
				[
					path.join(
						path.dirname(serverRequire.resolve("wrangler/package.json")),
						"bin/wrangler.js",
					),
					"versions",
					"upload",
					"--config",
					configPath,
					"--tag",
					`${config.workerName}:${build.manifest.revision}`,
				],
				{
					cwd: temporary,
					timeout: 120_000,
					maxBuffer: 1024 * 1024,
					killSignal: "SIGKILL",
					env: {
						PATH: process.env.PATH,
						NODE_ENV: "production",
						CI: "true",
						CLOUDFLARE_ACCOUNT_ID: config.accountId,
						CLOUDFLARE_API_TOKEN: config.apiToken,
						CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
						CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
						WRANGLER_SEND_METRICS: "false",
						WRANGLER_OUTPUT_FILE_PATH: outputPath,
					},
				},
			);
		} catch {
			throw new Error("Native asset version upload failed");
		}
		if ((await lstat(outputPath)).size > 1024 * 1024)
			throw new Error("Native asset upload receipt exceeds its byte budget");
		const uploads: unknown[] = (await readFile(outputPath, "utf8"))
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		const entry = uploads.filter(
			(value) =>
				value && typeof value === "object" && Reflect.get(value, "type") === "version-upload",
		);
		if (entry.length !== 1 || Reflect.get(entry[0]!, "worker_name") !== config.workerName)
			throw new Error("Native asset upload receipt does not match the target");
		const version: unknown = Reflect.get(entry[0]!, "version_id");
		if (
			typeof version !== "string" ||
			!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(version)
		)
			throw new Error("Native asset upload receipt is invalid");
		return { providerVersionId: version };
	} finally {
		await rm(temporary, { recursive: true, force: true });
	}
}
