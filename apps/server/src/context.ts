import { createDb } from "@linkden/db";
import { verifyClerkToken } from "./middleware/auth";
import type { Env } from "./env";
import type { Context } from "./trpc";

export async function createContext(
  req: Request,
  env: Env
): Promise<Context> {
  const db = createDb(env.DB);

  const authHeader = req.headers.get("Authorization");
  const userId = await verifyClerkToken(authHeader, env.CLERK_SECRET_KEY);

  return { db, userId, env };
}
