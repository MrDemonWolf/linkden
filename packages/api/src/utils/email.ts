// The transport rule lives in @linkden/email so the auth emails (packages/auth)
// apply exactly the same one.
export {
	EMAIL_TRANSPORT_SETTING_KEYS,
	type EmailTransport,
	resolveEmailTransport,
} from "@linkden/email/transport";
