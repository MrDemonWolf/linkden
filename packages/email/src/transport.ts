export type EmailTransport = { provider: "resend"; apiKey: string; from: string };

/**
 * Resolve the stored email settings into a usable transport, or null when email
 * cannot be sent. Resend is the only implemented transport and an unset
 * provider means Resend (the admin UI's default); any other provider is
 * unsupported, so its key is never sent to Resend's API. Shared by the contact
 * notification (packages/api) and every auth email (packages/auth).
 */
export function resolveEmailTransport(
	settings: Partial<Record<string, string>>,
): EmailTransport | null {
	const provider = settings.email_provider || "resend";
	const apiKey = settings.email_api_key;
	const from = settings.email_from;
	if (provider !== "resend" || !apiKey || !from) return null;
	return { provider, apiKey, from };
}

/** The setting keys resolveEmailTransport reads. */
export const EMAIL_TRANSPORT_SETTING_KEYS = [
	"email_provider",
	"email_api_key",
	"email_from",
] as const;
