// @vitest-environment node

import {
	claimPublicationStatement,
	completePublicationStatements,
	currentPublicationStatement,
	failPublicationStatement,
	type PublicationStatement,
} from "@linkden/db/publication";
import {
	PUBLICATION_MIN_INTERVAL_MS,
	PUBLICATION_QUEUE_TIMEOUT_MS,
	PUBLICATION_SCHEDULE_INTERVAL_MS,
	publicationArtifactManifestJson,
	publicationSourceDigest,
	snapshotFromApprovedSource,
} from "@linkden/validators/publication";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TestClient = Awaited<ReturnType<typeof import("@linkden/db/testing").createTestDb>>["client"];
const store = vi.hoisted(() => ({ client: null as TestClient | null }));
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const test = await createTestDb();
	store.client = test.client;
	return { db: test.db };
});

const { db } = await import("@linkden/db");
const {
	block,
	contactSubmission,
	publicationRevision,
	publicationState,
	siteSettings,
	socialNetwork,
	user,
} = await import("@linkden/db/schema/index");
const { createPublicationRouter, requestPublication, runScheduledPublication } = await import(
	"../publication"
);
const config = {
	enabled: true as const,
	targetId: "approved-staging",
	rendererSourceId: "immutable-build-1",
	publicOrigin: "https://public.example",
};
const dispatch = vi.fn();
const adminContext = { session: { user: { id: "admin" } }, headers: new Headers() } as never;
const admin = createPublicationRouter({ configuration: () => config, dispatch }).createCaller(
	adminContext,
);
const anonymous = createPublicationRouter({ configuration: () => config, dispatch }).createCaller({
	session: null,
	headers: new Headers(),
});

