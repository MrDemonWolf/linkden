import type { SettingKey } from "@linkden/validators/settings";
import { CONTACT_DELIVERY_MODES } from "@linkden/validators/settings-registry";
import { emailErrors } from "@/components/admin/settings/email-section";

export type DeliveryMode = (typeof CONTACT_DELIVERY_MODES)[number];

const DELIVERY_LABELS: Record<DeliveryMode, string> = {
	database: "Inbox only",
	email: "Email only",
	both: "Inbox and email",
};

// Safe default first; the Record keeps every registry mode ranked and labelled.
const DELIVERY_RANK: Record<DeliveryMode, number> = { database: 0, both: 1, email: 2 };

export const DELIVERY_ITEMS = [...CONTACT_DELIVERY_MODES]
	.sort((a, b) => DELIVERY_RANK[a] - DELIVERY_RANK[b])
	.map((value) => ({ value, label: DELIVERY_LABELS[value] }));

export function isDeliveryMode(v: string | undefined): v is DeliveryMode {
	return (CONTACT_DELIVERY_MODES as readonly string[]).includes(v ?? "");
}

export interface EmailState {
	emailProvider: string;
	emailApiKey: string;
	emailFrom: string;
	contactDelivery: DeliveryMode;
}

export const parse = (s: Record<string, string>): EmailState => ({
	emailProvider: s.email_provider ?? "resend",
	emailApiKey: s.email_api_key ?? "",
	emailFrom: s.email_from ?? "",
	// Unset/unknown resolves to database-only on the server (resolveDeliveryMode).
	contactDelivery: isDeliveryMode(s.contact_delivery) ? s.contact_delivery : "database",
});

export const serialize = (s: EmailState): Array<{ key: SettingKey; value: string }> => [
	{ key: "email_provider", value: s.emailProvider },
	{ key: "email_api_key", value: s.emailApiKey },
	{ key: "email_from", value: s.emailFrom },
	{ key: "contact_delivery", value: s.contactDelivery },
];

export const validate = (s: EmailState): Record<string, string> => {
	const errors = emailErrors(s);
	// Without a key + sender no email can go out (submitContact then keeps the
	// message in the Inbox), so an email mode would save and silently do nothing.
	if (s.contactDelivery !== "database" && (!s.emailApiKey || !s.emailFrom.trim())) {
		errors.contactDelivery =
			"Email delivery needs an API key and a sender address — or keep messages in the Inbox";
	}
	return errors;
};
