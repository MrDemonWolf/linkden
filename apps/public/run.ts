import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { failPublicationStatement } from "../../packages/db/src/publication";
import { buildStaticSnapshot } from "./build";
import { cloudflarePublicationClient } from "./cloudflare";
import { assertPublicationMediaReady } from "./publication-preflight";
import { runPublication } from "./publish";
import { recoverPublication } from "./recover";
import { publicationRunnerConfiguration } from "./runner-config";
import { stageNativeAssets } from "./stage";

/** This entrypoint is CI-only. Local validation uses the injected runner without cloud credentials. */
async function main() {
	const bindings: Record<string, string | undefined> = process.env;
	const job = publicationRunnerConfiguration(bindings);
	const credentials = {
		accountId: bindings.CLOUDFLARE_ACCOUNT_ID ?? "",
		apiToken: bindings.CLOUDFLARE_API_TOKEN ?? "",
		databaseId: bindings.PUBLICATION_DATABASE_ID ?? "",
		imagesBucket: bindings.PUBLICATION_IMAGES_BUCKET || undefined,
		workerName: job.workerName,
		publicOrigin: job.publicOrigin,
	};
	const provider = cloudflarePublicationClient(credentials);
	const source = await provider.database.query({
		sql: `SELECT source_digest FROM publication_revision WHERE revision = ?1 AND target_id = ?2 AND public_origin = ?3${job.operation === "publish" ? " AND renderer_source_id = ?4" : ""}`,
		params: [
			job.revision,
			job.targetId,
			job.publicOrigin,
			...(job.operation === "publish" ? [job.rendererSourceId] : []),
		],
	});
	if (source.rows[0]?.source_digest !== job.sourceDigest)
		throw new Error("The requested revision does not match the frozen job");
	// Fixed target/origin and closed alternate hosts are checked before any upload or activation.
	try {
		await provider.verifyTarget();
	} catch {
		if (job.operation === "publish")
			await provider.database.query(
				failPublicationStatement({
					revision: job.revision,
					runnerId: null,
					code: "runner_failed",
					now: Date.now(),
				}),
			);
		throw new Error("The approved publication target could not be verified");
	}
	if (job.operation === "recover") {
		const result = await recoverPublication({
			...job,
			database: provider.database,
			activate: ({ providerVersionId }) => provider.activate(providerVersionId),
		});
		console.log(JSON.stringify(result));
		if (result.status !== "recovered") process.exitCode = 1;
		return;
	}
	const output = fileURLToPath(
		new URL(`../../tmp/public-publication/${job.runnerId}/`, import.meta.url),
	);
	await mkdir(output, { recursive: true });
	const result = await runPublication({
		...job,
		database: provider.database,
		build: async (snapshot) => {
			const build = await buildStaticSnapshot(
				snapshot,
				output,
				bindings.PUBLICATION_CONTACT_ACTION,
				credentials.imagesBucket
					? { media: { origins: job.mediaOrigins, read: provider.readPublicImage } }
					: undefined,
			);
			assertPublicationMediaReady(job.publicOrigin, build.manifest);
			return build;
		},
		stage: (build) => stageNativeAssets(build, credentials),
		activate: ({ providerVersionId }) => provider.activate(providerVersionId),
		restore: async ({ providerVersionId }) => {
			await provider.activate(providerVersionId);
		},
	});
	console.log(JSON.stringify(result));
	if (result.status === "failed") process.exitCode = 1;
}

if (import.meta.main) {
	main().catch(() => {
		// Provider/DB/build diagnostics can contain owner data. Only safe runner codes leave this process.
		console.error(
			"Publication did not complete. Check the protected publication status and target configuration.",
		);
		process.exitCode = 1;
	});
}
