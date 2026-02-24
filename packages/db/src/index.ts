import { env } from "@linkden/env/server";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export const db = drizzle(env.DB, { schema });
