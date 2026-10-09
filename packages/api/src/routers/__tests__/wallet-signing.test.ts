import { beforeEach, describe, expect, it, vi } from "vitest";

const env: Record<string, string | undefined> = {};
vi.mock("@linkden/env/server", () => ({ env }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { siteSettings } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../index");
const { eq } = await import("drizzle-orm");

const admin = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

const CERT = "-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIU\n-----END CERTIFICATE-----";
const KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0B\n-----END PRIVATE KEY-----";

async function stored(key: string) {
	const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
	return row?.value;
}

describe("wallet.updateSigningKeys", () => {
	beforeEach(async () => {
		await db.delete(siteSettings);
		for (const k of Object.keys(env)) delete env[k];
	});

	it("stores the PEM the signer reads when the form sends base64-wrapped PEM", async () => {
		// What signing-keys-section.tsx sends: btoa(paste) / readAsDataURL payload.
		await admin.wallet.updateSigningKeys({
			signerCert: btoa(CERT),
			signerKey: btoa(KEY),
			wwdrCert: btoa(CERT),
		});
		expect(await stored("wallet_signer_cert")).toBe(CERT);
		expect(await stored("wallet_signer_key")).toBe(KEY);
		expect(await stored("wallet_wwdr_cert")).toBe(CERT);
	});

	it("rejects material the signer can never load instead of reporting green", async () => {
		await expect(
			admin.wallet.updateSigningKeys({ signerKey: btoa("not a key at all") }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(admin.wallet.updateSigningKeys({ signerCert: btoa(KEY) })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		expect(await stored("wallet_signer_key")).toBeUndefined();
	});

	it("allows clearing a stored value with an empty string", async () => {
		await admin.wallet.updateSigningKeys({ signerCert: CERT });
		await admin.wallet.updateSigningKeys({ signerCert: "" });
		expect(await stored("wallet_signer_cert")).toBe("");
	});
});

describe("wallet.getSigningStatus", () => {
	beforeEach(async () => {
		await db.delete(siteSettings);
		for (const k of Object.keys(env)) delete env[k];
	});

	it("flags a stored value the signer can't load (it shadows env)", async () => {
		env.WALLET_SIGNER_KEY = KEY;
		// A legacy bad row saved before write-time validation existed.
		await db.insert(siteSettings).values({ key: "wallet_signer_key", value: "garbage" });
		const status = await admin.wallet.getSigningStatus();
		expect(status.signerKey).toBe(false);
		expect(status.source.signerKey).toBe("settings");
	});

	it("reports env material as OK, including base64-wrapped PEM", async () => {
		env.WALLET_SIGNER_CERT = btoa(CERT);
		env.WALLET_SIGNER_KEY = KEY;
		const status = await admin.wallet.getSigningStatus();
		expect(status.signerCert).toBe(true);
		expect(status.signerKey).toBe(true);
		expect(status.wwdrCert).toBe(false);
	});
});

describe("wallet.updateConfig", () => {
	it("rejects a malformed relevantDate (Wallet refuses such a pass)", async () => {
		await expect(admin.wallet.updateConfig({ relevantDate: "next friday" })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		await admin.wallet.updateConfig({ relevantDate: "2026-10-07T18:00:00.000Z" });
		expect(await stored("wallet_relevant_date")).toBe("2026-10-07T18:00:00.000Z");
	});
});

describe("wallet.updateConfig fields", () => {
	beforeEach(async () => {
		await db.delete(siteSettings);
	});

	it("stores stripped fields and names a key that strips to nothing", async () => {
		await admin.wallet.updateConfig({
			headerFields: [{ key: "tier<b></b>", label: "<i>Tier</i>", value: "Gold" }],
		});
		expect(JSON.parse((await stored("wallet_header_fields")) ?? "[]")).toEqual([
			{ key: "tier", label: "Tier", value: "Gold" },
		]);

		await expect(
			admin.wallet.updateConfig({
				organizationName: "Acme",
				headerFields: [{ key: "<b>", label: "Tier", value: "Gold" }],
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: expect.stringMatching(/header field 1/),
		});
		// Nothing from the rejected save was written.
		expect(await stored("wallet_organization_name")).toBeUndefined();
	});
});
