import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The Custom CSS editor tells admins which `.ld-*` classes to target. Every one
// of them must be emitted by the public renderer, or rules written against the
// in-app reference silently match nothing.
const webSrc = resolve(process.cwd(), "apps/web/src");
const reference = readFileSync(
	resolve(webSrc, "components/admin/appearance/custom-css-section.tsx"),
	"utf8",
);
const publicDir = resolve(webSrc, "components/public");
const publicSource = readdirSync(publicDir)
	.filter((f) => f.endsWith(".tsx"))
	.map((f) => readFileSync(resolve(publicDir, f), "utf8"))
	.join("\n");

const documented = [...new Set([...reference.matchAll(/\.(ld-[a-z-]+)/g)].map((m) => m[1]))];

describe("custom CSS class hooks", () => {
	it("documents at least the core hooks", () => {
		expect(documented).toEqual(
			expect.arrayContaining(["ld-page", "ld-profile", "ld-contact-block"]),
		);
	});

	it.each(documented)("%s is emitted in a className by components/public", (hook) => {
		// Inside a class string: delimited by quotes, backticks or spaces.
		expect(publicSource).toMatch(new RegExp(`["'\`\\s]${hook}["'\`\\s]`));
	});
});
