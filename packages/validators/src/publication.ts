import { z } from "zod";
import {
	blockImportSchema,
	blockTypeSchema,
	embedTypeSchema,
	hexColorSchema,
	httpUrlSchema,
	MAX_BLOCK_CONFIG_LENGTH,
	MAX_BLOCKS,
	parseBlockConfig,
	validateBlockImport,
} from "./blocks";
import { consentCategoriesSchema } from "./consent-schema";
import { UPLOADED_IMAGE_PATH } from "./primitives";
import { PUBLIC_PAGE_SETTING_KEYS } from "./public-settings";
import { getSettingMeta, MAX_SETTING_VALUE_LENGTH } from "./settings-registry";
import { vcardDataSchema } from "./vcard";

export class PublicationArtifactError extends Error {}

export const MAX_PUBLIC_SNAPSHOT_BYTES = 1_000_000;
export const PUBLICATION_MIN_INTERVAL_MS = 60_000;
export const PUBLICATION_QUEUE_TIMEOUT_MS = 15 * 60_000;
export const PUBLICATION_SCHEDULE_INTERVAL_MS = 5 * 60_000;
export const MAX_APPROVED_PUBLICATION_BYTES = 1_000_000;
export const PUBLICATION_DAILY_LIMIT = 20;
export const MAX_PUBLICATION_REVISIONS = 100;
export const MAX_PUBLIC_ARTIFACT_MANIFEST_BYTES = 256 * 1024;

export const publicationIdentitySchema = z
	.object({
		targetId: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/),
		rendererSourceId: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/),
	})
	.strict();
export type PublicationIdentity = z.infer<typeof publicationIdentitySchema>;

export type PublicationConfiguration =
	| { enabled: false; unavailableReason: string }
	| (PublicationIdentity & { enabled: true; publicOrigin: string; schedulerEnabled?: boolean });

export interface PublicationJobReference extends PublicationIdentity {
	revision: string;
	sourceDigest: string;
}

export const publicationRunnerClaimSchema = publicationIdentitySchema.extend({
	revision: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
	runnerId: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/),
	now: z.number().int().nonnegative(),
});
export type PublicationRunnerClaim = z.infer<typeof publicationRunnerClaimSchema>;

export const PUBLICATION_FAILURE_CODES = [
	"dispatch_failed",
	"build_failed",
	"verification_failed",
	"deployment_failed",
	"recovery_required",
	"stale_request",
	"boundary_expired",
	"runner_failed",
] as const;
export type PublicationFailureCode = (typeof PUBLICATION_FAILURE_CODES)[number];
export const publicationFailureSchema = publicationRunnerClaimSchema
	.pick({ revision: true, runnerId: true, now: true })
	.extend({
		runnerId: publicationRunnerClaimSchema.shape.runnerId.nullable(),
		code: z.enum(PUBLICATION_FAILURE_CODES),
	});

/** Compact rollback receipt, excluding diagnostics, provider payloads and remote credentials. */
export const publicationArtifactManifestSchema = z
	.object({
		schemaVersion: z.literal(1),
		revision: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
		files: z
			.array(
				z
					.object({
						path: z
							.string()
							.max(240)
							.regex(/^[A-Za-z0-9_./-]+$/)
							.refine((path) =>
								path.split("/").every((part) => part !== "" && part !== "." && part !== ".."),
							),
						sha256: z.string().regex(/^[a-f0-9]{64}$/),
					})
					.strict(),
			)
			.min(1)
			.max(2000),
	})
	.strict()
	.refine(
		(manifest) => new Set(manifest.files.map((file) => file.path)).size === manifest.files.length,
		"Duplicate artifact paths",
	);

export function publicationArtifactManifestJson(raw: unknown): string {
	const manifest = publicationArtifactManifestSchema.parse(raw);
	manifest.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
	const json = JSON.stringify(manifest);
	if (new TextEncoder().encode(json).byteLength > MAX_PUBLIC_ARTIFACT_MANIFEST_BYTES)
		throw new PublicationArtifactError("The public artifact manifest exceeds 256 KiB");
	return json;
}

