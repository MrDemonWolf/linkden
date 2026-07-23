import { describe, expect, it } from "vitest";
import { resolveDeliveryMode } from "../utils/contact-delivery";

describe("resolveDeliveryMode", () => {
	it("database (explicit) → db only", () => {
		expect(resolveDeliveryMode("database")).toEqual({ wantDb: true, wantEmail: false });
	});

	it("email → email only", () => {
		expect(resolveDeliveryMode("email")).toEqual({ wantDb: false, wantEmail: true });
	});

	it("both → db and email", () => {
		expect(resolveDeliveryMode("both")).toEqual({ wantDb: true, wantEmail: true });
	});

	it("unset / unknown → database only (safe default, never drops a submission)", () => {
		expect(resolveDeliveryMode(undefined)).toEqual({ wantDb: true, wantEmail: false });
		expect(resolveDeliveryMode("")).toEqual({ wantDb: true, wantEmail: false });
		expect(resolveDeliveryMode("garbage")).toEqual({ wantDb: true, wantEmail: false });
	});
});
