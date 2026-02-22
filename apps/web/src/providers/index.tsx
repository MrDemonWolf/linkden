"use client";

import { TrpcProvider } from "./trpc-provider";

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: { children: React.ReactNode }) {
  // If Clerk is not configured, just use TrpcProvider directly.
  // Auth for /admin is handled by Cloudflare Access (or similar) at the infrastructure level.
  if (!clerkPubKey) {
    return <TrpcProvider>{children}</TrpcProvider>;
  }

  // When Clerk keys are set, wrap with ClerkProvider + auth bridge for tRPC token injection
  return <ClerkWrappedProviders>{children}</ClerkWrappedProviders>;
}

function ClerkWrappedProviders({ children }: { children: React.ReactNode }) {
  // Dynamic require to avoid build errors when @clerk/nextjs is not installed
  const { ClerkProvider } = require("@clerk/nextjs");
  const { ClerkAuthBridge } = require("./clerk-auth-bridge");

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ClerkAuthBridge />
      <TrpcProvider>{children}</TrpcProvider>
    </ClerkProvider>
  );
}