export const publicationCompletionSchema = publicationRunnerClaimSchema
	.extend({
		artifactDigest: z.string().regex(/^[a-f0-9]{64}$/),
		deploymentId: z.string().regex(/^[A-Za-z0-9._:-]{1,200}$/),
		providerVersionId: z.string().regex(/^[A-Za-z0-9._:-]{1,200}$/),
		artifactManifestJson: z.string().max(MAX_PUBLIC_ARTIFACT_MANIFEST_BYTES),
	})
	.superRefine((receipt, ctx) => {
		try {
			const parsed = publicationArtifactManifestSchema.parse(
				JSON.parse(receipt.artifactManifestJson),
			);
			if (
				parsed.revision !== receipt.revision ||
				publicationArtifactManifestJson(parsed) !== receipt.artifactManifestJson
			)
				throw new Error("Non-canonical manifest");
		} catch {
			ctx.addIssue({ code: "custom", message: "Invalid canonical artifact manifest" });
		}
	});

const publicationUrlSchema = z
	.string()
	.max(2048)
	.refine((value) => {
		if (/[\s\p{Cc}\\]/u.test(value)) return false;
		try {
			const url = new URL(value);
			return (
				/^https?:\/\//i.test(value) &&
				/^https?:$/.test(url.protocol) &&
				!url.username &&
				!url.password &&
				!/^https?:\/\/[^/?#]*@/i.test(value)
			);
		} catch {
			return false;
		}
	}, "Enter an HTTP or HTTPS URL without credentials");

/** Frozen profile fields: every image is an absolute URL. */
const publicProfileSchema = z.object({
	name: z.string().min(1).max(200),
	image: publicationUrlSchema.nullable(),
	bio: z.string().max(2_000).nullable(),
	isVerified: z.boolean(),
});

/**
 * Uploads are stored as origin-relative `/api/images/…` paths. The frozen
 * snapshot names them on its public origin, so the media bundler treats them
 * as owned uploads and the static renderer never sees a relative image URL.
 */
function absoluteUpload(value: string, origin: URL): string {
	return UPLOADED_IMAGE_PATH.test(value) ? `${origin.origin}${value}` : value;
}

export const publicationInputSchema = z.object({
	revision: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
	publicOrigin: z.url({ protocol: /^https?$/ }),
	builtAt: z.iso.datetime(),
	profile: publicProfileSchema.extend({
		image: z.union([publicationUrlSchema, z.string().regex(UPLOADED_IMAGE_PATH)]).nullable(),
	}),
	settings: z.record(z.string(), z.string().max(MAX_SETTING_VALUE_LENGTH)),
	blocks: z.array(blockImportSchema).max(MAX_BLOCKS),
	socialNetworks: z
		.array(
			z.object({
				slug: z.string().min(1).max(100),
				url: publicationUrlSchema,
				isActive: z.boolean(),
			}),
		)
		.max(200),
});

export type PublicationInput = z.infer<typeof publicationInputSchema>;

function originFrom(value: string): URL {
	publicationUrlSchema.parse(value);
	const origin = new URL(value);
	if (
		origin.username ||
		origin.password ||
		origin.pathname !== "/" ||
		origin.search ||
		origin.hash
	) {
		throw new PublicationArtifactError(
			"Public origin must be a bare HTTP(S) origin without credentials.",
		);
	}
	return origin;
}

const publicThemeSchema = z
	.object({
		preset: z.string().max(100).optional(),
		customColors: z
			.object({
				primary: hexColorSchema.optional(),
				secondary: hexColorSchema.optional(),
				accent: hexColorSchema.optional(),
				background: hexColorSchema.optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

function publicSettingValue(key: string, value: string): string {
	const meta = getSettingMeta(key);
	if (
		!meta ||
		meta.secret ||
		(meta.maxLength !== undefined && value.length > meta.maxLength) ||
		(meta.validate && !meta.validate(value))
	) {
		throw new PublicationArtifactError(`Public setting ${key} is invalid.`);
	}
	if (value && meta.kind === "url") publicationUrlSchema.parse(value);
	if (meta.kind === "boolean" && value !== "true" && value !== "false")
		throw new PublicationArtifactError(`Public setting ${key} is invalid.`);
	if (meta.kind === "enum" && value && !meta.values.includes(value))
		throw new PublicationArtifactError(`Public setting ${key} is invalid.`);
	if (meta.kind === "color" && value) hexColorSchema.parse(value);
	if (!value) return value;
	if (key === "theme") return JSON.stringify(publicThemeSchema.parse(JSON.parse(value)));
	if (key === "consent_categories")
		return JSON.stringify(consentCategoriesSchema.parse(JSON.parse(value)));
	if (key === "vcard_data") {
		const card = vcardDataSchema.parse(JSON.parse(value));
		return JSON.stringify({
			...card,
			urls: card.urls?.map((entry) => ({
				...entry,
				url: entry.url ? publicationUrlSchema.parse(entry.url) : "",
			})),
		});
	}
	return value;
}

function hiddenPublicSettingKeys(settings: Readonly<Record<string, string>>) {
	const hidden = new Set<string>();
	if (settings.vcard_enabled !== "true") hidden.add("vcard_data");
	for (const kind of ["pp", "tos"]) {
		hidden.add(`branding_${kind}_${settings[`branding_${kind}_mode`] === "text" ? "url" : "text"}`);
	}
	if (settings.banner_enabled !== "true" || settings.banner_mode !== "custom")
		hidden.add("banner_custom_url");
	if (settings.seo_og_mode === "template") hidden.add("seo_og_image");
	if (
		settings.contact_form_enabled !== "true" ||
		!settings.captcha_provider ||
		settings.captcha_provider === "none"
	)
		hidden.add("captcha_site_key");
	if (settings.consent_banner_enabled === "false") {
		for (const key of ["consent_banner_text", "consent_privacy_url", "consent_categories"])
			hidden.add(key);
	}
	return hidden;
}

const publicBlockSchema = z
	.object({
		id: z.string().min(1).max(64),
		type: blockTypeSchema,
		title: z.string().max(200).nullable(),
		url: httpUrlSchema.nullable(),
		icon: z.string().max(80).nullable(),
		embedType: embedTypeSchema.nullable(),
		embedUrl: httpUrlSchema.nullable(),
		position: z.number().int().nonnegative(),
		config: z.string().max(MAX_BLOCK_CONFIG_LENGTH),
	})
	.strict()
	.superRefine((row, ctx) => {
		const parsed = parseBlockConfig(row.type, row.config);
		if (!validateBlockImport({ ...row, isEnabled: true, status: "published" }) || !parsed.ok) {
			ctx.addIssue({ code: "custom", message: "Invalid public block" });
			return;
		}
		// The frozen representation contains only fields the block renderer accepts.
		// Reject extra JSON properties instead of preserving hidden draft payloads.
		if (JSON.stringify(JSON.parse(row.config)) !== JSON.stringify(parsed.data))
			ctx.addIssue({ code: "custom", message: "Block config is not the public projection" });
	});

/** Frozen public output, never raw settings, auth rows, schedules or draft flags. */
export const publicSnapshotSchema = z
	.object({
		schemaVersion: z.literal(1),
		revision: publicationInputSchema.shape.revision,
		publicOrigin: publicationInputSchema.shape.publicOrigin,
		builtAt: z.iso.datetime(),
		nextVisibilityBoundary: z.iso.datetime().nullable(),
		profile: publicProfileSchema.strict(),
		settings: z.record(z.string(), z.string().max(MAX_SETTING_VALUE_LENGTH)),
		blocks: z.array(publicBlockSchema).max(MAX_BLOCKS),
		socialNetworks: z
			.array(z.object({ slug: z.string().min(1).max(100), url: publicationUrlSchema }).strict())
			.max(200),
	})
	.strict()
	.superRefine((snapshot, ctx) => {
		try {
			originFrom(snapshot.publicOrigin);
			const publicKeys = new Set<string>(PUBLIC_PAGE_SETTING_KEYS);
			const hidden = hiddenPublicSettingKeys(snapshot.settings);
			for (const [key, value] of Object.entries(snapshot.settings)) {
				if (!publicKeys.has(key) || hidden.has(key))
					throw new PublicationArtifactError("Snapshot contains a non-public setting");
				if (publicSettingValue(key, value) !== value)
					throw new PublicationArtifactError("Snapshot setting is not the public projection");
			}
			const blockIds = new Set<string>();
			for (const row of snapshot.blocks) {
				if (blockIds.has(row.id)) throw new PublicationArtifactError("Duplicate public block");
				blockIds.add(row.id);
				if (
					(row.type === "connect" && snapshot.settings.contact_form_enabled !== "true") ||
					(row.type === "vcard" && snapshot.settings.vcard_enabled !== "true")
				)
					throw new PublicationArtifactError("Snapshot contains feature-hidden content");
				if (row.url) publicationUrlSchema.parse(row.url);
			}
			if (
				new Set(snapshot.socialNetworks.map((row) => row.slug)).size !==
				snapshot.socialNetworks.length
			)
				throw new PublicationArtifactError("Duplicate public social network");
		} catch {
			ctx.addIssue({ code: "custom", message: "Invalid frozen public snapshot" });
		}
	});

export type PublicSnapshot = z.infer<typeof publicSnapshotSchema>;

function canonicalValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalValue);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
				.map(([key, nested]) => [key, canonicalValue(nested)]),
		);
	}
	return value;
}

/** Identity includes the trusted renderer source; job IDs, clocks and scheduling are not content. */
export function publicationSourceJson(raw: PublicSnapshot, identity: PublicationIdentity): string {
	const {
		revision: _revision,
		builtAt: _builtAt,
		nextVisibilityBoundary: _boundary,
		...content
	} = publicSnapshotSchema.parse(raw);
	return JSON.stringify(canonicalValue({ ...publicationIdentitySchema.parse(identity), content }));
}

export async function publicationSourceDigest(
	snapshot: PublicSnapshot,
	identity: PublicationIdentity,
): Promise<string> {
	const bytes = new TextEncoder().encode(publicationSourceJson(snapshot, identity));
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Project raw authoring input onto public fields. The result is not deployable HTML. */
export function createPublicationSnapshot(raw: unknown) {
	const input = publicationInputSchema.parse(raw);
	const origin = originFrom(input.publicOrigin);
	const now = new Date(input.builtAt).getTime();
	// Saved alternatives are drafts until their feature or selected mode exposes them.
	const hiddenSettings = hiddenPublicSettingKeys(input.settings);
	const settings = Object.fromEntries(
		PUBLIC_PAGE_SETTING_KEYS.flatMap((key) =>
			!hiddenSettings.has(key) && Object.hasOwn(input.settings, key)
				? [
						[
							key,
							publicSettingValue(
								key,
								getSettingMeta(key)?.kind === "url"
									? absoluteUpload(input.settings[key]!, origin)
									: input.settings[key]!,
							),
						],
					]
				: [],
		),
	);
	const boundaries: number[] = [];
	const ids = new Set<string>();
	const blocks = input.blocks
		.toSorted(
			(a, b) =>
				a.position - b.position ||
				(a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) ||
				(a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
		)
		.flatMap((row) => {
			if (ids.has(row.id)) throw new PublicationArtifactError("Block IDs must be unique.");
			ids.add(row.id);
			if (!row.isEnabled || row.status !== "published") return [];
			const start = row.scheduledStart?.getTime();
			const end = row.scheduledEnd?.getTime();
			if (start !== undefined && start > now) boundaries.push(start);
			if (end !== undefined && end >= now) boundaries.push(end + 1);
			if ((start !== undefined && start > now) || (end !== undefined && end < now)) return [];
			if (row.type === "connect" && settings.contact_form_enabled !== "true") return [];
			if (row.type === "vcard" && settings.vcard_enabled !== "true") return [];
			const block = validateBlockImport(row);
			if (!block)
				throw new PublicationArtifactError(
					"A visible block is invalid; publication stopped without dropping content.",
				);
			const config = parseBlockConfig(block.type, block.config);
			if (!config.ok)
				throw new PublicationArtifactError("A visible block has invalid configuration.");
			if (block.type === "vcard") {
				const card = vcardDataSchema.parse(config.data);
				Object.assign(config.data, {
					urls: card.urls?.map((entry) => ({
						...entry,
						url: entry.url ? publicationUrlSchema.parse(entry.url) : "",
					})),
				});
			}
			if (
				block.type === "location" &&
				"customLinkUrl" in config.data &&
				config.data.customLinkUrl
			) {
				config.data.customLinkUrl = publicationUrlSchema.parse(config.data.customLinkUrl);
			}
			if (block.type === "image" && "src" in config.data && config.data.src)
				config.data.src = absoluteUpload(config.data.src, origin);
			if (block.type === "link" && "thumbnail" in config.data && config.data.thumbnail)
				config.data.thumbnail = absoluteUpload(config.data.thumbnail, origin);
			return [
				{
					id: block.id,
					type: block.type,
					title: block.title,
					url: block.url ? publicationUrlSchema.parse(block.url) : null,
					icon: block.icon,
					embedType: block.embedType,
					embedUrl: block.embedUrl,
					position: block.position,
					config: JSON.stringify(config.data),
				},
			];
		});
	const snapshot = {
		schemaVersion: 1,
		revision: input.revision,
		publicOrigin: origin.origin,
		builtAt: input.builtAt,
		nextVisibilityBoundary: boundaries.length
			? new Date(Math.min(...boundaries)).toISOString()
			: null,
		profile: {
			...input.profile,
			image: input.profile.image ? absoluteUpload(input.profile.image, origin) : null,
		},
		settings,
		blocks,
		socialNetworks: input.socialNetworks
			.filter((social) => social.isActive)
			.map((social) => ({
				slug: social.slug,
				url: publicationUrlSchema.parse(social.url),
			})),
	};
	return publicSnapshotSchema.parse(snapshot);
}

/** Private approval only: future bodies and windows must never enter a public artifact/status. */
export const approvedPublicationSourceSchema = z
	.object({
		schemaVersion: z.literal(1),
		publicOrigin: publicSnapshotSchema.shape.publicOrigin,
		profile: publicSnapshotSchema.shape.profile,
		settings: publicSnapshotSchema.shape.settings,
		blocks: z
			.array(
				z
					.object({
						...publicBlockSchema.shape,
						scheduledStart: z.iso.datetime().nullable(),
						scheduledEnd: z.iso.datetime().nullable(),
						createdAt: z.iso.datetime().nullable(),
					})
					.strict(),
			)
			.max(MAX_BLOCKS),
		socialNetworks: publicSnapshotSchema.shape.socialNetworks,
	})
	.strict()
	.superRefine((source, ctx) => {
		const blocks = source.blocks.map(
			({ scheduledStart, scheduledEnd, createdAt: _createdAt, ...row }) => {
				if (
					scheduledStart &&
					scheduledEnd &&
					Date.parse(scheduledEnd) <= Date.parse(scheduledStart)
				)
					ctx.addIssue({ code: "custom", message: "Approved schedule window is invalid" });
				return row;
			},
		);
		if (
			!publicSnapshotSchema.safeParse({
				...source,
				blocks,
				revision: "approval-validation",
				builtAt: "1970-01-01T00:00:00.000Z",
				nextVisibilityBoundary: null,
			}).success
		)
			ctx.addIssue({ code: "custom", message: "Approved source contains unsupported public data" });
		if (
			new TextEncoder().encode(JSON.stringify(source)).byteLength > MAX_APPROVED_PUBLICATION_BYTES
		)
			ctx.addIssue({ code: "custom", message: "Approved publication source exceeds 1 MB" });
	});
export type ApprovedPublicationSource = z.infer<typeof approvedPublicationSourceSchema>;

/** Capture only explicitly eligible public fields, including privately approved future content. */
export function createApprovedPublicationSource(raw: unknown): ApprovedPublicationSource {
	const input = publicationInputSchema.parse(raw);
	const eligible = input.blocks.filter((row) => row.isEnabled && row.status === "published");
	const byId = new Map(eligible.map((row) => [row.id, row]));
	// Reuse the complete public allowlist/config projection, but never publish
	// this intermediate value: the approved source retains its private windows.
	const projected = createPublicationSnapshot({
		...input,
		blocks: eligible.map((row) => ({
			...row,
			scheduledStart: null,
			scheduledEnd: null,
		})),
	});
	return approvedPublicationSourceSchema.parse({
		schemaVersion: 1,
		publicOrigin: projected.publicOrigin,
		profile: projected.profile,
		settings: projected.settings,
		blocks: projected.blocks.map((row) => ({
			...row,
			scheduledStart: byId.get(row.id)?.scheduledStart?.toISOString() ?? null,
			scheduledEnd: byId.get(row.id)?.scheduledEnd?.toISOString() ?? null,
			createdAt: byId.get(row.id)?.createdAt?.toISOString() ?? null,
		})),
		socialNetworks: projected.socialNetworks,
	});
}

/** Boundary jobs derive only from the immutable approval, never current authoring rows. */
export function snapshotFromApprovedSource(
	raw: unknown,
	revision: string,
	builtAt: string,
): PublicSnapshot {
	const source = approvedPublicationSourceSchema.parse(raw);
	return createPublicationSnapshot({
		...source,
		revision,
		builtAt,
		blocks: source.blocks.map((row) => ({ ...row, isEnabled: true, status: "published" })),
		socialNetworks: source.socialNetworks.map((row) => ({ ...row, isActive: true })),
	});
}

export async function approvedPublicationSourceDigest(
	raw: unknown,
	identity: PublicationIdentity,
): Promise<string> {
	const source = approvedPublicationSourceSchema.parse(raw);
	const bytes = new TextEncoder().encode(
		JSON.stringify(canonicalValue({ ...publicationIdentitySchema.parse(identity), source })),
	);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
