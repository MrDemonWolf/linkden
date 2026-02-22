/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;

  // Auth: Cloudflare Access (recommended) — set CF_ACCESS_TEAM_DOMAIN to enable
  CF_ACCESS_TEAM_DOMAIN: string;

  // Auth: Clerk (optional backup) — set CLERK_SECRET_KEY to enable
  CLERK_SECRET_KEY: string;

  // CORS
  CORS_ORIGIN: string;

  // App URL for links, QR codes, etc.
  APP_URL: string;

  // Email via Resend
  RESEND_API_KEY: string;

  // Apple Wallet pass signing (optional)
  APPLE_PASS_SIGNER_CERT: string;
  APPLE_PASS_SIGNER_KEY: string;
  APPLE_PASS_TYPE_ID: string;
  APPLE_TEAM_ID: string;
}
