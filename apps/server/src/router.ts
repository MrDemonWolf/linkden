import { analyticsRouter } from "./routers/analytics";
import { contactRouter } from "./routers/contact";
import { exportRouter } from "./routers/export";
import { linksRouter } from "./routers/links";
import { pagesRouter } from "./routers/pages";
import { settingsRouter } from "./routers/settings";
import { systemRouter } from "./routers/system";
import { vcardRouter } from "./routers/vcard";
import { walletRouter } from "./routers/wallet";
import { router } from "./trpc";

export const appRouter = router({
  links: linksRouter,
  settings: settingsRouter,
  analytics: analyticsRouter,
  vcard: vcardRouter,
  wallet: walletRouter,
  contact: contactRouter,
  pages: pagesRouter,
  export: exportRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
