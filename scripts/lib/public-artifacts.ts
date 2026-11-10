import { createHash } from "node:crypto";
import {
	createPublicationSnapshot,
	publicSnapshotSchema,
} from "../../packages/validators/src/publication";

export {
	createPublicationSnapshot,
	PublicationArtifactError,
	type PublicSnapshot,
	publicSnapshotSchema,
} from "../../packages/validators/src/publication";

/** Build artifacts from the exact frozen public revision; never reread authoring data. */
export function createPublicationArtifactFromSnapshot(raw: unknown) {
	const snapshot = publicSnapshotSchema.parse(raw);
	const snapshotJson = `${JSON.stringify(snapshot, null, 2)}\n`;
	const manifest = {
		schemaVersion: 1,
		revision: snapshot.revision,
		deployable: false,
		status: "artifact-foundation-only",
		pending: [
			"static-renderer",
			"referenced-media-bundle",
			"scheduled-publication",
			"staging-routing-proof",
		],
		files: [
			{ path: "snapshot.json", sha256: createHash("sha256").update(snapshotJson).digest("hex") },
		],
	};
	return { snapshot, snapshotJson, manifest };
}

/** Project raw authoring input once, then compile that frozen public revision. */
export function createPublicationArtifacts(raw: unknown) {
	return createPublicationArtifactFromSnapshot(createPublicationSnapshot(raw));
}
