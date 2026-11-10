import type { PublicationConfiguration } from "./publication";

const SOURCE_ID = /^[a-f0-9]{40}$/;

export function publicationBindingValue(bindings: object, key: string): string {
	const entry: unknown = Reflect.get(bindings, key);
	return typeof entry === "string" ? entry : "";
}

function publicOrigin(bindings: object): string | null {
	try {
		const url = new URL(publicationBindingValue(bindings, "PUBLIC_SITE_URL"));
		return url.protocol === "https:" &&
			!url.username &&
			!url.password &&
			url.pathname === "/" &&
			!url.search &&
			!url.hash
			? url.origin
			: null;
	} catch {
		return null;
	}
}

/** Opt-in server bindings only; neither a request nor saved settings choose a deployment target. */
export function publicationConfiguration(bindings: object): PublicationConfiguration {
	if (publicationBindingValue(bindings, "PUBLICATION_ENABLED") !== "true") {
		return { enabled: false, unavailableReason: "Publishing has not been enabled" };
	}
	const targetId = publicationBindingValue(bindings, "PUBLICATION_TARGET");
	const rendererSourceId = publicationBindingValue(bindings, "PUBLICATION_RENDERER_SOURCE_ID");
	const origin = publicOrigin(bindings);
	if (
		!["staging", "production"].includes(targetId) ||
		!SOURCE_ID.test(rendererSourceId) ||
		!origin ||
		!publicationBindingValue(bindings, "PUBLICATION_GITHUB_TOKEN")
	) {
		return {
			enabled: false,
			unavailableReason:
				"Configure an approved target, public origin, renderer revision and runner",
		};
	}
	return {
		enabled: true,
		targetId,
		publicOrigin: origin,
		rendererSourceId,
		...(publicationBindingValue(bindings, "PUBLICATION_SCHEDULER_ENABLED") === "true"
			? { schedulerEnabled: true }
			: {}),
	};
}
