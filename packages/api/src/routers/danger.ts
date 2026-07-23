import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import {
	block,
	pageView,
	linkClick,
	contactSubmission,
	socialNetwork,
	siteSettings,
	user,
	session,
	account,
	verification,
} from "@linkden/db/schema/index";
import { runBatch } from "../utils/settings";

// ─── Danger Zone Router ────────────────────────────────────────────────────
// Destructive operations triggered from /admin/account. Both procedures are
// protected — only the signed-in admin can invoke them.
//
// deleteAllContent: removes all blocks + analytics + form submissions. Keeps
//   the user account, settings, and social networks intact.
// resetEverything: full wipe — content, settings, social, then auth tables.
//   Client must signOut() and redirect to /admin/setup; the wizard re-renders
//   when no users exist.

export const dangerRouter = router({
	deleteAllContent: protectedProcedure.mutation(async () => {
		await runBatch([
			db.delete(block),
			db.delete(pageView),
			db.delete(linkClick),
			db.delete(contactSubmission),
		]);
		return { ok: true };
	}),

	resetEverything: protectedProcedure.mutation(async () => {
		await runBatch([
			db.delete(block),
			db.delete(pageView),
			db.delete(linkClick),
			db.delete(contactSubmission),
			db.delete(socialNetwork),
			db.delete(siteSettings),
			db.delete(session),
			db.delete(account),
			db.delete(verification),
			db.delete(user),
		]);
		return { ok: true };
	}),
});
