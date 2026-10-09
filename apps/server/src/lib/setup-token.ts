// ─── First-run setup token ──────────────────────────────────────────────────
// Signup is open only while no user exists. On a public deploy that window is a
// race: whoever reaches /api/auth/sign-up/email first becomes the sole admin
// (the DB trigger then locks the real owner out). When the operator binds a
// SETUP_TOKEN secret, the first signup must present it in `x-setup-token`.

export const SETUP_TOKEN_HEADER = "x-setup-token";

/** Constant-time string comparison via SHA-256 digests (lengths never leak). */
async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
	const enc = new TextEncoder();
	const [da, db] = await Promise.all([
		crypto.subtle.digest("SHA-256", enc.encode(a)),
		crypto.subtle.digest("SHA-256", enc.encode(b)),
	]);
	const x = new Uint8Array(da);
	const y = new Uint8Array(db);
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
	return diff === 0;
}

/**
 * Whether a first-run signup may proceed. With no SETUP_TOKEN configured the
 * open first-run flow is unchanged (existing deployments keep working);
 * otherwise the provided header must match it exactly.
 */
export async function setupTokenAccepted(
	expected: string | undefined,
	provided: string | undefined,
): Promise<boolean> {
	if (!expected) return true;
	if (!provided) return false;
	return timingSafeEqualString(expected, provided);
}