describe("immutable approved schedule dispatch", () => {
	it("projects future starts and ends only from the manual approval, never later saved edits", async () => {
		const due = new Date(instant.getTime() + PUBLICATION_SCHEDULE_INTERVAL_MS);
		await db.insert(block).values({
			id: "future-approved",
			type: "text",
			position: 1,
			scheduledStart: due,
			scheduledEnd: new Date(due.getTime() + PUBLICATION_SCHEDULE_INTERVAL_MS),
			config: '{"body":"APPROVED_FUTURE"}',
		});
		const manual = await requestPublication(config, dispatch, instant);
		const [approval] = await db
			.select()
			.from(publicationRevision)
			.where(eq(publicationRevision.revision, manual.revision));
		expect(approval?.approvedSourceJson).toContain("APPROVED_FUTURE");
		expect(approval?.snapshotJson).not.toContain("APPROVED_FUTURE");
		expect(JSON.stringify(await admin.status())).not.toContain("APPROVED_FUTURE");
		await execute(claimPublicationStatement(claim(manual.revision)));
		await complete(manual.revision, "runner-1", instant.getTime() + 1);
		await db
			.update(block)
			.set({ config: '{"body":"UNAPPROVED_VISIBLE"}' })
			.where(eq(block.id, "visible"));
		await db
			.update(block)
			.set({ config: '{"body":"UNAPPROVED_FUTURE"}' })
			.where(eq(block.id, "future-approved"));
		await db.update(user).set({ name: "UNAPPROVED_PROFILE" });
		const result = await runScheduledPublication(
			{ ...config, schedulerEnabled: true },
			dispatch,
			due,
		);
		expect(result.status).toBe("dispatched");
		const [scheduled] = await db
			.select()
			.from(publicationRevision)
			.where(eq(publicationRevision.revision, result.revision!));
		expect(scheduled?.approvedSourceJson).toBeNull();
		expect(scheduled?.snapshotJson).toContain("APPROVED_FUTURE");
		expect(scheduled?.snapshotJson).toContain("Public text");
		expect(scheduled?.snapshotJson).not.toContain("UNAPPROVED");
		await execute(
			claimPublicationStatement(claim(result.revision!, "scheduled-runner", due.getTime())),
		);
		await complete(result.revision!, "scheduled-runner", due.getTime() + 1);
		const end = await runScheduledPublication(
			{ ...config, schedulerEnabled: true },
			dispatch,
			new Date(due.getTime() + PUBLICATION_SCHEDULE_INTERVAL_MS + 1),
		);
		expect(end.status).toBe("dispatched");
		const [ended] = await db
			.select()
			.from(publicationRevision)
			.where(eq(publicationRevision.revision, end.revision!));
		expect(ended?.snapshotJson).not.toContain("APPROVED_FUTURE");
		expect(ended?.snapshotJson).not.toContain("UNAPPROVED");
	});

	it("does not let delayed work from an older approval replace a new manual request", async () => {
		await db.insert(block).values({
			id: "future",
			type: "text",
			position: 1,
			scheduledStart: new Date(instant.getTime() + 300_000),
			config: '{"body":"Old approved future"}',
		});
		const first = await requestPublication(config, dispatch, instant);
		const [old] = await db
			.select()
			.from(publicationRevision)
			.where(eq(publicationRevision.revision, first.revision));
		const [state] = await db.select().from(publicationState);
		const delayedAt = new Date(instant.getTime() + 360_000);
		const delayed = snapshotFromApprovedSource(
			JSON.parse(old!.approvedSourceJson!),
			"delayed-schedule",
			delayedAt.toISOString(),
		);
		await db
			.update(block)
			.set({ config: '{"body":"New manual approval"}' })
			.where(eq(block.id, "visible"));
		const next = await requestPublication(config, dispatch, new Date(instant.getTime() + 300_000));
		await expect(
			client().execute({
				sql: "INSERT INTO publication_revision (revision,source_digest,target_id,renderer_source_id,public_origin,snapshot_json,approved_source_digest,approval_revision,request_kind,parent_generation,next_visibility_boundary,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
				args: [
					delayed.revision,
					await publicationSourceDigest(delayed, {
						targetId: config.targetId,
						rendererSourceId: config.rendererSourceId,
					}),
					config.targetId,
					config.rendererSourceId,
					config.publicOrigin,
					JSON.stringify(delayed),
					old!.approvedSourceDigest!,
					first.revision,
					"scheduled",
					state!.generation,
					null,
					delayedAt.getTime(),
				],
			}),
		).rejects.toThrow(/publication_approval_superseded/);
		expect((await db.select().from(publicationState))[0]).toMatchObject({
			currentRevision: next.revision,
			approvalRevision: next.revision,
		});
	});

	it("keeps scheduling opt-in and never supersedes an actively publishing runner", async () => {
		const reads = vi.spyOn(db, "select");
		expect(await runScheduledPublication(config, dispatch, instant)).toEqual({
			status: "disabled",
		});
		expect(reads).not.toHaveBeenCalled();
		reads.mockRestore();
		await db.insert(block).values({
			id: "future",
			type: "text",
			position: 1,
			scheduledStart: new Date(instant.getTime() + 60_000),
			config: '{"body":"Future"}',
		});
		const first = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(first.revision)));
		expect(
			await runScheduledPublication(
				{ ...config, schedulerEnabled: true },
				dispatch,
				new Date(instant.getTime() + 300_000),
			),
		).toEqual({ status: "pending" });
		expect((await db.select().from(publicationState))[0]?.currentRevision).toBe(first.revision);
	});

	it("reports overdue failed dispatch honestly without exposing approved future payloads", async () => {
		const due = new Date(instant.getTime() + 300_000);
		await db.insert(block).values({
			id: "future",
			type: "text",
			position: 1,
			scheduledStart: due,
			config: '{"body":"APPROVED_FUTURE_PAYLOAD"}',
		});
		const manual = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(manual.revision)));
		await complete(manual.revision, "runner-1", instant.getTime() + 1);
		dispatch.mockRejectedValueOnce(new Error("PRIVATE_PROVIDER_RESPONSE"));
		expect(
			await runScheduledPublication({ ...config, schedulerEnabled: true }, dispatch, due),
		).toEqual({ status: "failed" });
		vi.useFakeTimers({ toFake: ["Date"] });
		try {
			vi.setSystemTime(due);
			const scheduledAdmin = createPublicationRouter({
				configuration: () => ({ ...config, schedulerEnabled: true }),
				dispatch,
			}).createCaller(adminContext);
			const status = await scheduledAdmin.status();
			expect(status).toMatchObject({
				status: "failed",
				liveVerified: true,
				scheduler: {
					configured: true,
					cadenceMinutes: 5,
					approvalAvailable: true,
					overdue: true,
					failureCode: "dispatch_failed",
				},
			});
			expect(status.lastGood?.revision).toBe(manual.revision);
			expect(JSON.stringify(status)).not.toContain("APPROVED_FUTURE_PAYLOAD");
			expect(JSON.stringify(status)).not.toContain("PRIVATE_PROVIDER_RESPONSE");
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not silently bypass the daily publication cap at a due boundary", async () => {
		const due = new Date(instant.getTime() + 300_000);
		await db.insert(block).values({
			id: "future",
			type: "text",
			position: 1,
			scheduledStart: due,
			config: '{"body":"Future"}',
		});
		const manual = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(manual.revision)));
		await complete(manual.revision, "runner-1", instant.getTime() + 1);
		await db.update(publicationState).set({ requestsToday: 20 });
		expect(
			await runScheduledPublication({ ...config, schedulerEnabled: true }, dispatch, due),
		).toEqual({ status: "failed" });
		expect((await db.select().from(publicationState))[0]).toMatchObject({
			currentRevision: manual.revision,
			lastGoodRevision: manual.revision,
			nextVisibilityBoundary: due,
			scheduleFailureCode: "request_limit",
		});
		expect(dispatch).toHaveBeenCalledTimes(1);
	});

	it("rejects a boundary insertion when the prior runner claims after the scheduler read", async () => {
		const due = new Date(instant.getTime() + 300_000);
		await db.insert(block).values({
			id: "future",
			type: "text",
			position: 1,
			scheduledStart: due,
			config: '{"body":"Approved future"}',
		});
		const manual = await requestPublication(config, dispatch, instant);
		const [approval] = await db.select().from(publicationRevision);
		const [captured] = await db.select().from(publicationState);
		const snapshot = snapshotFromApprovedSource(
			JSON.parse(approval!.approvedSourceJson!),
			"raced-boundary",
			due.toISOString(),
		);
		await execute(claimPublicationStatement(claim(manual.revision)));
		await expect(
			db.insert(publicationRevision).values({
				revision: snapshot.revision,
				sourceDigest: await publicationSourceDigest(snapshot, {
					targetId: config.targetId,
					rendererSourceId: config.rendererSourceId,
				}),
				targetId: config.targetId,
				rendererSourceId: config.rendererSourceId,
				publicOrigin: config.publicOrigin,
				snapshotJson: JSON.stringify(snapshot),
				approvedSourceDigest: approval!.approvedSourceDigest,
				approvalRevision: manual.revision,
				requestKind: "scheduled",
				parentGeneration: captured!.generation,
				createdAt: due,
			}),
		).rejects.toMatchObject({
			cause: { message: expect.stringContaining("publication_approval_superseded") },
		});
		expect((await db.select().from(publicationState))[0]?.currentRevision).toBe(manual.revision);
	});

	it("allows an explicit retry after an unclaimed queue timeout, without expiring Publishing", async () => {
		const first = await requestPublication(config, dispatch, instant);
		expect(
			(
				await requestPublication(
					config,
					dispatch,
					new Date(instant.getTime() + PUBLICATION_QUEUE_TIMEOUT_MS - 1),
				)
			).revision,
		).toBe(first.revision);
		const nextTime = instant.getTime() + PUBLICATION_QUEUE_TIMEOUT_MS;
		const next = await requestPublication(config, dispatch, new Date(nextTime));
		expect(next.revision).not.toBe(first.revision);
		await execute(claimPublicationStatement(claim(next.revision, "active", nextTime)));
		expect(
			(
				await requestPublication(
					config,
					dispatch,
					new Date(nextTime + PUBLICATION_QUEUE_TIMEOUT_MS),
				)
			).revision,
		).toBe(next.revision);
	});

	it("factory reset removes the private approval and fences later boundary dispatch", async () => {
		await db.insert(block).values({
			id: "future",
			type: "text",
			position: 1,
			scheduledStart: new Date(instant.getTime() + 60_000),
			config: '{"body":"Deleted owner data"}',
		});
		await requestPublication(config, dispatch, instant);
		const { dangerRouter } = await import("../danger");
		await dangerRouter.createCaller(adminContext).resetEverything();
		expect(await db.select().from(publicationRevision)).toHaveLength(0);
		expect(
			await runScheduledPublication(
				{ ...config, schedulerEnabled: true },
				dispatch,
				new Date(instant.getTime() + 300_000),
			),
		).toEqual({ status: "idle" });
		expect(dispatch).toHaveBeenCalledTimes(1);
	});

	it("content deletion atomically revokes approved future content and fences an active runner", async () => {
		await db.insert(block).values({
			id: "future",
			type: "text",
			position: 1,
			scheduledStart: new Date(instant.getTime() + 60_000),
			config: '{"body":"Deleted future"}',
		});
		const requested = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(requested.revision)));
		const { dangerRouter } = await import("../danger");
		await dangerRouter.createCaller(adminContext).deleteAllContent();
		expect(await db.select().from(block)).toHaveLength(0);
		expect((await db.select().from(publicationState))[0]).toMatchObject({
			currentRevision: null,
			approvalRevision: null,
			nextVisibilityBoundary: null,
			recoveryRequired: true,
			recoveryRevision: requested.revision,
		});
		expect(
			(await execute(currentPublicationStatement(claim(requested.revision)))).rows,
		).toHaveLength(0);
		expect(
			await runScheduledPublication(
				{ ...config, schedulerEnabled: true },
				dispatch,
				new Date(instant.getTime() + 300_000),
			),
		).toEqual({ status: "idle" });
		expect(dispatch).toHaveBeenCalledTimes(1);
	});
});
const instant = new Date("2026-11-06T12:00:00.000Z");

