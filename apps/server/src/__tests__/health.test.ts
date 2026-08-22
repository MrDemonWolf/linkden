import { APP_VERSION } from "@linkden/api/utils/version";
import { siteSettings } from "@linkden/db/schema/index";
import { createTestDb } from "@linkden/db/testing";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { buildHealth, type HealthReport } from "../lib/health";

// ponytail: the full server entry binds Cloudflare env at import time, so the
// route is exercised through a minimal Hono app wired to the same helper.
async function healthApp() {
	const { db } = await createTestDb();
	const app = new Hono().get("/api/health", async (c) => {
		const report = await buildHealth(db);
		return c.json(report, report.status === "ok" ? 200 : 503);
	});
	const get = async () => {
		const res = await app.request("/api/health");
		return { status: res.status, body: (await res.json()) as HealthReport };
	};
	return { get, db };
}

describe("GET /api/health", () => {
	it("reports ok, database ok, version, and email presence", async () => {
		const { get } = await healthApp();
		const { status, body } = await get();
		expect(status).toBe(200);
		expect(body.status).toBe("ok");
		expect(body.database).toBe("ok");
		expect(body.version).toBe(APP_VERSION);
		expect(["configured", "missing"]).toContain(body.email);
	});

	it("flips email to configured once an API key is stored", async () => {
		const { get, db } = await healthApp();
		expect((await get()).body.email).toBe("missing");
		await db.insert(siteSettings).values({ key: "email_api_key", value: "re_test_key" });
		const { body } = await get();
		expect(body.email).toBe("configured");
		expect(body.status).toBe("ok");
	});

	it("reports degraded when the database is unreachable", async () => {
		// ponytail: a stub whose SELECT 1 throws is the cheapest "D1 down" stand-in.
		const broken = {
			run: async () => {
				throw new Error("D1 offline");
			},
		} as unknown as Parameters<typeof buildHealth>[0];
		const down = await buildHealth(broken);
		expect(down).toMatchObject({ status: "degraded", database: "error", email: "missing" });
	});
});
