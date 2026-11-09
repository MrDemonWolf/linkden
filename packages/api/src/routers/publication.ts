import { db } from "@linkden/db";
import {
	block,
	publicationRevision,
	publicationState,
	socialNetwork,
	user,
} from "@linkden/db/schema/index";
import { MAX_BLOCKS } from "@linkden/validators/blocks";
import { PUBLIC_PAGE_SETTING_KEYS } from "@linkden/validators/public-settings";
import {
	approvedPublicationSourceDigest,
	approvedPublicationSourceSchema,
	createApprovedPublicationSource,
	MAX_PUBLIC_SNAPSHOT_BYTES,
	MAX_PUBLICATION_REVISIONS,
	PUBLICATION_DAILY_LIMIT,
	PUBLICATION_MIN_INTERVAL_MS,
	PUBLICATION_QUEUE_TIMEOUT_MS,
	PUBLICATION_SCHEDULE_INTERVAL_MS,
	PublicationArtifactError,
	type PublicationConfiguration,
	type PublicationJobReference,
	publicationIdentitySchema,
	publicationSourceDigest,
	snapshotFromApprovedSource,
} from "@linkden/validators/publication";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { settingsQuery, toSettingsMap } from "../utils/settings";

export type {
	PublicationConfiguration,
	PublicationJobReference,
} from "@linkden/validators/publication";
export type PublicationDispatch = (job: PublicationJobReference) => Promise<void>;
export interface PublicationDependencies {
	configuration: () => PublicationConfiguration;
	dispatch?: PublicationDispatch;
}

const disabled: PublicationConfiguration = {
	enabled: false,
	unavailableReason: "An approved publication target and runner have not been enabled",
};
const enabledConfigurationSchema = publicationIdentitySchema.extend({
	enabled: z.literal(true),
	schedulerEnabled: z.boolean().optional().default(false),
	publicOrigin: z.url({ protocol: /^https?$/ }).refine((value) => {
		const url = new URL(value);
		return !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
	}),
});
const requestInputSchema = z
	.object({
		expectedSourceDigest: z
			.string()
			.regex(/^[a-f0-9]{64}$/)
			.optional(),
		expectedApprovalDigest: z
			.string()
			.regex(/^[a-f0-9]{64}$/)
			.optional(),
	})
	.strict();

const metadataFields = {
	revision: publicationRevision.revision,
	sourceDigest: publicationRevision.sourceDigest,
	approvedSourceDigest: publicationRevision.approvedSourceDigest,
	approvalRevision: publicationRevision.approvalRevision,
	requestKind: publicationRevision.requestKind,
	targetId: publicationRevision.targetId,
	rendererSourceId: publicationRevision.rendererSourceId,
	publicOrigin: publicationRevision.publicOrigin,
	status: publicationRevision.status,
	createdAt: publicationRevision.createdAt,
	startedAt: publicationRevision.startedAt,
	finishedAt: publicationRevision.finishedAt,
	nextVisibilityBoundary: publicationRevision.nextVisibilityBoundary,
	artifactDigest: publicationRevision.artifactDigest,
	deploymentId: publicationRevision.deploymentId,
	providerVersionId: publicationRevision.providerVersionId,
	failureCode: publicationRevision.failureCode,
};

async function head() {
	const [state] = await db.select().from(publicationState).where(eq(publicationState.id, "site"));
	const revisions = state
		? await db
				.select(metadataFields)
				.from(publicationRevision)
				.where(
					sql`${publicationRevision.revision} in (${state.currentRevision}, ${state.lastGoodRevision})`,
				)
		: [];
	return {
		state,
		current: revisions.find((row) => row.revision === state?.currentRevision) ?? null,
		lastGood: revisions.find((row) => row.revision === state?.lastGoodRevision) ?? null,
	};
}

