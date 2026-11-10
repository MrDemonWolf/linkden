/** CI/environment values are owner configuration; browser requests supply only the frozen job ID. */
export function publicationRunnerConfiguration(env: Record<string, string | undefined>) {
	if (
		env.PUBLICATION_RUNNER_APPROVED !== "true" ||
		env.CI !== "true" ||
		env.GITHUB_REPOSITORY !== "MrDemonWolf/linkden" ||
		env.GITHUB_REF !== "refs/heads/main"
	)
		throw new Error("An approved main-branch publication workflow is required");
	const target = env.PUBLICATION_TARGET;
	const operation = env.PUBLICATION_OPERATION || "publish";
	if (operation !== "publish" && operation !== "recover")
		throw new Error("The publication operation is invalid");
	const source = env.PUBLICATION_RENDERER_SOURCE_ID ?? "";
	if (
		!["staging", "production"].includes(target ?? "") ||
		!/^[a-f0-9]{40}$/.test(source) ||
		env.GITHUB_SHA !== source ||
		env.PUBLICATION_JOB_RENDERER_SOURCE_ID !== source
	)
		throw new Error("The publication job does not match the approved renderer and target");
	const revision = env.PUBLICATION_REVISION ?? "";
	const sourceDigest = env.PUBLICATION_SOURCE_DIGEST ?? "";
	const runId = env.GITHUB_RUN_ID ?? "";
	const attempt = env.GITHUB_RUN_ATTEMPT ?? "";
	if (
		!/^[A-Za-z0-9_-]{1,80}$/.test(revision) ||
		!/^[a-f0-9]{64}$/.test(sourceDigest) ||
		!/^\d{1,20}$/.test(runId) ||
		!/^\d{1,5}$/.test(attempt)
	)
		throw new Error("The publication job identity is invalid");
	const publicOrigin = new URL(env.PUBLIC_SITE_URL ?? "");
	if (
		publicOrigin.protocol !== "https:" ||
		publicOrigin.username ||
		publicOrigin.password ||
		publicOrigin.pathname !== "/" ||
		publicOrigin.search ||
		publicOrigin.hash
	)
		throw new Error("The publication origin must be an approved bare HTTPS origin");
	let mediaOrigins: string[] = [];
	try {
		const entries: unknown = JSON.parse(env.PUBLICATION_IMAGE_ORIGINS || "[]");
		if (!Array.isArray(entries) || entries.length > 4) throw new Error();
		mediaOrigins = entries.map((entry: unknown) => {
			if (typeof entry !== "string") throw new Error();
			const url = new URL(entry);
			if (url.protocol !== "https:" || url.origin !== entry) throw new Error();
			return url.origin;
		});
	} catch {
		throw new Error("Image aliases must be an explicit list of up to four HTTPS origins");
	}
	return {
		operation,
		targetId: target!,
		workerName: `linkden-public-${target}`,
		rendererSourceId: source,
		revision,
		sourceDigest,
		runnerId: `${runId}-${attempt}`,
		publicOrigin: publicOrigin.origin,
		mediaOrigins,
	};
}
