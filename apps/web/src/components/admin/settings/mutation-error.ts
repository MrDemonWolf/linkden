/**
 * Toast text for a failed admin mutation: the router's own message when it
 * rejected the request on purpose (a 4xx TRPCError such as "Signer key must be
 * a PEM … key"), else `fallback`. A 5xx can carry internals and a zod input
 * error arrives as a raw JSON issue list, so neither is shown verbatim.
 */
export function mutationErrorMessage(error: unknown, fallback: string): string {
	const e = error as { message?: unknown; data?: { httpStatus?: unknown } | null } | null;
	const status = e?.data?.httpStatus;
	const message = typeof e?.message === "string" ? e.message.trim() : "";
	if (typeof status !== "number" || status < 400 || status >= 500) return fallback;
	if (!message || /^[[{]/.test(message)) return fallback;
	return message;
}
