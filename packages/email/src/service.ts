export interface EmailService {
	send(options: { to: string; subject: string; html: string }): Promise<void>;
}

/** A stalled Resend call must not hold a visitor's request (or an auth email) open. */
export const RESEND_TIMEOUT_MS = 10_000;
/** Cap on how much of an error body is read into the thrown message. */
const ERROR_BODY_LIMIT = 500;

/**
 * The actionable reason from a failed Resend response — its JSON `message`
 * (e.g. "The example.com domain is not verified"), else the status text. The
 * body is bounded and never echoed raw: a non-JSON body (a proxy's HTML error
 * page) is not a reason worth logging.
 */
async function resendErrorReason(response: Response): Promise<string> {
	let body = "";
	try {
		body = (await response.text()).slice(0, ERROR_BODY_LIMIT);
	} catch {
		// Body unreadable — fall back to the status text.
	}
	try {
		const parsed: unknown = JSON.parse(body);
		if (parsed && typeof parsed === "object" && "message" in parsed) {
			const { message } = parsed as { message: unknown };
			if (typeof message === "string" && message.trim()) return message.trim();
		}
	} catch {
		// Not JSON.
	}
	return response.statusText || "no reason given";
}

export function createResendEmailService(apiKey: string, from: string): EmailService {
	return {
		async send({ to, subject, html }) {
			let response: Response;
			try {
				response = await fetch("https://api.resend.com/emails", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({ from, to, subject, html }),
					signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
				});
			} catch (err) {
				// AbortSignal.timeout rejects with a DOMException named "TimeoutError".
				const reason =
					(err as { name?: unknown } | null)?.name === "TimeoutError"
						? `no response within ${RESEND_TIMEOUT_MS / 1000}s`
						: err instanceof Error
							? err.message
							: "network error";
				throw new Error(`Failed to send email: ${reason}`);
			}
			if (!response.ok) {
				// The status and Resend's own reason, never the API key.
				const reason = await resendErrorReason(response);
				throw new Error(`Failed to send email (${response.status}): ${reason}`);
			}
		},
	};
}
