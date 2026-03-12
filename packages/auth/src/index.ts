import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import * as schema from "@linkden/db/schema/auth";
import { env } from "@linkden/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor, magicLink } from "better-auth/plugins";

async function getEmailSettings() {
  const allRows = await db.select().from(siteSettings);
  const s: Record<string, string> = {};
  for (const row of allRows) {
    s[row.key] = row.value;
  }
  return {
    apiKey: s.email_api_key ?? "",
    from: s.email_from ?? "noreply@example.com",
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const { apiKey, from } = await getEmailSettings();
      if (!apiKey) {
        console.warn("No email API key configured; skipping password reset email");
        return;
      }
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: user.email,
          subject: "Reset your LinkDen password",
          html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
        }),
      });
    },
  },
  // uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
  // session: {
  //   cookieCache: {
  //     enabled: true,
  //     maxAge: 60,
  //   },
  // },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
    // uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
    // https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
    // crossSubDomainCookies: {
    //   enabled: true,
    //   domain: "<your-workers-subdomain>",
    // },
  },
  plugins: [
    twoFactor(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { apiKey, from } = await getEmailSettings();
        if (!apiKey) {
          console.warn("No email API key configured; skipping magic link email");
          return;
        }
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from,
            to: email,
            subject: "Sign in to LinkDen",
            html: `<p>Click the link below to sign in to your LinkDen admin panel:</p><p><a href="${url}">${url}</a></p><p>This link expires in 10 minutes.</p>`,
          }),
        });
      },
    }),
  ],
});
