// Pure SQL builders for `bun reset:password` and `bun reset:factory`. No I/O
// here, so scripts/__tests__ can run the exact statements against the real
// schema (createTestDb) and check them with Better Auth's own verifier.

/** Better Auth's defaults (emailAndPassword.minPasswordLength / maxPasswordLength). */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A single-quoted SQL string literal. */
export function sqlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

/** A double-quoted SQL identifier. */
export function sqlIdent(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

/** Normalised email (Better Auth stores emails lower-cased), or null if invalid. */
export function normalizeEmail(raw: string): string | null {
	const email = raw.trim().toLowerCase();
	return EMAIL_RE.test(email) ? email : null;
}

/** Why a new admin password is unacceptable, or null when it is fine. */
export function passwordProblem(password: string): string | null {
	if (password.length < MIN_PASSWORD_LENGTH) {
		return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
	}
	if (password.length > MAX_PASSWORD_LENGTH) {
		return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
	}
	return null;
}

export interface PasswordResetSql {
	/** Run together: set the credential hash, revoke every session (and maybe turn 2FA off). */
	mutations: string[];
	/** Returns one row `{ updated }` — how many credential accounts now carry the new hash. */
	verify: string;
}

export interface PasswordResetOptions {
	/**
	 * Also turn two-factor off: deletes the TOTP secret and backup codes and
	 * clears the user's flag. The recovery path when both the authenticator and
	 * the backup codes are lost. The admin can enable 2FA again afterwards.
	 */
	disableTwoFactor?: boolean;
}

/**
 * Statements that set a new password for the admin with `email`.
 *
 * `hash` must come from Better Auth's own `hashPassword` (scrypt `salt:key`) —
 * the server verifies with that format, so any other hash (e.g. bcrypt) locks
 * the admin out. Existing sessions are deleted so a stolen session cookie does
 * not survive the reset. `verify` lets the caller fail loudly when no
 * credential account matched (wrong email) instead of reporting success.
 */
export function passwordResetSql(
	email: string,
	hash: string,
	nowMs: number,
	{ disableTwoFactor = false }: PasswordResetOptions = {},
): PasswordResetSql {
	const byEmail = `lower(email) = ${sqlString(email)}`;
	const userId = `(SELECT id FROM "user" WHERE ${byEmail})`;
	return {
		mutations: [
			`UPDATE account SET password = ${sqlString(hash)}, updated_at = ${Math.trunc(nowMs)} WHERE provider_id = 'credential' AND user_id = ${userId}`,
			`DELETE FROM session WHERE user_id = ${userId}`,
			...(disableTwoFactor
				? [
						`DELETE FROM two_factor WHERE user_id = ${userId}`,
						`UPDATE "user" SET two_factor_enabled = 0 WHERE ${byEmail}`,
					]
				: []),
		],
		verify: `SELECT count(*) AS updated FROM account WHERE provider_id = 'credential' AND password = ${sqlString(hash)} AND user_id = ${userId}`,
	};
}

/** Lists the tables a factory reset should consider (filter with isResettableTable). */
export const LIST_TABLES_SQL = "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name";

/**
 * Data tables only: never SQLite/D1/Cloudflare internals, and never the
 * migrations ledger — wiping that would make the next deploy re-run every
 * migration against existing tables.
 */
export function isResettableTable(name: string): boolean {
	if (name.startsWith("sqlite_") || name.startsWith("_cf_")) return false;
	return name !== "d1_migrations" && name !== "__drizzle_migrations";
}

// Referenced by other tables' foreign keys; emptied last as a belt-and-braces
// ordering on top of the deferred FK check.
const PARENT_TABLES = ["block", "user"];

/**
 * One atomic batch that empties every data table. The table list is read from
 * the database itself rather than hardcoded, so a table added by a later
 * migration (e.g. Better Auth plugin tables) is never silently left behind.
 * `defer_foreign_keys` postpones FK checks to the end of the batch, when every
 * table is empty.
 */
export function factoryResetStatements(tables: string[]): string[] {
	const data = [...new Set(tables.filter(isResettableTable))];
	const children = data.filter((t) => !PARENT_TABLES.includes(t)).sort();
	const parents = PARENT_TABLES.filter((t) => data.includes(t));
	return [
		"PRAGMA defer_foreign_keys = ON",
		...[...children, ...parents].map((t) => `DELETE FROM ${sqlIdent(t)}`),
	];
}