function client() {
	if (!store.client) throw new Error("Test database missing");
	return store.client;
}
function execute(statement: PublicationStatement) {
	return client().execute({ sql: statement.sql, args: statement.params });
}
async function complete(revision: string, runnerId: string, now: number) {
	const artifactManifestJson = publicationArtifactManifestJson({
		schemaVersion: 1,
		revision,
		files: [{ path: "index.html", sha256: "a".repeat(64) }],
	});
	return client().batch(
		completePublicationStatements({
			revision,
			runnerId,
			targetId: config.targetId,
			rendererSourceId: config.rendererSourceId,
			now,
			artifactDigest: "b".repeat(64),
			deploymentId: `deployment-${revision}`,
			providerVersionId: `version-${revision}`,
			artifactManifestJson,
		}).map((statement) => ({ sql: statement.sql, args: statement.params })),
		"write",
	);
}
function claim(revision: string, runnerId = "runner-1", now = instant.getTime()) {
	return {
		revision,
		runnerId,
		targetId: config.targetId,
		rendererSourceId: config.rendererSourceId,
		now,
	};
}

beforeEach(async () => {
	for (const table of [
		publicationState,
		publicationRevision,
		block,
		contactSubmission,
		siteSettings,
		socialNetwork,
		user,
	])
		await db.delete(table);
	await db
		.insert(user)
		.values({ id: "admin", name: "Ada", email: "PRIVATE_EMAIL@example.com", emailVerified: true });
	await db
		.insert(block)
		.values({ id: "visible", type: "text", position: 0, config: '{"body":"Public text"}' });
	dispatch.mockReset().mockResolvedValue(undefined);
});
afterAll(() => client().close());
afterEach(() => vi.restoreAllMocks());

