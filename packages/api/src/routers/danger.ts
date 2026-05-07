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
		await db.delete(block);
		await db.delete(pageView);
		await db.delete(linkClick);
		await db.delete(contactSubmission);
		return { ok: true };
	}),

	resetEverything: protectedProcedure.mutation(async () => {
		await db.delete(block);
		await db.delete(pageView);
		await db.delete(linkClick);
		await db.delete(contactSubmission);
		await db.delete(socialNetwork);
		await db.delete(siteSettings);
		await db.delete(session);
		await db.delete(account);
		await db.delete(verification);
		await db.delete(user);
		return { ok: true };
	}),
});
