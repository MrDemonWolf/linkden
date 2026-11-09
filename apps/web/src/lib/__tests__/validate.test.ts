import { describe, expect, it } from "vitest";
import { z } from "zod";
import { configErrors, schemaErrors } from "../validate";

describe("schemaErrors", () => {
	it("keeps the first issue for a nested field and preserves friendly messages", () => {
		const schema = z.object({
			urls: z.array(
				z.object({
					url: z
						.string()
						.min(5)
						.regex(/^https:/),
				}),
			),
			email: z.email(),
		});
		expect(schemaErrors(schema, { urls: [{ url: "x" }], email: "bad" })).toEqual({
			"urls.0.url": "At least 5 characters",
			email: "Enter a valid email address",
		});
	});

	it("returns no errors for valid data and names a root issue", () => {
		expect(schemaErrors(z.object({ name: z.string() }), { name: "Wolf", extra: true })).toEqual({});
		expect(schemaErrors(z.string().min(1), "")).toEqual({ "(root)": "Required" });
	});

	it("validates block configs with their existing schema", () => {
		expect(configErrors("link", { variant: "classic" })).toEqual({});
		expect(configErrors("link", { variant: "not-a-variant" })).toHaveProperty("variant");
	});
});
