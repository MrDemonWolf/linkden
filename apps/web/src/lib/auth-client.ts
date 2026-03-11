import { env } from "@linkden/env/web";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: [twoFactorClient(), magicLinkClient()],
});
