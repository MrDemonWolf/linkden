import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { block, siteSettings } = await import("@linkden/db/schema/index");
const { escapeVcardText, generateVCardString, resolvePublicVcard } = await import("../vcard");
const { appRouter } = await import("../index");

const admin = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

describe("generateVCardString", () => {
	it("escapes TEXT values so CR/LF can't inject a property", () => {
		const vcf = generateVCardString({
			fullName: "Alice\r\nTEL:+15550000",
			org: "Acme, Inc; Labs",
			department: "R&D",
			phone: "+1 555\n0100",
		});
		const lines = vcf.split("\r\n");
		expect(lines).toContain("FN:Alice\\nTEL:+15550000");
		expect(lines).toContain("ORG:Acme\\, Inc\\; Labs;R&D");
		expect(lines.filter((l) => l.startsWith("TEL"))).toEqual(["TEL;TYPE=HOME:+1 555\\n0100"]);
	});

	it("emits the required N line and token-only URL types", () => {
		const vcf = generateVCardString({
			fullName: "Ada King Lovelace",
			urls: [
				{ label: "My Site;X=1", url: "https://a.example" },
				{ label: "!!!", url: "https://b.example" },
			],
		});
		expect(vcf).toContain("\r\nN:Lovelace;Ada King;;;\r\n");
		expect(vcf).toContain("\r\nURL;TYPE=MySiteX1:https://a.example\r\n");
		expect(vcf).toContain("\r\nURL:https://b.example\r\n");
	});

	it("escapeVcardText handles backslash, comma, semicolon and every newline form", () => {
		expect(escapeVcardText("a\\b,c;d\r\ne\rf\ng")).toBe("a\\\\b\\,c\\;d\\ne\\nf\\ng");
	});
});

describe("resolvePublicVcard", () => {
	const now = new Date("2026-06-01T00:00:00.000Z");

	beforeEach(async () => {
		await db.delete(block);
		await db.delete(siteSettings);
		await db.insert(siteSettings).values([
			{ key: "vcard_enabled", value: "true" },
			{ key: "vcard_data", value: JSON.stringify({ fullName: "Global Card" }) },
		]);
	});

	it("serves the global vCard when there is no vCard block (the footer button case)", async () => {
		const result = await resolvePublicVcard(now);
		expect(result?.vcardString).toContain("FN:Global Card");
	});

	it("prefers a visible vCard block, ignores one outside its schedule window", async () => {
		await db.insert(block).values({
			id: "hidden",
			type: "vcard",
			position: 0,
			status: "published",
			config: JSON.stringify({ fullName: "Scheduled Secret" }),
			scheduledStart: new Date("2027-01-01T00:00:00.000Z"),
		});
		expect((await resolvePublicVcard(now))?.vcardString).not.toContain("Scheduled Secret");

		await db.insert(block).values({
			id: "live",
			type: "vcard",
			position: 1,
			status: "published",
			config: JSON.stringify({ fullName: "Block Card" }),
		});
		expect((await resolvePublicVcard(now))?.vcardString).toContain("FN:Block Card");
	});

	it("returns null when disabled or when nothing meaningful is configured", async () => {
		await db.delete(siteSettings);
		expect(await resolvePublicVcard(now)).toBeNull();
		await db.insert(siteSettings).values({ key: "vcard_enabled", value: "true" });
		expect(await resolvePublicVcard(now)).toBeNull();
	});
});

describe("vcard.updateConfig", () => {
	it("stores a schema-valid vCard larger than the old 10k cap (so it also restores)", async () => {
		const url = `https://example.com/${"u".repeat(480)}`;
		const data = {
			fullName: "Big Card",
			urls: Array.from({ length: 20 }, (_, i) => ({ label: `Link${i}`, url })),
		};
		expect(JSON.stringify(data).length).toBeGreaterThan(10_000);
		await expect(admin.vcard.updateConfig({ enabled: true, data })).resolves.toEqual({
			success: true,
		});
		expect((await admin.vcard.getConfig()).data.fullName).toBe("Big Card");
	});
});
