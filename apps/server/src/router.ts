import { router } from "./trpc";
import { linksRouter } from "./routers/links";
import { settingsRouter } from "./routers/settings";
import { analyticsRouter } from "./routers/analytics";
import { vcardRouter } from "./routers/vcard";
import { walletRouter } from "./routers/wallet";
import { contactRouter } from "./routers/contact";
import { pagesRouter } from "./routers/pages";
import { exportRouter } from "./routers/export";
import { systemRouter } from "./routers/system";

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
