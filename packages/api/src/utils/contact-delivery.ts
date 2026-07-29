/**
 * Resolve the `contact_delivery` setting into concrete behavior. Unknown /
 * unset values default to database-only (the safe default that never drops a
 * submission).
 */
export function resolveDeliveryMode(value: string | undefined): {
	wantDb: boolean;
	wantEmail: boolean;
} {
	const mode = value === "email" || value === "both" ? value : "database";
	return {
		wantDb: mode === "database" || mode === "both",
		wantEmail: mode === "email" || mode === "both",
	};
}
