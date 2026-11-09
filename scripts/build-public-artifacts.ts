import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPublicationArtifacts, PublicationArtifactError } from "./lib/public-artifacts";

const [inputPath, outputRoot] = process.argv.slice(2);
if (!inputPath || !outputRoot || process.argv.length !== 4) {
	console.error("Usage: bun run build:public-artifacts <input.json> <output-directory>");
	process.exit(1);
}

let temporary: string | undefined;
try {
	const inputStat = await stat(inputPath);
	if (inputStat.size > 4 * 1024 * 1024)
		throw new PublicationArtifactError("Publication input exceeds 4 MiB.");
	const artifacts = createPublicationArtifacts(JSON.parse(await readFile(inputPath, "utf8")));
	await mkdir(outputRoot, { recursive: true });
	const destination = path.resolve(outputRoot, artifacts.snapshot.revision);
	// A new immutable directory keeps failed builds away from existing revisions.
	temporary = `${destination}.building-${crypto.randomUUID()}`;
	await mkdir(temporary);
	await Promise.all([
		writeFile(path.join(temporary, "snapshot.json"), artifacts.snapshotJson, { flag: "wx" }),
		writeFile(
			path.join(temporary, "manifest.json"),
			`${JSON.stringify(artifacts.manifest, null, 2)}\n`,
			{ flag: "wx" },
		),
	]);
	await rename(temporary, destination);
	temporary = undefined;
	console.log(`Created local artifact foundation: ${destination}`);
	console.log("Not deployable: renderer, media, scheduling, and staging verification are pending.");
} catch (error) {
	// Validation/provider payloads can contain secrets; do not print raw input or errors.
	console.error(
		error instanceof PublicationArtifactError
			? error.message
			: "Artifact build failed. Check input validity, revision uniqueness, and filesystem access.",
	);
	process.exitCode = 1;
} finally {
	if (temporary) await rm(temporary, { recursive: true, force: true });
}
