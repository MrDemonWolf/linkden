import type { PublicationJobReference } from "@linkden/validators/publication";
import {
	publicationBindingValue,
	publicationConfiguration,
} from "@linkden/validators/publication-config";

export { publicationConfiguration } from "@linkden/validators/publication-config";

const REPOSITORY = "MrDemonWolf/linkden";
const WORKFLOW = "publish-public.yml";

/** Fixed repository/workflow/ref, bounded wait, and no provider payloads in errors or logs. */
export async function dispatchPublication(
	bindings: object,
	job: PublicationJobReference,
	transport: typeof fetch = fetch,
): Promise<void> {
	const config = publicationConfiguration(bindings);
	if (
		!config.enabled ||
		job.targetId !== config.targetId ||
		job.rendererSourceId !== config.rendererSourceId ||
		!/^[A-Za-z0-9_-]{1,80}$/.test(job.revision) ||
		!/^[a-f0-9]{64}$/.test(job.sourceDigest)
	) {
		throw new Error("Publication runner is not configured for this revision");
	}
	try {
		const response = await transport(
			`https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/dispatches`,
			{
				method: "POST",
				redirect: "error",
				signal: AbortSignal.timeout(10_000),
				headers: {
					Authorization: `Bearer ${publicationBindingValue(bindings, "PUBLICATION_GITHUB_TOKEN")}`,
					Accept: "application/vnd.github+json",
					"Content-Type": "application/json",
					"X-GitHub-Api-Version": "2022-11-28",
					"User-Agent": "LinkDen-Publisher",
				},
				body: JSON.stringify({
					ref: "main",
					inputs: {
						operation: "publish",
						revision: job.revision,
						target: job.targetId,
						source_digest: job.sourceDigest,
						renderer_source_id: job.rendererSourceId,
					},
				}),
			},
		);
		await response.body?.cancel();
		if (response.status !== 204) throw new Error("Dispatch rejected");
	} catch {
		throw new Error("Publication runner could not be started");
	}
}
