import type { ContactSubmission } from "@/components/public/public-runtime";

/** A deliberate public action, never an administrative API or arbitrary redirect target. */
export function publicContactEndpoint(value: string): string {
	const url = new URL(value);
	const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
	if (
		(url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
		url.username ||
		url.password ||
		url.pathname !== "/api/contact" ||
		url.search ||
		url.hash
	)
		throw new Error("Contact action must be an HTTPS /api/contact URL (HTTP is local-only)");
	return url.href;
}

export function createPublicContactSubmit(endpoint: string) {
	const target = publicContactEndpoint(endpoint);
	return async (input: ContactSubmission): Promise<void> => {
		const response = await fetch(target, {
			method: "POST",
			headers: { "content-type": "application/json", accept: "application/json" },
			credentials: "omit",
			redirect: "error",
			referrerPolicy: "no-referrer",
			body: JSON.stringify(input),
		});
		const body: unknown = await response.json().catch(() => null);
		if (
			!response.ok ||
			!body ||
			typeof body !== "object" ||
			!("success" in body) ||
			body.success !== true
		) {
			const message =
				body && typeof body === "object" && "error" in body && typeof body.error === "string"
					? body.error
					: "Contact submission failed";
			throw Object.assign(new Error(message), {
				data: {
					httpStatus: response.status,
					code:
						response.status === 429
							? "TOO_MANY_REQUESTS"
							: response.status === 403
								? "FORBIDDEN"
								: response.status === 400
									? "BAD_REQUEST"
									: "INTERNAL_SERVER_ERROR",
				},
			});
		}
	};
}