async function freezeSource(config: z.infer<typeof enabledConfigurationSchema>, now: Date) {
	const [profiles, blocks, socials, settings] = await db.batch([
		db.select({ name: user.name, image: user.image }).from(user).limit(1),
		db
			.select()
			.from(block)
			.where(and(eq(block.isEnabled, true), eq(block.status, "published")))
			.orderBy(asc(block.position), asc(block.createdAt), asc(block.id))
			.limit(MAX_BLOCKS + 1),
		db
			.select()
			.from(socialNetwork)
			.where(eq(socialNetwork.isActive, true))
			.orderBy(asc(socialNetwork.addedAt), asc(socialNetwork.slug))
			.limit(201),
		settingsQuery(PUBLIC_PAGE_SETTING_KEYS),
	]);
	const profile = profiles[0];
	if (!profile)
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Create the profile before publishing",
		});
	const values = toSettingsMap(settings);
	try {
		const approvedSource = createApprovedPublicationSource({
			revision: crypto.randomUUID(),
			publicOrigin: config.publicOrigin,
			builtAt: now.toISOString(),
			profile: {
				name: values.profile_name || profile.name,
				image: values.avatar_url || profile.image,
				bio: values.bio || null,
				isVerified: values.verified_badge === "true",
			},
			settings: values,
			blocks,
			socialNetworks: socials,
		});
		const snapshot = snapshotFromApprovedSource(
			approvedSource,
			crypto.randomUUID(),
			now.toISOString(),
		);
		const snapshotJson = JSON.stringify(snapshot);
		if (new TextEncoder().encode(snapshotJson).byteLength > MAX_PUBLIC_SNAPSHOT_BYTES)
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "The public snapshot exceeds 1 MB. Reduce public content before publishing.",
			});
		return {
			snapshot,
			snapshotJson,
			approvedSourceJson: JSON.stringify(approvedSource),
			approvedSourceDigest: await approvedPublicationSourceDigest(approvedSource, {
				targetId: config.targetId,
				rendererSourceId: config.rendererSourceId,
			}),
			sourceDigest: await publicationSourceDigest(snapshot, {
				targetId: config.targetId,
				rendererSourceId: config.rendererSourceId,
			}),
		};
	} catch (error) {
		if (error instanceof TRPCError) throw error;
		if (error instanceof PublicationArtifactError)
			throw new TRPCError({ code: "PRECONDITION_FAILED", message: error.message });
		if (
			error instanceof z.ZodError &&
			error.issues.some((issue) => issue.message === "Approved publication source exceeds 1 MB")
		)
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"The approved publication source exceeds 1 MB. Reduce public content before publishing.",
			});
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Public content failed publication validation. Review the profile and blocks.",
		});
	}
}

function configured(value: PublicationConfiguration) {
	if (!value.enabled)
		throw new TRPCError({ code: "PRECONDITION_FAILED", message: value.unavailableReason });
	const parsed = enabledConfigurationSchema.safeParse(value);
	if (!parsed.success)
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Publication configuration is invalid",
		});
	return parsed.data;
}

function isGuardError(error: unknown, marker: string): boolean {
	return (
		error instanceof Error && (error.message.includes(marker) || isGuardError(error.cause, marker))
	);
}

function sameSource(
	current: Awaited<ReturnType<typeof head>>["current"],
	digest: string,
	now: Date,
): current is NonNullable<Awaited<ReturnType<typeof head>>["current"]> {
	return (
		!!current &&
		current.sourceDigest === digest &&
		current.status !== "failed" &&
		(current.status !== "draft" ||
			now.getTime() < current.createdAt.getTime() + PUBLICATION_QUEUE_TIMEOUT_MS) &&
		(current.status === "published" ||
			!current.nextVisibilityBoundary ||
			current.nextVisibilityBoundary > now)
	);
}

