import { validatePublicContactUrl } from "@linkden/validators/public-contact";
import { publicContactOrigin } from "./origin";

interface IngressBindings {
	LINKDEN_SERVING_MODE?: string;
	PUBLIC_CONTACT_URL?: string;
	PUBLIC_SITE_URL?: string;
	CORS_ORIGIN?: string;
}

/** URL guards supplement closed Worker aliases and service-binding capability; they are not auth. */
export function splitApiIngress(
	request: Request,
	bindings: IngressBindings,
): "allow" | "not-found" | "unavailable" {
	const mode = bindings.LINKDEN_SERVING_MODE || "legacy";
	if (mode === "legacy") return "allow";
	if (mode !== "split") return "unavailable";
	const url = new URL(request.url);
	const host = request.headers.get("host");
	if (url.protocol !== "https:" || (host !== null && host !== url.host)) return "not-found";
	// Both existing web transports choose this fixed placeholder through the API binding.
	if (url.origin === "https://api.internal" && !url.username && !url.password) return "allow";
	if (!bindings.PUBLIC_CONTACT_URL) return "not-found";
	const endpoint = validatePublicContactUrl(bindings.PUBLIC_CONTACT_URL, bindings.PUBLIC_SITE_URL);
	const adminOrigin = publicContactOrigin(bindings.CORS_ORIGIN);
	if (!endpoint || !adminOrigin || new URL(endpoint).origin === adminOrigin) return "unavailable";
	return request.url === endpoint && ["POST", "OPTIONS"].includes(request.method)
		? "allow"
		: "not-found";
}
