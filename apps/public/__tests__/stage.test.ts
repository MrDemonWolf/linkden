// @vitest-environment node
import type { ExecFileOptions } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
	run: vi.fn<(file: string, args: string[], options: ExecFileOptions) => Promise<void>>(),
}));
vi.mock("node:child_process", () => ({
	execFile: (
		file: string,
		args: string[],
		options: ExecFileOptions,
		callback: (error: Error | null, stdout?: string, stderr?: string) => void,
	) => {
		void fake.run(file, args, options).then(
			() => callback(null, "", ""),
			(error: Error) => callback(error),
		);
	},
}));

import { stageNativeAssets } from "../stage";

const version = "12345678-1234-1234-1234-123456789012";
const build = {
	destination: "/tmp/public-fixture",
	manifest: { revision: "release-1", files: [] },
};
const config = {
	accountId: "a".repeat(32),
	workerName: "linkden-public-staging",
	apiToken: "private-provider-token",
};
let output: unknown;
let lastOptions: ExecFileOptions;
beforeEach(() => {
	vi.clearAllMocks();
	output = { type: "version-upload", worker_name: config.workerName, version_id: version };
	fake.run.mockImplementation(async (_file, _args, options) => {
		lastOptions = options;
		await writeFile(String(options.env?.WRANGLER_OUTPUT_FILE_PATH), JSON.stringify(output));
	});
});

describe("native immutable version upload", () => {
	it("uses installed Wrangler with explicit argv and a minimal private environment, then removes temporary receipts", async () => {
		let generated: unknown;
		fake.run.mockImplementation(async (file, args, options) => {
			lastOptions = options;
			expect(file).toBe(process.execPath);
			expect(args).toEqual([
				expect.stringContaining("wrangler/bin/wrangler.js"),
				"versions",
				"upload",
				"--config",
				expect.any(String),
				"--tag",
				"linkden-public-staging:release-1",
			]);
			generated = JSON.parse(await readFile(args[4]!, "utf8"));
			expect(args.join(" ")).not.toContain(config.apiToken);
			expect(options.timeout).toBe(120_000);
			expect(options.maxBuffer).toBe(1024 * 1024);
			expect(options.env).toEqual({
				PATH: process.env.PATH,
				NODE_ENV: "production",
				CI: "true",
				CLOUDFLARE_ACCOUNT_ID: config.accountId,
				CLOUDFLARE_API_TOKEN: config.apiToken,
				CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
				CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
				WRANGLER_SEND_METRICS: "false",
				WRANGLER_OUTPUT_FILE_PATH: expect.any(String),
			});
			await writeFile(String(options.env?.WRANGLER_OUTPUT_FILE_PATH), JSON.stringify(output));
		});
		expect(await stageNativeAssets(build, config)).toEqual({ providerVersionId: version });
		expect(generated).toMatchObject({
			assets: { directory: build.destination, run_worker_first: false },
			preview_urls: false,
		});
		expect(generated).not.toHaveProperty("main");
		expect(generated).not.toHaveProperty("bindings");
		expect(generated).not.toHaveProperty("routes");
		await expect(access(String(lastOptions.cwd))).rejects.toThrow();
	});

	it.each([
		{ type: "version-upload", worker_name: "other-worker", version_id: version },
		{ type: "version-upload", worker_name: config.workerName, version_id: "invented" },
		{ type: "deployment", worker_name: config.workerName, version_id: version },
	])("rejects mismatched or malformed receipts without activation", async (receipt) => {
		output = receipt;
		await expect(stageNativeAssets(build, config)).rejects.toThrow(/receipt/);
		await expect(access(String(lastOptions.cwd))).rejects.toThrow();
	});
	it("bounds the receipt before reading and sanitizes child errors", async () => {
		fake.run.mockImplementationOnce(async (_file, _args, options) => {
			lastOptions = options;
			await writeFile(String(options.env?.WRANGLER_OUTPUT_FILE_PATH), " ".repeat(1024 * 1024 + 1));
		});
		await expect(stageNativeAssets(build, config)).rejects.toThrow("byte budget");
		fake.run.mockRejectedValueOnce(new Error(`Provider body with ${config.apiToken}`));
		await expect(stageNativeAssets(build, config)).rejects.toThrow(
			"Native asset version upload failed",
		);
	});
	it("rejects invalid credentials and revision paths before starting a process", async () => {
		await expect(stageNativeAssets(build, { ...config, apiToken: "" })).rejects.toThrow();
		await expect(
			stageNativeAssets(
				{ ...build, manifest: { ...build.manifest, revision: "../secret" } },
				config,
			),
		).rejects.toThrow();
		expect(fake.run).not.toHaveBeenCalled();
	});
});
