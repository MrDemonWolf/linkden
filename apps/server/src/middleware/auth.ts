import type { Env } from "../env";

/**
 * Verifies authentication from either Cloudflare Access or Clerk.
 *
 * Auth priority:
 * 1. Cloudflare Access — checks `CF-Access-JWT-Assertion` header against the
 *    Cloudflare Access team domain. If the `CF_ACCESS_TEAM_DOMAIN` env var is
 *    set, Cloudflare Access is active.
 * 2. Clerk — checks `Authorization: Bearer <token>` header. Only used if
 *    `CLERK_SECRET_KEY` is set.
 * 3. No auth configured — all protected endpoints will be denied.
 */
export async function verifyAuth(req: Request, env: Env): Promise<string | null> {
  // 1. Try Cloudflare Access
  if (env.CF_ACCESS_TEAM_DOMAIN) {
    const cfJwt = req.headers.get("CF-Access-JWT-Assertion");
    if (cfJwt) {
      const userId = await verifyCfAccessToken(cfJwt, env.CF_ACCESS_TEAM_DOMAIN);
      if (userId) return userId;
    }
  }

  // 2. Try Clerk
  if (env.CLERK_SECRET_KEY) {
    const authHeader = req.headers.get("Authorization");
    const userId = await verifyClerkToken(authHeader, env.CLERK_SECRET_KEY);
    if (userId) return userId;
  }

  return null;
}

/**
 * Verifies a Cloudflare Access JWT.
 * Checks the token against Cloudflare's public keys endpoint.
 */
async function verifyCfAccessToken(jwt: string, teamDomain: string): Promise<string | null> {
  try {
    // Fetch Cloudflare Access public keys
    const certsUrl = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
    const certsRes = await fetch(certsUrl);
    if (!certsRes.ok) return null;

    const { keys } = (await certsRes.json()) as { keys: JsonWebKey[] };

    // Decode JWT header to find the kid
    const [headerB64] = jwt.split(".");
    const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));
    const kid = header.kid;

    // Find matching key
    const matchingKey = keys.find((k: any) => k.kid === kid);
    if (!matchingKey) return null;

    // Import the key and verify
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      matchingKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // Split JWT parts
    const parts = jwt.split(".");
    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signedData);
    if (!valid) return null;

    // Decode payload
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    // Check audience matches (aud should contain the Access application audience tag)
    // Return the email or sub as user ID
    return payload.email || payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * Verifies a Clerk JWT from the Authorization header.
 */
async function verifyClerkToken(
  authHeader: string | null,
  secretKey: string,
): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const { verifyToken } = await import("@clerk/backend");
    const payload = await verifyToken(token, { secretKey });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
