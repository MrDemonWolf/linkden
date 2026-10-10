import { TRPCError } from "@trpc/server";

// Supported CAPTCHA providers → their server-side verify endpoints.
export const CAPTCHA_VERIFY_URLS = {
	turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
	recaptcha: "https://www.google.com/recaptcha/api/siteverify",
	hcaptcha: "https://api.hcaptcha.com/siteverify",
} as const;
export type CaptchaProvider = keyof typeof CAPTCHA_VERIFY_URLS;

// Action bound to the contact widget. Turnstile must always echo it back (the
// widget is rendered with `action: "contact"`); reCAPTCHA v3 echoes it with a
// score; hCaptcha / reCAPTCHA v2 do not return one, but a mismatch still fails.
export const EXPECTED_CAPTCHA_ACTION = "contact";

/** reCAPTCHA v3 scores run 0.0 (bot) → 1.0 (human); Google's suggested cut-off. */
export const RECAPTCHA_MIN_SCORE = 0.5;

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
 * failure — unknown provider, missing secret or token, provider timeout/outage,
 * or a failed / mismatched verification (hostname must equal the expected one
 * whenever it is set; Turnstile must echo the expected action; a reCAPTCHA v3
 * response must carry the action and a passing score). Fails closed.
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

	if (!Object.hasOwn(CAPTCHA_VERIFY_URLS, provider) || !secret) {
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
		if (!data || typeof data !== "object") throw new Error("verify body is not an object");
	} catch {
		// Timeout or provider outage — fail closed.
		throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification unavailable" });
	}

	if (
		data.success !== true ||
		!responseMatches(provider as CaptchaProvider, data, expectedHostname)
	) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification failed" });
	}
}

function responseMatches(
	provider: CaptchaProvider,
	data: CaptchaVerifyResponse,
	expectedHostname: string | null | undefined,
): boolean {
	// A token solved on another site that shares the key must not pass.
	if (expectedHostname && data.hostname !== expectedHostname) return false;
	if (provider === "turnstile") return data.action === EXPECTED_CAPTCHA_ACTION;
	if (provider === "recaptcha" && typeof data.score === "number") {
		// v3: always scores; success alone is true even for an obvious bot.
		return data.action === EXPECTED_CAPTCHA_ACTION && data.score >= RECAPTCHA_MIN_SCORE;
	}
	return !data.action || data.action === EXPECTED_CAPTCHA_ACTION;
}
