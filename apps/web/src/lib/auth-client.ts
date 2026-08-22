import { env } from "@linkden/env/web";
import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: env.NEXT_PUBLIC_SERVER_URL,
	plugins: [twoFactorClient(), magicLinkClient()],
});
