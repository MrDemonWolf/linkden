import { APP_VERSION } from "@linkden/api/utils/version";
import { siteSettings } from "@linkden/db/schema/index";
import { eq, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { logError } from "./log";

// Structural type covering both the D1 (production) and libsql (test) drivers.
// biome-ignore lint/suspicious/noExplicitAny: driver-agnostic db handle
type AnySqliteDb = BaseSQLiteDatabase<"async", any, any>;

export interface HealthReport {
	status: "ok" | "degraded";
	database: "ok" | "error";
	/** "misconfigured" while BETTER_AUTH_SECRET is unusable (auth routes then 503). */
	auth: "ok" | "misconfigured";
	/** Whether an email API key is stored — informational only, never degrades status. */
	email: "configured" | "missing";
	version: string;
}

/**
 * Real readiness: confirm the database is reachable and report the deployed
 * version, so a green health check actually means the app can serve requests.
 * Extracted from the route so it can be tested against an in-memory DB.
 */
export async function buildHealth(
	db: AnySqliteDb,
	{ authConfigured = true }: { authConfigured?: boolean } = {},
): Promise<HealthReport> {
	let database: HealthReport["database"] = "ok";
	let email: HealthReport["email"] = "missing";
	try {
		await db.run(sql`SELECT 1`);
		const [row] = await db
			.select({ value: siteSettings.value })
			.from(siteSettings)
			.where(eq(siteSettings.key, "email_api_key"));
		if (row?.value) email = "configured";
	} catch (e) {
		// Keep the cause: a 503 health check must leave something to diagnose.
		logError({ path: "/api/health", check: "database" }, e);
		database = "error";
	}
	return {
		status: database === "ok" && authConfigured ? "ok" : "degraded",
		database,
		auth: authConfigured ? "ok" : "misconfigured",
		email,
		version: APP_VERSION,
	};
}
