import { router, publicProcedure } from "../index";
import { blocksRouter } from "./blocks";
import { settingsRouter } from "./settings";
import { formsRouter } from "./contacts";
import { analyticsRouter } from "./analytics";
import { socialRouter } from "./social";
import { walletRouter } from "./wallet";
import { vcardRouter } from "./vcard";
import { backupRouter } from "./backup";
import { versionRouter } from "./version";
import { publicRouter } from "./public";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	blocks: blocksRouter,
	settings: settingsRouter,
	forms: formsRouter,
	analytics: analyticsRouter,
	social: socialRouter,
	wallet: walletRouter,
	vcard: vcardRouter,
	backup: backupRouter,
	version: versionRouter,
	public: publicRouter,
});

export type AppRouter = typeof appRouter;
