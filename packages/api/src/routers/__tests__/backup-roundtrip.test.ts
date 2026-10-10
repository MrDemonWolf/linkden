import { beforeEach, describe, expect, it, vi } from "vitest";

// The backup router imports the D1 `db` singleton; point it at an in-memory
// libsql database with every migration applied (same wiring as the other
// router integration tests).
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { block, contactSubmission, linkClick, siteSettings, socialNetwork } = await import(
	"@linkden/db/schema/index"
);
const { MAX_BLOCKS, MAX_IMPORT_CONTACTS } = await import("@linkden/validators");
const { appRouter } = await import("../index");
const { asc, eq } = await import("drizzle-orm");

const caller = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

const T0 = new Date("2026-01-02T03:04:05.678Z");
const START = new Date("2026-02-01T00:00:00.000Z");
const END = new Date("2026-03-01T00:00:00.000Z");

async function wipe() {
	await db.delete(linkClick);
	await db.delete(block);
	await db.delete(contactSubmission);
	await db.delete(socialNetwork);
	await db.delete(siteSettings);
}

async function seed() {
	await db.insert(block).values({
		id: "b1",
		type: "link",
		title: "Site",
		url: "https://example.com",
		position: 0,
		isEnabled: true,
		status: "published",
		scheduledStart: START,
		scheduledEnd: END,
		createdAt: T0,
		updatedAt: T0,
	});
	await db.insert(contactSubmission).values({
		id: "c1",
		name: "Ada",
		email: "ada@example.com",
		message: "Hello",
		isRead: true,
		createdAt: T0,
		updatedAt: T0,
	});
	await db
		.insert(socialNetwork)
		.values({ slug: "github", url: "https://github.com/ada", isActive: true, addedAt: T0 });
	await db.insert(siteSettings).values([
		{ key: "profile_name", value: "Ada" },
		{ key: "email_api_key", value: "re_live_secret" },
	]);
}

/** What the browser actually downloads: no tRPC transformer, so Dates → ISO strings. */
async function exportOverTheWire() {
	return JSON.parse(JSON.stringify(await caller.backup.export()));
}