/** Internal caller is also reusable by a later controlled scheduler; no unauthenticated HTTP endpoint. */
export async function requestPublication(
	configuration: PublicationConfiguration,
	dispatch: PublicationDispatch | undefined,
	now = new Date(),
	expectedSourceDigest?: string,
	expectedApprovalDigest?: string,
) {
	const config = configured(configuration);
	if (!dispatch)
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Publication runner is unavailable",
		});
	let before: Awaited<ReturnType<typeof head>>;
	try {
		before = await head();
	} catch {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Publication storage is unavailable. Check publication migrations and database health before enabling the target.",
		});
	}
	if (before.state?.recoveryRequired)
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Publication recovery is required. Verify the remote live version before publishing again.",
		});
	const source = await freezeSource(config, now);
	if (expectedSourceDigest && expectedSourceDigest !== source.sourceDigest)
		throw new TRPCError({
			code: "CONFLICT",
			message: "Public content changed. Review it before publishing.",
		});
	if (expectedApprovalDigest && expectedApprovalDigest !== source.approvedSourceDigest)
		throw new TRPCError({
			code: "CONFLICT",
			message: "Approved content changed. Review it before publishing.",
		});
	if (
		sameSource(before.current, source.sourceDigest, now) &&
		before.current.approvedSourceDigest === source.approvedSourceDigest
	) {
		const [updated] = await db
			.update(publicationState)
			.set({
				nextVisibilityBoundary: source.snapshot.nextVisibilityBoundary
					? new Date(source.snapshot.nextVisibilityBoundary)
					: null,
			})
			.where(
				and(
					eq(publicationState.id, "site"),
					eq(publicationState.currentRevision, before.current.revision),
					eq(publicationState.recoveryRequired, false),
				),
			)
			.returning({ revision: publicationState.currentRevision });
		if (!updated)
			throw new TRPCError({
				code: "CONFLICT",
				message: "Publication state changed. Review it before retrying.",
			});
		return { ...before.current, deduplicated: true, dispatched: false };
	}
	try {
		await db.insert(publicationRevision).values({
			revision: source.snapshot.revision,
			sourceDigest: source.sourceDigest,
			targetId: config.targetId,
			rendererSourceId: config.rendererSourceId,
			publicOrigin: source.snapshot.publicOrigin,
			snapshotJson: source.snapshotJson,
			approvedSourceJson: source.approvedSourceJson,
			approvedSourceDigest: source.approvedSourceDigest,
			approvalRevision: source.snapshot.revision,
			requestKind: "manual",
			nextVisibilityBoundary: source.snapshot.nextVisibilityBoundary
				? new Date(source.snapshot.nextVisibilityBoundary)
				: null,
			createdAt: now,
		});
	} catch (error) {
		const latest = await head();
		if (
			!latest.state?.recoveryRequired &&
			sameSource(latest.current, source.sourceDigest, now) &&
			latest.current.approvedSourceDigest === source.approvedSourceDigest
		)
			return { ...latest.current, deduplicated: true, dispatched: false };
		if (isGuardError(error, "publication_recovery_required"))
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "Publication recovery is required before another request",
			});
		if (isGuardError(error, "publication_revision_limit"))
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					"100 publication revisions are retained. Review and archive them before requesting more; none were deleted.",
			});
		if (isGuardError(error, "publication_request_limit"))
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message: "Wait one minute between new publications; at most 20 are accepted per UTC day.",
			});
		throw error;
	}
	const job: PublicationJobReference = {
		revision: source.snapshot.revision,
		sourceDigest: source.sourceDigest,
		targetId: config.targetId,
		rendererSourceId: config.rendererSourceId,
	};
	try {
		await dispatch(job);
	} catch {
		// A dispatch timeout might arrive after CI claimed it. Do not fail a claimed run.
		await db
			.update(publicationRevision)
			.set({ status: "failed", failureCode: "dispatch_failed", finishedAt: new Date() })
			.where(
				and(
					eq(publicationRevision.revision, job.revision),
					eq(publicationRevision.status, "draft"),
				),
			);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message:
				"Publication dispatch could not be confirmed. Check publication status before retrying.",
		});
	}
	const [row] = await db
		.select(metadataFields)
		.from(publicationRevision)
		.where(eq(publicationRevision.revision, job.revision));
	if (!row)
		throw new TRPCError({
			code: "CONFLICT",
			message: "Publication state changed before dispatch completed",
		});
	return { ...row, deduplicated: false, dispatched: true };
}

