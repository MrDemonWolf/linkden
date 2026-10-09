import { db } from "@linkden/db";
import * as schema from "@linkden/db/schema/index";
import { block, contactSubmission, linkClick, pageView, user } from "@linkden/db/schema/index";
import { is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { runBatch } from "../utils/settings";

// ─── Danger Zone Router ────────────────────────────────────────────────────
// Destructive operations triggered from Settings → Data. Both procedures are
// protected — only the signed-in admin can invoke them.
//
// deleteAllContent: removes all blocks + analytics + form submissions. Keeps
//   the user account, settings, and social networks intact.
// resetEverything: full wipe of EVERY table in the schema (content, settings,
//   social, audit_log, then auth). Client must signOut() and redirect to
//   /admin/setup; the wizard re-renders when no users exist.

/**
 * Every table the schema declares, derived rather than hand-listed so a table
 * added later (e.g. Better Auth's twoFactor) can't silently survive a factory
 * reset and leak into the next admin's install. `user` goes last: the other
 * auth tables reference it.
 */
function allTables(): SQLiteTable[] {
	const tables = (Object.values(schema) as unknown[]).filter((t): t is SQLiteTable =>
		is(t, SQLiteTable),
	);
	const userTable: SQLiteTable = user;
	return [...tables.filter((t) => t !== userTable), userTable];
}

export const dangerRouter = router({
	deleteAllContent: protectedProcedure.mutation(async () => {
		// Audit the destructive action BEFORE wiping (the log survives this op).
		await logAudit("danger.deleteAllContent");
		await runBatch([
			db.delete(block),
			db.delete(pageView),
			db.delete(linkClick),
			db.delete(contactSubmission),
		]);
		return { ok: true };
	}),

	resetEverything: protectedProcedure.mutation(async () => {
		// Audit first — resetEverything clears audit_log too, so this entry is
		// only meaningful if written before the wipe (it will be removed by the
		// batch, which is fine: the action still fires an audit event).
		await logAudit("danger.resetEverything");
		// One atomic batch: a partial wipe would leave a half-reset install.
		await runBatch(allTables().map((t) => db.delete(t)));
		return { ok: true };
	}),
});
