import { TRPCError } from "@trpc/server";

// Supported CAPTCHA providers → their server-side verify endpoints.
export const CAPTCHA_VERIFY_URLS = {
	turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
	recaptcha: "https://www.google.com/recaptcha/api/siteverify",
	hcaptcha: "https://api.hcaptcha.com/siteverify",
} as const;
export type CaptchaProvider = keyof typeof CAPTCHA_VERIFY_URLS;

// reCAPTCHA v3 / Turnstile action bound to the contact widget. When the provider
// returns an action, we reject a token minted for a different one.
export const EXPECTED_CAPTCHA_ACTION = "contact";

const VERIFY_TIMEOUT_MS = 10_000;

interface CaptchaVerifyResponse {
	success: boolean;
	hostname?: string;
	action?: string;
	score?: number;
	"error-codes"?: string[];
}

/**
 * Verify a CAPTCHA token against its provider. Throws a TRPCError on any
 * failure — unknown provider, missing token, provider timeout/outage, or a
 * failed / mismatched (hostname, action) verification. Fails closed.
 */
export async function verifyCaptcha(opts: {
	provider: string;
	secret: string;
	token: string | undefined;
	remoteip?: string;
	expectedHostname?: string | null;
	fetchImpl?: typeof fetch;
}): Promise<void> {
	const { provider, secret, token, remoteip, expectedHostname, fetchImpl = fetch } = opts;

	if (!(provider in CAPTCHA_VERIFY_URLS)) {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "CAPTCHA is misconfigured" });
	}
	if (!token) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification required" });
	}

	const params = new URLSearchParams({ secret, response: token });
	if (remoteip) params.set("remoteip", remoteip);

	let data: CaptchaVerifyResponse;
	try {
		const res = await fetchImpl(CAPTCHA_VERIFY_URLS[provider as CaptchaProvider], {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params,
			signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`verify status ${res.status}`);
		data = (await res.json()) as CaptchaVerifyResponse;
	} catch {
		// Timeout or provider outage — fail closed.
		throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification unavailable" });
	}

	const hostnameMismatch =
		!!data.hostname && !!expectedHostname && data.hostname !== expectedHostname;
	const actionMismatch = !!data.action && data.action !== EXPECTED_CAPTCHA_ACTION;
	if (!data.success || hostnameMismatch || actionMismatch) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification failed" });
	}
}
