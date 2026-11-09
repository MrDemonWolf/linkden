import { env } from "@linkden/env/server";
import { router } from "../index";
import { dispatchPublication, publicationConfiguration } from "../utils/publication-dispatch";
import { analyticsRouter } from "./analytics";
import { backupRouter } from "./backup";
import { blocksRouter } from "./blocks";
import { formsRouter } from "./contacts";
import { dangerRouter } from "./danger";
import { publicRouter } from "./public";
import { createPublicationRouter } from "./publication";
import { settingsRouter } from "./settings";
import { socialRouter } from "./social";
import { vcardRouter } from "./vcard";
import { versionRouter } from "./version";
import { walletRouter } from "./wallet";

// Health lives at GET /api/health (checks D1, reports the version), not here.
export const appRouter = router({
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
	publication: createPublicationRouter({
		configuration: () => publicationConfiguration(env),
		dispatch: (job) => dispatchPublication(env, job),
	}),
	danger: dangerRouter,
});

export type AppRouter = typeof appRouter;
