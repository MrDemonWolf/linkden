import { createDb } from "@linkden/db";
import type { Env } from "./env";
import { verifyAuth } from "./middleware/auth";
import type { Context } from "./trpc";

export async function createContext(req: Request, env: Env): Promise<Context> {
  const db = createDb(env.DB);
  const userId = await verifyAuth(req, env);
  return { db, userId, env };
}
