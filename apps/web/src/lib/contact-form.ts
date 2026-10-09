import { getContrastRatio } from "@linkden/ui/color-contrast";

// Client-side rules for the public Connect form. Deliberately zod-free so the
// public page bundle stays light; the limits mirror `public.submitContact`'s
// input schema (packages/api/src/routers/public.ts) and the where-met options
// mirror `whereMetOptions` in @linkden/validators/blocks — a parity test pins
// both (`__tests__/contact-form.test.ts`).

export const WHERE_MET_OPTIONS = [
	"Conference",
	"Online",
	"Work",
	"Mutual Friend",
	"Social Media",
	"Other",
] as const;

/** Max lengths enforced by `public.submitContact`. */
export const CONTACT_LIMITS = {
	firstName: 50,
	lastName: 50,
	email: 254,
	whereMet: 200,
	message: 5000,
} as const;

// Same pattern zod 4's `z.email()` uses server-side, so an address the form
// accepts is never rejected by the API (e.g. `me@site.c` fails both).
const EMAIL_PATTERN =
	/^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export function isValidEmail(value: string): boolean {
	return EMAIL_PATTERN.test(value.trim());
}

/**
 * Whether the form asks "Where did we meet?". Off unless the block opts in —
 * `showWhereMet: true`, or the "connect" preset (whose default turns it on)
 * with no explicit toggle. Data minimisation: an unused field is not collected.
 */
export function shouldAskWhereMet(config: Record<string, unknown>): boolean {
	if (typeof config.showWhereMet === "boolean") return config.showWhereMet;
	return config.preset === "connect";
}

export interface ContactFormValues {
	firstName: string;
	lastName: string;
	email: string;
	whereMet: string;
	message: string;
	consent: boolean;
}

export type ContactFormField = keyof ContactFormValues | "captcha";

/** Field → message for every invalid field (empty object when valid). */
export function validateContactForm(
	values: ContactFormValues,
	opts: { askWhereMet: boolean; captchaRequired: boolean; captchaToken: string | null },
): Partial<Record<ContactFormField, string>> {
	const errs: Partial<Record<ContactFormField, string>> = {};
	const tooLong = (max: number) => `Too long (max ${max} characters)`;

	const firstName = values.firstName.trim();
	if (!firstName) errs.firstName = "First name is required";
	else if (firstName.length > CONTACT_LIMITS.firstName)
		errs.firstName = tooLong(CONTACT_LIMITS.firstName);

	const lastName = values.lastName.trim();
	if (!lastName) errs.lastName = "Last name is required";
	else if (lastName.length > CONTACT_LIMITS.lastName)
		errs.lastName = tooLong(CONTACT_LIMITS.lastName);

	const email = values.email.trim();
	if (!email) errs.email = "Email is required";
	else if (email.length > CONTACT_LIMITS.email || !isValidEmail(email))
		errs.email = "Enter a valid email address";

	if (opts.askWhereMet) {
		const whereMet = values.whereMet.trim();
		if (!whereMet) errs.whereMet = "Please select where we met";
		else if (whereMet.length > CONTACT_LIMITS.whereMet)
			errs.whereMet = tooLong(CONTACT_LIMITS.whereMet);
	}

	if (values.message.length > CONTACT_LIMITS.message)
		errs.message = tooLong(CONTACT_LIMITS.message);
	if (!values.consent) errs.consent = "You must agree to continue";
	if (opts.captchaRequired && !opts.captchaToken) errs.captcha = "Please complete the spam check";
	return errs;
}

/** Visitor-facing text for a failed `submitContact` (never the raw server message). */
export function contactSubmitErrorMessage(error: unknown): string {
	const e = error as {
		message?: string;
		data?: { code?: string; httpStatus?: number } | null;
		meta?: { response?: { status?: number } };
	} | null;
	const code = e?.data?.code;
	const status = e?.data?.httpStatus ?? e?.meta?.response?.status;
	if (code === "TOO_MANY_REQUESTS" || status === 429)
		return "Too many attempts. Please wait a minute and try again.";
	if (code === "BAD_REQUEST" && /captcha/i.test(e?.message ?? ""))
		return "The spam check didn't go through. Please complete it again and resend.";
	if (code === "BAD_REQUEST")
		return "Some details weren't accepted. Check the fields and try again.";
	if (code === "FORBIDDEN") return "This form isn't accepting messages right now.";
	return "Failed to send. Please try again.";
}

/** First candidate with at least `min`:1 contrast on `surface`, else the last one. */
export function pickContrasting(surface: string, candidates: string[], min: number): string {
	for (const c of candidates) if (getContrastRatio(c, surface) >= min) return c;
	return candidates[candidates.length - 1] ?? "currentColor";
}