describe("protected publication requests", () => {
	it("requires authentication and stays disabled without explicit approved configuration", async () => {
		await expect(anonymous.status()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(anonymous.request()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		const disabled = createPublicationRouter().createCaller(adminContext);
		const reads = vi.spyOn(db, "select").mockImplementation(() => {
			throw new Error("no such table: publication_state");
		});
		expect(await disabled.status()).toMatchObject({
			available: false,
			status: "draft",
			liveVerified: false,
		});
		await expect(disabled.request()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		expect(reads).not.toHaveBeenCalled();
		reads.mockRestore();
		expect(await db.select().from(publicationRevision)).toHaveLength(0);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("reports missing enabled storage as setup unavailable and refuses to enqueue", async () => {
		vi.spyOn(db, "select").mockImplementation(() => {
			throw new Error("no such table: publication_state");
		});
		const status = await admin.status();
		expect(status).toMatchObject({
			status: "draft",
			available: false,
			sourceDigest: null,
			liveVerified: false,
		});
		expect(status.unavailableReason).toContain("migrations");
		await expect(admin.request()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("keeps live tied-position blocks and added-order social links in the same order", async () => {
		await db.insert(block).values([
			{
				id: "new-a",
				type: "text",
				position: 0,
				createdAt: new Date("2026-11-02"),
				config: '{"body":"Newer"}',
			},
			{
				id: "old-z",
				type: "text",
				position: 0,
				createdAt: new Date("2026-11-01"),
				config: '{"body":"Older"}',
			},
		]);
		await db.insert(socialNetwork).values([
			{ slug: "github", url: "https://github.com/ada", addedAt: new Date("2026-11-02") },
			{ slug: "youtube", url: "https://youtube.com/@ada", addedAt: new Date("2026-11-01") },
		]);
		const { publicRouter } = await import("../public");
		const live = await publicRouter
			.createCaller({ session: null, headers: new Headers() })
			.getPage();
		await requestPublication(config, dispatch, instant);
		const snapshot = JSON.parse((await db.select().from(publicationRevision))[0]!.snapshotJson);
		expect(snapshot.blocks.map((row: { id: string }) => row.id)).toEqual(
			live.blocks.map((row) => row.id),
		);
		expect(snapshot.socialNetworks.map((row: { slug: string }) => row.slug)).toEqual(
			live.socialNetworks.map((row) => row.slug),
		);
	});

	it("freezes public allowlisted content without auth, inbox, future blocks or saved alternatives", async () => {
		await db.insert(siteSettings).values([
			{ key: "email_api_key", value: "PRIVATE_API_KEY" },
			{ key: "wallet_signer_key", value: "PRIVATE_SIGNING_KEY" },
			{ key: "branding_pp_mode", value: "url" },
			{ key: "branding_pp_text", value: "PRIVATE_ALTERNATIVE" },
		]);
		await db.insert(block).values([
			{
				id: "draft",
				type: "text",
				position: 1,
				status: "draft",
				config: '{"body":"PRIVATE_DRAFT"}',
			},
			{
				id: "future",
				type: "text",
				position: 2,
				scheduledStart: new Date("2026-11-07T00:00:00Z"),
				config: '{"body":"PRIVATE_FUTURE"}',
			},
			{
				id: "disabled",
				type: "text",
				position: 3,
				isEnabled: false,
				config: '{"body":"PRIVATE_DISABLED"}',
			},
			{
				id: "hidden-feature",
				type: "connect",
				position: 4,
				config: '{"buttonText":"PRIVATE_FEATURE"}',
			},
		]);
		await db.insert(contactSubmission).values({
			id: "private",
			name: "PRIVATE_INBOX",
			email: "private@example.com",
			message: "PRIVATE_MESSAGE",
		});
		const requested = await requestPublication(config, dispatch, instant);
		const [stored] = await db.select().from(publicationRevision);
		expect(stored?.snapshotJson).not.toContain("PRIVATE_");
		expect(JSON.parse(stored!.snapshotJson).blocks.map((row: { id: string }) => row.id)).toEqual([
			"visible",
		]);
		expect(stored?.nextVisibilityBoundary?.toISOString()).toBe("2026-11-07T00:00:00.000Z");
		await db
			.update(block)
			.set({ config: '{"body":"Changed later"}' })
			.where(eq(block.id, "visible"));
		expect((await db.select().from(publicationRevision))[0]?.snapshotJson).toBe(
			stored?.snapshotJson,
		);
		expect(dispatch).toHaveBeenCalledWith({
			revision: requested.revision,
			sourceDigest: requested.sourceDigest,
			targetId: config.targetId,
			rendererSourceId: config.rendererSourceId,
		});
		const response = JSON.stringify(await admin.status());
		expect(response).not.toContain("snapshotJson");
		expect(response).not.toContain("artifactManifestJson");
		expect(response).not.toContain("PRIVATE_");
	});

	it("deduplicates identical source and private edits without spending another request or dispatch", async () => {
		const first = await requestPublication(config, dispatch, instant);
		await db.insert(siteSettings).values({ key: "email_api_key", value: "PRIVATE_CHANGED" });
		await db.insert(block).values({
			id: "future",
			type: "text",
			position: 2,
			scheduledStart: new Date("2026-11-08T00:00:00Z"),
			status: "draft",
			config: '{"body":"Hidden"}',
		});
		const same = await requestPublication(config, dispatch, new Date(instant.getTime() + 1));
		expect(same).toMatchObject({ revision: first.revision, deduplicated: true, dispatched: false });
		expect(dispatch).toHaveBeenCalledTimes(1);
		expect((await db.select().from(publicationState))[0]).toMatchObject({
			requestsToday: 1,
			generation: 1,
			nextVisibilityBoundary: null,
		});
	});

	it("deduplicates concurrent requests atomically", async () => {
		const results = await Promise.all([
			requestPublication(config, dispatch, instant),
			requestPublication(config, dispatch, instant),
		]);
		expect(results[0]?.revision).toBe(results[1]?.revision);
		expect(await db.select().from(publicationRevision)).toHaveLength(1);
		expect(dispatch).toHaveBeenCalledTimes(1);
	});

	it("rejects stale review digests and bounds new-source requests to one per minute", async () => {
		await expect(
			requestPublication(config, dispatch, instant, "0".repeat(64)),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(await db.select().from(publicationRevision)).toHaveLength(0);
		await requestPublication(config, dispatch, instant);
		await db.update(block).set({ config: '{"body":"New public content"}' });
		await expect(
			requestPublication(
				config,
				dispatch,
				new Date(instant.getTime() + PUBLICATION_MIN_INTERVAL_MS - 1),
			),
		).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
		expect(await db.select().from(publicationRevision)).toHaveLength(1);
		await requestPublication(
			config,
			dispatch,
			new Date(instant.getTime() + PUBLICATION_MIN_INTERVAL_MS),
		);
		expect(await db.select().from(publicationRevision)).toHaveLength(2);
	});

	it("records a sanitized dispatch failure, preserves last-good, and permits a later retry", async () => {
		const first = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(first.revision)));
		await complete(first.revision, "runner-1", instant.getTime());
		await db.update(block).set({ config: '{"body":"New public content"}' });
		dispatch.mockRejectedValueOnce(new Error("PRIVATE_PROVIDER_TOKEN"));
		await expect(
			requestPublication(config, dispatch, new Date(instant.getTime() + 60_000)),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
		const state = (await db.select().from(publicationState))[0];
		expect(state?.lastGoodRevision).toBe(first.revision);
		const failed = (
			await db
				.select()
				.from(publicationRevision)
				.where(eq(publicationRevision.revision, state!.currentRevision!))
		)[0];
		expect(failed?.failureCode).toBe("dispatch_failed");
		expect(JSON.stringify(failed)).not.toContain("PRIVATE_PROVIDER_TOKEN");
		const retry = await requestPublication(config, dispatch, new Date(instant.getTime() + 120_000));
		expect(retry.revision).not.toBe(failed?.revision);
	});

	it("enforces the UTC daily quota and resets it without deleting retained revisions", async () => {
		for (let index = 0; index < 20; index++) {
			await db.update(block).set({ config: JSON.stringify({ body: `Public revision ${index}` }) });
			await requestPublication(config, dispatch, new Date(instant.getTime() + index * 60_000));
		}
		await db.update(block).set({ config: '{"body":"Next public revision"}' });
		await expect(
			requestPublication(config, dispatch, new Date(instant.getTime() + 20 * 60_000)),
		).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
		expect(await db.select().from(publicationRevision)).toHaveLength(20);
		await requestPublication(config, dispatch, new Date(instant.getTime() + 86_400_000));
		expect((await db.select().from(publicationState))[0]?.requestsToday).toBe(1);
		expect(await db.select().from(publicationRevision)).toHaveLength(21);
	});

	it("stops at 100 retained revisions without pruning last-good or older sources", async () => {
		const first = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(first.revision)));
		await complete(first.revision, "runner-1", instant.getTime());
		for (let index = 1; index < 100; index++) {
			await db.update(block).set({ config: JSON.stringify({ body: `Public revision ${index}` }) });
			const time = instant.getTime() + Math.floor(index / 20) * 86_400_000 + (index % 20) * 60_000;
			await requestPublication(config, dispatch, new Date(time));
		}
		await db.update(block).set({ config: '{"body":"Over retained limit"}' });
		await expect(
			requestPublication(config, dispatch, new Date(instant.getTime() + 5 * 86_400_000)),
		).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		expect(await db.select().from(publicationRevision)).toHaveLength(100);
		expect((await db.select().from(publicationState))[0]?.lastGoodRevision).toBe(first.revision);
	});

	it("rejects oversized public sources before storing or dispatching them", async () => {
		await db.insert(block).values(
			Array.from({ length: 499 }, (_, position) => ({
				id: `large-${position}`,
				type: "text" as const,
				position: position + 1,
				config: JSON.stringify({ body: "x".repeat(2000) }),
			})),
		);
		await expect(requestPublication(config, dispatch, instant)).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		expect(await db.select().from(publicationRevision)).toHaveLength(0);
		expect(dispatch).not.toHaveBeenCalled();
	});
});

describe("credentialed runner conditional SQL", () => {
	it("allows one runner to claim and blocks stale, wrong-target and wrong-source claims", async () => {
		const requested = await requestPublication(config, dispatch, instant);
		expect(
			(
				await execute(
					claimPublicationStatement({ ...claim(requested.revision), targetId: "wrong-target" }),
				)
			).rows,
		).toHaveLength(0);
		expect(
			(
				await execute(
					claimPublicationStatement({
						...claim(requested.revision),
						rendererSourceId: "wrong-source",
					}),
				)
			).rows,
		).toHaveLength(0);
		const claims = await Promise.all([
			execute(claimPublicationStatement(claim(requested.revision, "runner-1"))),
			execute(claimPublicationStatement(claim(requested.revision, "runner-2"))),
		]);
		expect(claims.map((result) => result.rows.length).sort()).toEqual([0, 1]);
	});

	it("publishes only after verification receipt, keeps last-good on stale completion, and retains rollback metadata", async () => {
		const first = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(first.revision)));
		await complete(first.revision, "runner-1", instant.getTime());
		let state = (await db.select().from(publicationState))[0];
		expect(state?.lastGoodRevision).toBe(first.revision);
		const published = (await db.select().from(publicationRevision))[0];
		expect(published).toMatchObject({
			status: "published",
			deploymentId: `deployment-${first.revision}`,
			providerVersionId: `version-${first.revision}`,
		});
		expect(JSON.parse(published!.artifactManifestJson!).files).toHaveLength(1);
		const otherTarget = createPublicationRouter({
			configuration: () => ({
				...config,
				targetId: "different-target",
				publicOrigin: "https://other-public.example",
			}),
			dispatch,
		}).createCaller(adminContext);
		expect(await otherTarget.status()).toMatchObject({
			liveVerified: false,
			lastGood: { revision: first.revision },
		});
		await db.update(block).set({ config: '{"body":"Second"}' });
		const second = await requestPublication(config, dispatch, new Date(instant.getTime() + 60_000));
		await execute(
			claimPublicationStatement(claim(second.revision, "runner-2", instant.getTime() + 60_000)),
		);
		await db.update(block).set({ config: '{"body":"Third"}' });
		const third = await requestPublication(config, dispatch, new Date(instant.getTime() + 120_000));
		expect(
			(
				await execute(
					currentPublicationStatement(
						claim(second.revision, "runner-2", instant.getTime() + 120_000),
					),
				)
			).rows,
		).toHaveLength(0);
		await complete(second.revision, "runner-2", instant.getTime() + 120_000);
		state = (await db.select().from(publicationState))[0];
		expect(state).toMatchObject({
			currentRevision: third.revision,
			lastGoodRevision: first.revision,
		});
	});

	it("treats last-good as historical while a different revision is actively publishing", async () => {
		const first = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(first.revision)));
		await complete(first.revision, "runner-1", instant.getTime() + 1);
		await db.update(block).set({ config: '{"body":"Candidate"}' });
		const second = await requestPublication(config, dispatch, new Date(instant.getTime() + 60_000));
		expect(await admin.status()).toMatchObject({
			liveVerified: true,
			current: { revision: second.revision, status: "draft" },
			lastGood: { revision: first.revision },
		});
		await execute(
			claimPublicationStatement(claim(second.revision, "runner-2", instant.getTime() + 60_000)),
		);
		expect(await admin.status()).toMatchObject({
			liveVerified: false,
			recoveryRequired: false,
			current: { revision: second.revision, status: "publishing" },
			lastGood: { revision: first.revision },
		});
	});

	it("retains verified last-good metadata after a failed candidate with verified rollback", async () => {
		const first = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(first.revision)));
		await complete(first.revision, "runner-1", instant.getTime() + 1);
		await db.update(block).set({ config: '{"body":"Candidate"}' });
		const second = await requestPublication(config, dispatch, new Date(instant.getTime() + 60_000));
		await execute(
			claimPublicationStatement(claim(second.revision, "runner-2", instant.getTime() + 60_000)),
		);
		// The runner writes this terminal code only after rollback verification;
		// ambiguous rollback instead latches recoveryRequired (covered separately).
		await execute(
			failPublicationStatement({
				revision: second.revision,
				runnerId: "runner-2",
				code: "verification_failed",
				now: instant.getTime() + 60_001,
			}),
		);
		expect(await admin.status()).toMatchObject({
			liveVerified: true,
			recoveryRequired: false,
			current: { revision: second.revision, status: "failed", failureCode: "verification_failed" },
			lastGood: { revision: first.revision },
		});
	});

	it("makes source fields immutable and rejects activation after the captured visibility boundary", async () => {
		await db.insert(block).values({
			id: "soon",
			type: "text",
			position: 1,
			scheduledStart: new Date(instant.getTime() + 30_000),
			config: '{"body":"Not yet"}',
		});
		const requested = await requestPublication(config, dispatch, instant);
		await expect(
			db
				.update(publicationRevision)
				.set({ snapshotJson: "{}" })
				.where(eq(publicationRevision.revision, requested.revision)),
		).rejects.toThrow();
		await expect(
			db
				.update(publicationRevision)
				.set({ sourceDigest: "0".repeat(64) })
				.where(eq(publicationRevision.revision, requested.revision)),
		).rejects.toThrow();
		expect(
			(
				await execute(
					claimPublicationStatement(
						claim(requested.revision, "runner", instant.getTime() + 30_000),
					),
				)
			).rows,
		).toHaveLength(0);
	});

	it("treats failed recovery as site-wide even for a stale job, with no claim of verified live state", async () => {
		const first = await requestPublication(config, dispatch, instant);
		await execute(claimPublicationStatement(claim(first.revision)));
		await db.update(block).set({ config: '{"body":"Second"}' });
		const second = await requestPublication(config, dispatch, new Date(instant.getTime() + 60_000));
		await execute(
			failPublicationStatement({
				revision: first.revision,
				runnerId: "runner-1",
				code: "recovery_required",
				now: instant.getTime() + 60_000,
			}),
		);
		expect((await db.select().from(publicationState))[0]).toMatchObject({
			recoveryRequired: true,
			recoveryRevision: first.revision,
			currentRevision: second.revision,
		});
		expect(
			(
				await execute(
					claimPublicationStatement(claim(second.revision, "runner-2", instant.getTime() + 60_000)),
				)
			).rows,
		).toHaveLength(0);
		await expect(
			requestPublication(config, dispatch, new Date(instant.getTime() + 120_000)),
		).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		expect(await admin.status()).toMatchObject({
			recoveryRequired: true,
			liveVerified: false,
			available: false,
			status: "failed",
		});
	});
});
