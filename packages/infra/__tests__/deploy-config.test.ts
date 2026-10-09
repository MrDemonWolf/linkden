// @vitest-environment node
import { describe, expect, it } from "vitest";
// Env-free module: the runtime check the Worker applies to the same secret.
import * as runtimeAuth from "../../auth/src/auth-options";
import {
	BETTER_AUTH_DEFAULT_SECRET,
	deployEnvErrors,
	MIN_AUTH_SECRET_LENGTH,
	resolveResourceNames,
} from "../deploy-config.ts";

describe("resolveResourceNames", () => {
	it("pins unsuffixed names on prod", () => {
		expect(resolveResourceNames("prod", {})).toEqual({
			db: "linkden-db",
			images: "linkden-images",
			backups: "linkden-backups",
			ignoredOverrides: [],
		});
	});

	it("honours the pre-0.5.0 upgrade overrides on prod", () => {
		const names = resolveResourceNames("prod", {
			LINKDEN_DB_NAME: "linkden-database-runner",
			LINKDEN_IMAGES_BUCKET: "linkden-images-runner",
		});
		expect(names.db).toBe("linkden-database-runner");
		expect(names.images).toBe("linkden-images-runner");
		expect(names.backups).toBe("linkden-backups");
	});

	it("never lets a non-prod stage adopt the production resources", () => {
		// The upgrade docs put these in .env, which every later run loads.
		const names = resolveResourceNames("dev", {
			LINKDEN_DB_NAME: "linkden-database-runner",
			LINKDEN_IMAGES_BUCKET: "linkden-images-runner",
		});
		expect(names).toEqual({
			db: "linkden-db-dev",
			images: "linkden-images-dev",
			backups: "linkden-backups-dev",
			ignoredOverrides: ["LINKDEN_DB_NAME", "LINKDEN_IMAGES_BUCKET"],
		});
	});

	it("treats a blank override (unset GitHub variable) as unset", () => {
		expect(resolveResourceNames("prod", { LINKDEN_DB_NAME: "" }).db).toBe("linkden-db");
		expect(resolveResourceNames("dev", { LINKDEN_DB_NAME: " " }).ignoredOverrides).toEqual([]);
	});
});

describe("deployEnvErrors", () => {
	const valid = {
		BETTER_AUTH_SECRET: "x".repeat(44),
		BETTER_AUTH_URL: "https://linkden-api.example.workers.dev",
		CORS_ORIGIN: "https://linkden.example.workers.dev",
		NEXT_PUBLIC_SERVER_URL: "https://linkden-api.example.workers.dev",
		NEXT_PUBLIC_SITE_URL: "https://linkden.example.workers.dev",
	};

	it("accepts a complete workers.dev configuration", () => {
		expect(deployEnvErrors(valid)).toEqual([]);
	});

	it("names every unset or empty value (GitHub passes unset secrets as '')", () => {
		const errors = deployEnvErrors({ ...valid, BETTER_AUTH_SECRET: "", CORS_ORIGIN: undefined });
		expect(errors).toHaveLength(2);
		expect(errors[0]).toMatch(/^BETTER_AUTH_SECRET is not set/);
		expect(errors[1]).toMatch(/^CORS_ORIGIN is not set/);
	});

	it("rejects a short secret and Better Auth's public default", () => {
		expect(deployEnvErrors({ ...valid, BETTER_AUTH_SECRET: "short" })[0]).toMatch(
			/at least 32 characters/,
		);
		expect(
			deployEnvErrors({ ...valid, BETTER_AUTH_SECRET: BETTER_AUTH_DEFAULT_SECRET })[0],
		).toMatch(/public default secret/);
	});

	it("requires https URLs and a bare CORS origin", () => {
		const errors = deployEnvErrors({
			...valid,
			BETTER_AUTH_URL: "http://linkden-api.example.workers.dev",
			CORS_ORIGIN: "https://linkden.example.workers.dev/",
			NEXT_PUBLIC_SERVER_URL: "not a url",
		});
		expect(errors).toHaveLength(3);
		expect(errors.join("\n")).toMatch(/BETTER_AUTH_URL .* must be an https:\/\/ URL/);
		expect(errors.join("\n")).toMatch(/NEXT_PUBLIC_SERVER_URL .* is not a valid URL/);
		expect(errors.join("\n")).toMatch(/CORS_ORIGIN .* must be a bare origin/);
	});

	it("rejects values with surrounding whitespace", () => {
		expect(deployEnvErrors({ ...valid, BETTER_AUTH_URL: " https://a.example " })[0]).toMatch(
			/whitespace/,
		);
	});

	it("requires the same-origin URLs to match SITE_DOMAIN", () => {
		const site = "https://links.example.com";
		const sameOrigin = {
			...valid,
			SITE_DOMAIN: "links.example.com",
			BETTER_AUTH_URL: site,
			CORS_ORIGIN: site,
			NEXT_PUBLIC_SERVER_URL: site,
			NEXT_PUBLIC_SITE_URL: `${site}/`,
		};
		expect(deployEnvErrors(sameOrigin)).toEqual([]);
		const errors = deployEnvErrors({ ...sameOrigin, BETTER_AUTH_URL: valid.BETTER_AUTH_URL });
		expect(errors).toEqual([
			`BETTER_AUTH_URL (${valid.BETTER_AUTH_URL}) must be ${site} when SITE_DOMAIN is set.`,
		]);
	});
});

describe("parity with the runtime secret check (packages/auth)", () => {
	it("uses the same default secret and minimum length", () => {
		expect(BETTER_AUTH_DEFAULT_SECRET).toBe(runtimeAuth.BETTER_AUTH_DEFAULT_SECRET);
		expect(MIN_AUTH_SECRET_LENGTH).toBe(runtimeAuth.MIN_AUTH_SECRET_LENGTH);
	});
});

describe("local wrangler.jsonc matches the production runtime", () => {
	it("pins the same compatibility date as alchemy.run.ts", async () => {
		const { readFileSync } = await import("node:fs");
		const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
		const prod = /const COMPATIBILITY_DATE = "([^"]+)"/.exec(read("../alchemy.run.ts"))?.[1];
		const local = /"compatibility_date":\s*"([^"]+)"/.exec(
			read("../../../apps/server/wrangler.jsonc"),
		)?.[1];
		expect(prod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(local).toBe(prod);
	});
});
