import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeError, logError, redactLogPath } from "../lib/log";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("describeError", () => {
	it("drops bound params (visitor data) from DrizzleQueryError message and stack", () => {
		const err = new DrizzleQueryError(
			'insert into "contact_submission" ("name", "email") values (?, ?)',
			["Jane Doe", "jane@example.org"],
			new Error("D1_ERROR: database is overloaded"),
		);
		const fields = describeError(err);
		const json = JSON.stringify(fields);
		expect(json).not.toContain("Jane Doe");
		expect(json).not.toContain("jane@example.org");
		expect(fields.message).toBe(
			'Failed query: insert into "contact_submission" ("name", "email") values (?, ?)',
		);
		expect(fields.query).toContain("contact_submission");
		expect(fields.cause).toBe("D1_ERROR: database is overloaded");
	});

	it("keeps message and stack for ordinary errors", () => {
		const fields = describeError(new Error("boom"));
		expect(fields.message).toBe("boom");
		expect(String(fields.stack)).toContain("boom");
	});

	it("wraps non-Error throwables", () => {
		expect(describeError("plain").message).toBe("plain");
	});
});

describe("logError", () => {
	it("emits one JSON line with level and caller fields", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logError({ path: "/x", step: "y" }, new Error("bad"));
		const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
		expect(line).toMatchObject({ level: "error", path: "/x", step: "y", message: "bad" });
	});
});

describe("redactLogPath", () => {
	it("hides the password-reset token segment", () => {
		expect(redactLogPath("/api/auth/reset-password/abc123token")).toBe(
			"/api/auth/reset-password/[redacted]",
		);
	});

	it("leaves other paths untouched", () => {
		expect(redactLogPath("/api/auth/reset-password")).toBe("/api/auth/reset-password");
		expect(redactLogPath("/trpc/public.getPage")).toBe("/trpc/public.getPage");
	});
});
