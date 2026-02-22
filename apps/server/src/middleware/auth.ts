import { verifyToken } from "@clerk/backend";

/**
 * Extracts and verifies a Clerk JWT from the Authorization header.
 * Returns the user ID if valid, or null if missing/invalid.
 */
export async function verifyClerkToken(
  authHeader: string | null | undefined,
  secretKey: string
): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
