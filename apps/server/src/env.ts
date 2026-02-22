export interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
  CORS_ORIGIN: string;
  APP_URL: string;
  RESEND_API_KEY: string;
  APPLE_PASS_SIGNER_CERT: string;
  APPLE_PASS_SIGNER_KEY: string;
  APPLE_PASS_TYPE_ID: string;
  APPLE_TEAM_ID: string;
}