export function createPublicationRouter(
	dependencies: PublicationDependencies = { configuration: () => disabled },
) {
	return router({
		status: protectedProcedure.query(async () => {
			const configuration = dependencies.configuration();
			const unavailable = (reason: string) => ({
				status: "draft" as const,
				available: false,
				unavailableReason: reason,
				sourceDigest: null,
				approvalDigest: null,
				hasUnpublishedChanges: null,
				current: null,
				lastGood: null,
				liveVerified: false,
				recoveryRequired: false,
				nextVisibilityBoundary: null,
				scheduler: {
					configured: false,
					cadenceMinutes: 5,
					approvalAvailable: false,
					overdue: false,
					lastAttemptAt: null,
					failureCode: null,
				},
				limits: {
					minIntervalMs: PUBLICATION_MIN_INTERVAL_MS,
					dailyRequests: PUBLICATION_DAILY_LIMIT,
					retainedRevisions: MAX_PUBLICATION_REVISIONS,
					snapshotBytes: MAX_PUBLIC_SNAPSHOT_BYTES,
				},
			});
			// Optional publication tables are not required just to run the editor.
			if (!configuration.enabled) return unavailable(configuration.unavailableReason);
			const validatedConfiguration = enabledConfigurationSchema.safeParse(configuration);
			if (!validatedConfiguration.success)
				return unavailable("Publication configuration is invalid");
			if (!dependencies.dispatch) return unavailable("Publication runner is unavailable");
			let current: Awaited<ReturnType<typeof head>>;
			try {
				current = await head();
			} catch {
				return unavailable(
					"Publication storage is unavailable. Check publication migrations and database health before enabling the target.",
				);
			}
			let sourceDigest: string | null = null;
			let approvalDigest: string | null = null;
			let unavailableReason: string | null = null;
			if (configuration.enabled) {
				try {
					const source = await freezeSource(configured(configuration), new Date());
					sourceDigest = source.sourceDigest;
					approvalDigest = source.approvedSourceDigest;
				} catch (error) {
					unavailableReason =
						error instanceof TRPCError ? error.message : "Publication source is unavailable";
				}
			}
			if (current.state?.recoveryRequired)
				unavailableReason = "Publication recovery is required; live state has not been verified";
			const hasUnpublishedChanges = sourceDigest
				? current.current?.approvedSourceDigest
					? approvalDigest !== current.current.approvedSourceDigest
					: sourceDigest !== current.current?.sourceDigest
				: null;
			const now = Date.now();
			const overdue =
				(!!current.state?.nextVisibilityBoundary &&
					current.state.nextVisibilityBoundary.getTime() <= now) ||
				(!!current.lastGood?.nextVisibilityBoundary &&
					current.lastGood.nextVisibilityBoundary.getTime() <= now &&
					current.lastGood.sourceDigest !== current.current?.sourceDigest);
			const target = enabledConfigurationSchema.safeParse(configuration);
			const lastGoodMatchesTarget =
				target.success &&
				current.lastGood?.targetId === target.data.targetId &&
				current.lastGood.publicOrigin === new URL(target.data.publicOrigin).origin;
			const activationPending =
				current.current?.status === "publishing" &&
				current.current.revision !== current.lastGood?.revision;
			return {
				status:
					current.state?.recoveryRequired || current.current?.status === "failed"
						? ("failed" as const)
						: hasUnpublishedChanges || !sourceDigest
							? ("draft" as const)
							: (current.current?.status ?? "draft"),
				available: configuration.enabled && !!dependencies.dispatch && !unavailableReason,
				unavailableReason,
				sourceDigest,
				approvalDigest,
				hasUnpublishedChanges,
				current: current.current,
				lastGood: current.lastGood,
				liveVerified:
					!!lastGoodMatchesTarget && !activationPending && !current.state?.recoveryRequired,
				recoveryRequired: current.state?.recoveryRequired ?? false,
				nextVisibilityBoundary: current.state?.nextVisibilityBoundary ?? null,
				scheduler: {
					configured: configuration.enabled && configuration.schedulerEnabled === true,
					cadenceMinutes: 5,
					approvalAvailable: !!current.state?.approvalRevision,
					overdue,
					lastAttemptAt: current.state?.lastScheduleAttemptAt ?? null,
					failureCode:
						current.state?.scheduleFailureCode ??
						(current.current?.status === "failed" ? current.current.failureCode : null),
				},
				limits: {
					minIntervalMs: PUBLICATION_MIN_INTERVAL_MS,
					dailyRequests: PUBLICATION_DAILY_LIMIT,
					retainedRevisions: MAX_PUBLICATION_REVISIONS,
					snapshotBytes: MAX_PUBLIC_SNAPSHOT_BYTES,
				},
			};
		}),
		request: protectedProcedure
			.input(requestInputSchema.optional())
			.mutation(({ input }) =>
				requestPublication(
					dependencies.configuration(),
					dependencies.dispatch,
					new Date(),
					input?.expectedSourceDigest,
					input?.expectedApprovalDigest,
				),
			),
	});
}

