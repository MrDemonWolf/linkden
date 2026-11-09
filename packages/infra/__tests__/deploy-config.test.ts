// @vitest-environment node
import { describe, expect, it } from "vitest";
// Env-free module: the runtime check the Worker applies to the same secret.
import * as runtimeAuth from "../../auth/src/auth-options";
import {
	BETTER_AUTH_DEFAULT_SECRET,
	deployEnvErrors,
	MIN_AUTH_SECRET_LENGTH,
	resolveResourceNames,
	resolveServingConfiguration,
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

describe("serving configuration", () => {
	const split = {
		LINKDEN_SERVING_MODE: "split",
		ADMIN_SITE_URL: "https://admin.example.com",
		PUBLIC_SITE_URL: "https://links.example.com",
		BETTER_AUTH_URL: "https://admin.example.com",
		CORS_ORIGIN: "https://admin.example.com",
		NEXT_PUBLIC_SERVER_URL: "https://admin.example.com",
		NEXT_PUBLIC_SITE_URL: "https://links.example.com",
		BETTER_AUTH_SECRET: "x".repeat(44),
	};

	it("keeps existing legacy origins and custom domain ownership by default", () => {
		expect(resolveServingConfiguration({})).toEqual({
			mode: "legacy",
			webDomain: undefined,
			publicOrigin: undefined,
			publicContactUrl: null,
		});
		expect(
			resolveServingConfiguration({
				SITE_DOMAIN: "links.example.com",
				NEXT_PUBLIC_SITE_URL: "https://links.example.com",
			}),
		).toEqual({
			mode: "legacy",
			webDomain: "links.example.com",
			publicOrigin: "https://links.example.com",
			publicContactUrl: null,
		});
	});

	it("selects only the admin custom domain while keeping the public origin separate", () => {
		expect(deployEnvErrors(split)).toEqual([]);
		expect(resolveServingConfiguration(split)).toEqual({
			mode: "split",
			webDomain: "admin.example.com",
			publicOrigin: "https://links.example.com",
			publicContactUrl: null,
		});
		expect(resolveResourceNames("prod", split).db).toBe("linkden-db");
	});

	it("enables only the exact optional public contact endpoint in split mode", () => {
		const PUBLIC_CONTACT_URL = "https://api.example.com/api/contact";
		expect(deployEnvErrors({ ...split, PUBLIC_CONTACT_URL })).toEqual([]);
		expect(resolveServingConfiguration({ ...split, PUBLIC_CONTACT_URL }).publicContactUrl).toBe(
			PUBLIC_CONTACT_URL,
		);
		expect(() => resolveServingConfiguration({ PUBLIC_CONTACT_URL })).toThrow("requires split");
	});

	it.each([
		"https://links.example.com/api/*",
		"https://links.example.com/api/contact?key=value",
		"https://admin.example.com/api/contact",
		"http://links.example.com/api/contact",
	])("rejects unsafe contact ingress %s before deployment", (PUBLIC_CONTACT_URL) => {
		expect(deployEnvErrors({ ...split, PUBLIC_CONTACT_URL }).join("\n")).toContain(
			"PUBLIC_CONTACT_URL must be the exact",
		);
		expect(() => resolveServingConfiguration({ ...split, PUBLIC_CONTACT_URL })).toThrow(
			"PUBLIC_CONTACT_URL",
		);
	});

	it.each([
		undefined,
		"",
		"http://admin.example.com",
		"https://admin.example.com/",
		"https://admin.example.com/path",
		"https://user@admin.example.com",
		"https://admin.example.com#fragment",
		" https://admin.example.com",
		"https://admin.example.com:8443",
	])("rejects a noncanonical split origin %s", (value) => {
		for (const name of ["ADMIN_SITE_URL", "PUBLIC_SITE_URL"] as const) {
			expect(deployEnvErrors({ ...split, [name]: value }).join("\n")).toContain(
				`${name} must be a bare HTTPS origin`,
			);
		}
	});

	it("rejects shared hostnames, workers.dev admin access and mixed legacy ownership", () => {
		expect(
			deployEnvErrors({ ...split, PUBLIC_SITE_URL: split.ADMIN_SITE_URL }).join("\n"),
		).toContain("separate hostnames");
		expect(
			deployEnvErrors({ ...split, ADMIN_SITE_URL: "https://linkden.owner.workers.dev" }).join("\n"),
		).toContain("approved custom hostname");
		expect(deployEnvErrors({ ...split, SITE_DOMAIN: "links.example.com" }).join("\n")).toContain(
			"SITE_DOMAIN must be unset",
		);
		expect(() => resolveServingConfiguration({ LINKDEN_SERVING_MODE: "SPLIT" })).toThrow(
			"exactly legacy or split",
		);
	});

	it("requires auth, browser API and profile metadata origins to match their respective host", () => {
		for (const name of ["BETTER_AUTH_URL", "CORS_ORIGIN", "NEXT_PUBLIC_SERVER_URL"] as const) {
			expect(deployEnvErrors({ ...split, [name]: split.PUBLIC_SITE_URL }).join("\n")).toContain(
				`${name} must equal ADMIN_SITE_URL`,
			);
		}
		expect(
			deployEnvErrors({ ...split, NEXT_PUBLIC_SITE_URL: split.ADMIN_SITE_URL }).join("\n"),
		).toContain("NEXT_PUBLIC_SITE_URL must equal PUBLIC_SITE_URL");
	});
});

describe("deployEnvErrors", () => {
	const valid = {
		BETTER_AUTH_SECRET: "x".repeat(44),
		BETTER_AUTH_URL: "https://linkden.example.workers.dev",
		CORS_ORIGIN: "https://linkden.example.workers.dev",
		NEXT_PUBLIC_SERVER_URL: "https://linkden.example.workers.dev",
		NEXT_PUBLIC_SITE_URL: "https://linkden.example.workers.dev",
	};

	it("accepts a complete workers.dev configuration", () => {
		expect(deployEnvErrors(valid)).toEqual([]);
	});

	it.each(["BETTER_AUTH_URL", "NEXT_PUBLIC_SERVER_URL"])(
		"rejects noncanonical browser origins in %s",
		(name) => {
			for (const value of [
				"https://linkden.example.workers.dev/",
				"https://linkden.example.workers.dev/path",
				"https://user:password@linkden.example.workers.dev",
				"https://linkden.example.workers.dev?key=value",
			])
				expect(deployEnvErrors({ ...valid, [name]: value }).join("\n")).toContain(
					`${name} must be a bare origin`,
				);
		},
	);

	it("requires one browser origin on legacy workers.dev as well as custom domains", () => {
		for (const name of ["BETTER_AUTH_URL", "CORS_ORIGIN", "NEXT_PUBLIC_SERVER_URL"] as const)
			expect(
				deployEnvErrors({ ...valid, [name]: "https://linkden-api.example.workers.dev" }).join("\n"),
			).toContain(`${name} must match NEXT_PUBLIC_SITE_URL in legacy mode`);
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
		expect(errors.join("\n")).toMatch(/CORS_ORIGIN must be a bare origin/);
	});

	it("rejects values with surrounding whitespace", () => {
		expect(deployEnvErrors({ ...valid, BETTER_AUTH_URL: " https://a.example " })[0]).toMatch(
			/whitespace/,
		);
	});

	it("keeps publishing off by default and rejects incomplete or ambiguous opt-ins", () => {
		expect(deployEnvErrors({ ...valid, PUBLICATION_ENABLED: "false" })).toEqual([]);
		for (const name of ["PUBLICATION_ENABLED", "PUBLICATION_SCHEDULER_ENABLED"] as const)
			expect(deployEnvErrors({ ...valid, [name]: "TRUE" }).join("\n")).toContain(
				`${name} must be exactly true or false`,
			);
		expect(deployEnvErrors({ ...valid, PUBLICATION_ENABLED: "true" }).join("\n")).toContain(
			"Publication is not configured",
		);
		expect(
			deployEnvErrors({ ...valid, PUBLICATION_SCHEDULER_ENABLED: "true" }).join("\n"),
		).toContain("Scheduled publication requires");
		expect(
			deployEnvErrors({
				...valid,
				PUBLICATION_ENABLED: "true",
				PUBLICATION_SCHEDULER_ENABLED: "true",
				PUBLICATION_TARGET: "staging",
				PUBLICATION_RENDERER_SOURCE_ID: "a".repeat(40),
				PUBLICATION_GITHUB_TOKEN: "server-only-token",
				PUBLIC_SITE_URL: "https://linkden-public-staging.owner.workers.dev",
			}),
		).toEqual([]);
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