describe("backup export → import round-trip", () => {
	beforeEach(async () => {
		await wipe();
		await seed();
	});

	it("restores a real export into an empty database (merge) with timestamps intact", async () => {
		const wire = await exportOverTheWire();
		expect(typeof wire.data.blocks[0].createdAt).toBe("string");
		await wipe();

		const result = await caller.backup.import({ mode: "merge", data: wire.data });
		expect(result.skipped).toEqual({
			blocks: 0,
			socialNetworks: 0,
			settings: 0,
			contactSubmissions: 0,
		});

		const [b] = await db.select().from(block);
		expect(b?.scheduledStart?.toISOString()).toBe(START.toISOString());
		expect(b?.scheduledEnd?.toISOString()).toBe(END.toISOString());
		expect(b?.createdAt.toISOString()).toBe(T0.toISOString());
		const [c] = await db.select().from(contactSubmission);
		expect(c).toMatchObject({ id: "c1", name: "Ada", isRead: true });
		expect(c?.createdAt.toISOString()).toBe(T0.toISOString());
		const [s] = await db.select().from(socialNetwork);
		expect(s?.addedAt.toISOString()).toBe(T0.toISOString());
	});

	it("export leaves secrets out and lists referenced images", async () => {
		await db
			.insert(siteSettings)
			.values({ key: "avatar_url", value: "https://site.test/api/images/avatar/a1.png" });
		const wire = await exportOverTheWire();
		expect(JSON.stringify(wire)).not.toContain("re_live_secret");
		expect(wire.images).toEqual(["avatar/a1.png"]);
		expect(wire.notes).toMatch(/images are not included/i);
	});

	it("replace keeps secrets and the click history of restored blocks, drops the rest", async () => {
		await db.insert(linkClick).values({ id: "k1", blockId: "b1" });
		const wire = await exportOverTheWire();
		// Content created after the export must not survive a replace.
		await db.insert(block).values({ id: "b-extra", type: "divider", position: 1 });

		await caller.backup.import({ mode: "replace", data: wire.data });

		const ids = (await db.select({ id: block.id }).from(block).orderBy(asc(block.id))).map(
			(r) => r.id,
		);
		expect(ids).toEqual(["b1"]);
		expect(await db.select().from(linkClick)).toHaveLength(1);
		const [secret] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "email_api_key"));
		expect(secret?.value).toBe("re_live_secret");
	});

	it("skips secret keys and invalid rows instead of writing them", async () => {
		const wire = await exportOverTheWire();
		wire.data.settings.email_api_key = "attacker_key";
		wire.data.settings.custom_primary = "red";
		wire.data.blocks.push({
			...wire.data.blocks[0],
			id: "evil",
			url: "javascript:alert(1)",
		});

		const result = await caller.backup.import({ mode: "merge", data: wire.data });
		expect(result.skipped.settings).toBe(2);
		expect(result.skipped.blocks).toBe(1);
		const [secret] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "email_api_key"));
		expect(secret?.value).toBe("re_live_secret");
		expect(await db.select().from(block).where(eq(block.id, "evil"))).toHaveLength(0);
	});

	it("maps a legacy form block to connect and never persists socialIcons", async () => {
		const result = await caller.backup.import({
			mode: "merge",
			data: {
				blocks: [
					{
						id: "legacy",
						type: "form",
						position: 2,
						config: '{"preset":"contact"}',
						...({ socialIcons: "x".repeat(5000) } as object),
					},
					{ id: "icons", type: "social_icons", position: 3 },
				],
			},
		});
		expect(result.skipped.blocks).toBe(1);
		const [row] = await db.select().from(block).where(eq(block.id, "legacy"));
		expect(row?.type).toBe("connect");
		expect(row?.socialIcons).toBeNull();
	});

	it("writes the newest contacts up to the cap and reports the rest", async () => {
		await wipe();
		const contacts = Array.from({ length: MAX_IMPORT_CONTACTS + 1 }, (_, i) => ({
			id: `c${i}`,
			name: "N",
			email: "n@example.com",
			message: "m",
			createdAt: new Date(T0.getTime() + i * 1000).toISOString(),
		}));
		const result = await caller.backup.import({
			mode: "merge",
			data: { contactSubmissions: contacts },
		});
		expect(result.skipped.contactSubmissions).toBe(1);
		// c0 is the oldest, so it is the one left out.
		expect(
			await db.select().from(contactSubmission).where(eq(contactSubmission.id, "c0")),
		).toHaveLength(0);
	});

	it("replace never deletes stored messages that are in the backup, even past the cap", async () => {
		await wipe();
		await db.insert(contactSubmission).values(
			Array.from({ length: MAX_IMPORT_CONTACTS + 1 }, (_, i) => ({
				id: `c${i}`,
				name: "N",
				email: "n@example.com",
				message: "m",
				createdAt: new Date(T0.getTime() + i * 1000),
			})),
		);
		const wire = await exportOverTheWire();
		// Arrived after the export: a replace removes it.
		await db
			.insert(contactSubmission)
			.values({ id: "late", name: "L", email: "l@example.com", message: "m" });
		// Changed after the export: a replace restores the backup's copy.
		await db.update(contactSubmission).set({ isRead: true }).where(eq(contactSubmission.id, "c9"));

		const result = await caller.backup.import({ mode: "replace", data: wire.data });

		const rows = await db.select().from(contactSubmission);
		expect(rows).toHaveLength(MAX_IMPORT_CONTACTS + 1);
		expect(rows.some((r) => r.id === "late")).toBe(false);
		expect(rows.some((r) => r.id === "c0")).toBe(true);
		expect(rows.find((r) => r.id === "c9")?.isRead).toBe(false);
		// c0 is past the cap but still stored, so nothing is actually missing.
		expect(result.skipped.contactSubmissions).toBe(0);
	});

	it("replace into an empty database reports the over-cap messages it could not write", async () => {
		await wipe();
		const contacts = Array.from({ length: MAX_IMPORT_CONTACTS + 2 }, (_, i) => ({
			id: `c${i}`,
			name: "N",
			email: "n@example.com",
			message: "m",
			createdAt: new Date(T0.getTime() + i * 1000).toISOString(),
		}));
		const result = await caller.backup.import({
			mode: "replace",
			data: { contactSubmissions: contacts },
		});
		expect(result.skipped.contactSubmissions).toBe(2);
		expect(await db.select().from(contactSubmission)).toHaveLength(MAX_IMPORT_CONTACTS);
	});

	it("refuses a merge that would push the page past MAX_BLOCKS", async () => {
		await db.insert(block).values(
			Array.from({ length: MAX_BLOCKS - 1 }, (_, i) => ({
				id: `fill${i}`,
				type: "divider" as const,
				position: i + 1,
			})),
		);
		await expect(
			caller.backup.import({
				mode: "merge",
				data: { blocks: [{ id: "one-too-many", type: "divider", position: 999 }] },
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("merge appends new blocks after the page instead of interleaving; known ids stay put", async () => {
		await db.insert(block).values({ id: "b2", type: "divider", position: 7 });
		await caller.backup.import({
			mode: "merge",
			data: {
				blocks: [
					{ id: "new-b", type: "divider", position: 1 },
					{ id: "new-a", type: "divider", position: 0 },
					{ id: "b1", type: "divider", position: 0 },
				],
			},
		});
		const rows = await db
			.select({ id: block.id, position: block.position })
			.from(block)
			.orderBy(asc(block.position));
		expect(rows).toEqual([
			{ id: "b1", position: 0 },
			{ id: "b2", position: 7 },
			{ id: "new-a", position: 8 },
			{ id: "new-b", position: 9 },
		]);
	});
});

describe("backup.importLinkStack", () => {
	beforeEach(async () => {
		await wipe();
		await seed();
	});

	const options = { importLinks: true, importProfile: true, importTheme: true };

	it("appends links after the existing page and writes a matching theme to theme_preset", async () => {
		const result = await caller.backup.importLinkStack({
			data: {
				littlelink_name: "Ada L",
				theme: "Ocean Blue",
				links: [
					{ link: "https://b.example", title: "B", order: 2 },
					{ link: "https://a.example", title: "A", order: 1 },
				],
			},
			options,
		});
		expect(result.stats).toEqual({ linksImported: 2, settingsUpdated: true });
		const rows = await db
			.select({ title: block.title, position: block.position })
			.from(block)
			.orderBy(asc(block.position));
		expect(rows).toEqual([
			{ title: "Site", position: 0 },
			{ title: "A", position: 1 },
			{ title: "B", position: 2 },
		]);
		const [preset] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "theme_preset"));
		expect(preset?.value).toBe("ocean-blue");
	});

	it("accepts LinkStack's raw shape (nulls, numeric ids) and skips an unknown theme", async () => {
		const result = await caller.backup.importLinkStack({
			data: {
				littlelink_name: null,
				littlelink_description: null,
				theme: "some-community-theme",
				links: [{ link: "https://x.example", title: null, button_id: 42, type: "1", order: null }],
			},
			options,
		});
		// Nothing a reader consumes was written: no name/bio, no preset match.
		expect(result.stats).toEqual({ linksImported: 1, settingsUpdated: false });
		const keys = (await db.select().from(siteSettings)).map((r) => r.key);
		expect(keys).not.toContain("theme");
		expect(keys).not.toContain("theme_preset");
	});
});