/** Five-minute opt-in dispatcher. No authoring table is read anywhere in this path. */
export async function runScheduledPublication(
	configuration: PublicationConfiguration,
	dispatch: PublicationDispatch | undefined,
	now = new Date(),
) {
	if (!configuration.enabled || !configuration.schedulerEnabled || !dispatch)
		return { status: "disabled" as const };
	const config = configured(configuration);
	const before = await head();
	const state = before.state;
	if (
		!state?.approvalRevision ||
		!state.nextVisibilityBoundary ||
		state.nextVisibilityBoundary > now
	)
		return { status: "idle" as const };
	if (state.recoveryRequired || before.current?.status === "failed")
		return { status: "failed" as const };
	// Never supersede an active runner whose remote activation may be in flight.
	if (before.current?.status === "publishing") return { status: "pending" as const };
	const [attempt] = await db
		.update(publicationState)
		.set({
			lastScheduleAttemptAt: now,
			scheduleFailureCode: null,
		})
		.where(
			and(
				eq(publicationState.id, "site"),
				eq(publicationState.approvalRevision, state.approvalRevision),
				eq(publicationState.generation, state.generation),
				eq(publicationState.recoveryRequired, false),
				sql`(${publicationState.lastScheduleAttemptAt} IS NULL OR ${publicationState.lastScheduleAttemptAt} <= ${new Date(now.getTime() - PUBLICATION_SCHEDULE_INTERVAL_MS)})`,
			),
		)
		.returning({ id: publicationState.id });
	if (!attempt) return { status: "pending" as const };
	let failureCode = "source_unavailable";
	try {
		const [approval] = await db
			.select()
			.from(publicationRevision)
			.where(eq(publicationRevision.revision, state.approvalRevision));
		if (!approval?.approvedSourceJson || !approval.approvedSourceDigest)
			throw new Error("Approved source unavailable");
		if (
			approval.targetId !== config.targetId ||
			approval.rendererSourceId !== config.rendererSourceId ||
			approval.publicOrigin !== new URL(config.publicOrigin).origin
		) {
			failureCode = "configuration_changed";
			throw new Error("Approval target changed");
		}
		const approved = approvedPublicationSourceSchema.parse(JSON.parse(approval.approvedSourceJson));
		const identity = { targetId: config.targetId, rendererSourceId: config.rendererSourceId };
		if (
			(await approvedPublicationSourceDigest(approved, identity)) !== approval.approvedSourceDigest
		)
			throw new Error("Approval digest mismatch");
		const snapshot = snapshotFromApprovedSource(approved, crypto.randomUUID(), now.toISOString());
		const sourceDigest = await publicationSourceDigest(snapshot, identity);
		if (sameSource(before.current, sourceDigest, now)) {
			const [updated] = await db
				.update(publicationState)
				.set({
					nextVisibilityBoundary: snapshot.nextVisibilityBoundary
						? new Date(snapshot.nextVisibilityBoundary)
						: null,
				})
				.where(
					and(
						eq(publicationState.id, "site"),
						eq(publicationState.approvalRevision, state.approvalRevision),
						eq(publicationState.generation, state.generation),
					),
				)
				.returning({ id: publicationState.id });
			return { status: updated ? ("unchanged" as const) : ("superseded" as const) };
		}
		const snapshotJson = JSON.stringify(snapshot);
		if (new TextEncoder().encode(snapshotJson).byteLength > MAX_PUBLIC_SNAPSHOT_BYTES)
			throw new Error("Scheduled public snapshot exceeds its size limit");
		failureCode = "request_failed";
		await db.insert(publicationRevision).values({
			revision: snapshot.revision,
			sourceDigest,
			targetId: config.targetId,
			rendererSourceId: config.rendererSourceId,
			publicOrigin: snapshot.publicOrigin,
			snapshotJson,
			approvedSourceDigest: approval.approvedSourceDigest,
			approvalRevision: approval.revision,
			requestKind: "scheduled",
			parentGeneration: state.generation,
			nextVisibilityBoundary: snapshot.nextVisibilityBoundary
				? new Date(snapshot.nextVisibilityBoundary)
				: null,
			createdAt: now,
		});
		const job = {
			revision: snapshot.revision,
			sourceDigest,
			targetId: config.targetId,
			rendererSourceId: config.rendererSourceId,
		};
		try {
			await dispatch(job);
		} catch {
			const failed = await db
				.update(publicationRevision)
				.set({ status: "failed", failureCode: "dispatch_failed", finishedAt: now })
				.where(
					and(
						eq(publicationRevision.revision, job.revision),
						eq(publicationRevision.status, "draft"),
					),
				)
				.returning({ revision: publicationRevision.revision });
			return { status: failed.length ? ("failed" as const) : ("pending" as const) };
		}
		return { status: "dispatched" as const, revision: job.revision };
	} catch (error) {
		if (isGuardError(error, "publication_approval_superseded"))
			return { status: "superseded" as const };
		if (
			isGuardError(error, "publication_request_limit") ||
			isGuardError(error, "publication_revision_limit")
		)
			failureCode = "request_limit";
		await db
			.update(publicationState)
			.set({ scheduleFailureCode: failureCode })
			.where(
				and(
					eq(publicationState.id, "site"),
					eq(publicationState.approvalRevision, state.approvalRevision),
					eq(publicationState.generation, state.generation),
				),
			);
		return { status: "failed" as const };
	}
}
