"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { setAuthTokenGetter } from "./trpc-provider";

/**
 * Bridges Clerk auth into the tRPC provider.
 * Only rendered when Clerk is configured.
 */
export function ClerkAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}
