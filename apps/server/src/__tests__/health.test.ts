import { APP_VERSION } from "@linkden/api/utils/version";
import { siteSettings } from "@linkden/db/schema/index";
import { createTestDb } from "@linkden/db/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildHealth } from "../lib/health";

// The real GET /api/health route (status code mapping) is exercised through
// the Worker entry in routes.test.ts; these pin the report itself.

afterEach(() => {
	vi.restoreAllMocks();
});

describe("buildHealth", () => {
	it("reports ok, database ok, version, and email presence", async () => {
		const { db } = await createTestDb();
		const report = await buildHealth(db);
		expect(report).toEqual({
			status: "ok",
			database: "ok",
			auth: "ok",
			email: "missing",
			version: APP_VERSION,
		});
	});

	it("reports degraded with auth misconfigured (the deploy smoke test checks status)", async () => {
		const { db } = await createTestDb();
		const report = await buildHealth(db, { authConfigured: false });
		expect(report).toMatchObject({ status: "degraded", database: "ok", auth: "misconfigured" });
	});

	it("flips email to configured once an API key is stored", async () => {
		const { db } = await createTestDb();
		await db.insert(siteSettings).values({ key: "email_api_key", value: "re_test_key" });
		const report = await buildHealth(db);
		expect(report.email).toBe("configured");
		expect(report.status).toBe("ok");
	});

	it("reports degraded when the database is unreachable, and logs why", async () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		// A stub whose SELECT 1 throws is the cheapest "D1 down" stand-in.
		const broken = {
			run: async () => {
				throw new Error("D1 offline");
			},
		} as unknown as Parameters<typeof buildHealth>[0];
		const down = await buildHealth(broken);
		expect(down).toMatchObject({ status: "degraded", database: "error", email: "missing" });
		const line = JSON.parse(String(errors.mock.calls[0]?.[0]));
		expect(line).toMatchObject({ level: "error", path: "/api/health", message: "D1 offline" });
	});
});
