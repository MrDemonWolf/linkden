import { z } from "zod";
import type { PublicationStatement } from "../../packages/db/src/publication";
import { isPublicImageKey } from "./media";
import {
	type PublicationDatabase,
	type PublicationQueryResult,
	type PublicationReceipt,
	responseBytes,
} from "./publish";

const accountSchema = z.string().regex(/^[a-f0-9]{32}$/);
const workerSchema = z.string().regex(/^linkden-public-(?:staging|production)$/);
const bucketSchema = z
	.string()
	.min(3)
	.max(64)
	.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
const statementSchema = z
	.object({
		sql: z.string().min(1).max(100_000),
		params: z.array(z.union([z.string().max(1_000_000), z.number(), z.null()])).max(100),
	})
	.strict();
const rowResultSchema = z
	.object({
		success: z.literal(true),
		results: z.array(z.record(z.string(), z.unknown())),
		meta: z.object({ changes: z.number().int().nonnegative().optional() }).passthrough(),
	})
	.passthrough();
const d1ResponseSchema = z
	.object({ success: z.literal(true), result: z.array(rowResultSchema) })
	.passthrough();
const deploymentResponseSchema = z
	.object({
		success: z.literal(true),
		result: z
			.object({
				id: z.uuid(),
				strategy: z.literal("percentage"),
				versions: z
					.array(z.object({ version_id: z.uuid(), percentage: z.literal(100) }).passthrough())
					.length(1),
			})
			.passthrough(),
	})
	.passthrough();

/** Credentialed CI transport only. No arbitrary origin, redirects, error bodies or unbounded JSON. */
export function cloudflarePublicationClient(
	config: {
		accountId: string;
		apiToken: string;
		databaseId: string;
		workerName: string;
		publicOrigin: string;
		imagesBucket?: string;
	},
	transport: (input: string | URL, init?: RequestInit) => Promise<Response> = fetch,
) {
	const account = accountSchema.parse(config.accountId);
	const database = z.uuid().parse(config.databaseId);
	const worker = workerSchema.parse(config.workerName);
	const imagesBucket =
		config.imagesBucket === undefined ? null : bucketSchema.parse(config.imagesBucket);
	const origin = new URL(config.publicOrigin);
	if (
		/\s/.test(config.publicOrigin) ||
		origin.protocol !== "https:" ||
		origin.username ||
		origin.password ||
		origin.pathname !== "/" ||
		origin.search ||
		origin.hash
	)
		throw new Error("Publication requires an approved HTTPS origin");
	const apiToken = config.apiToken;
	if (!/^\S{1,4096}$/.test(apiToken))
		throw new Error("Cloudflare publication credentials are not configured");
	let targetVerified = false;
	function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
		const result = schema.safeParse(value);
		if (!result.success) throw new Error("Cloudflare publication response is invalid");
		return result.data;
	}
	async function request(suffix: string, method: "GET" | "POST", body?: unknown): Promise<unknown> {
		try {
			const payload = body === undefined ? undefined : JSON.stringify(body);
			if (payload && Buffer.byteLength(payload) > 2 * 1024 * 1024)
				throw new Error("Publication request is too large");
			const response = await transport(
				`https://api.cloudflare.com/client/v4/accounts/${account}/${suffix}`,
				{
					method,
					redirect: "error",
					signal: AbortSignal.timeout(30_000),
					headers: {
						Authorization: `Bearer ${apiToken}`,
						"Content-Type": "application/json",
					},
					...(payload === undefined ? {} : { body: payload }),
				},
			);
			if (!response.ok || response.redirected) {
				await response.body?.cancel();
				throw new Error("Provider request rejected");
			}
			return JSON.parse(new TextDecoder().decode(await responseBytes(response, 4 * 1024 * 1024)));
		} catch {
			throw new Error("Cloudflare publication request failed");
		}
	}
	async function batch(statements: PublicationStatement[]): Promise<PublicationQueryResult[]> {
		if (statements.length < 1 || statements.length > 10)
			throw new Error("Invalid publication query batch");
		const checked = z.array(statementSchema).safeParse(statements);
		if (!checked.success) throw new Error("Invalid publication query batch");
		const body = statements.length === 1 ? checked.data[0] : { batch: checked.data };
		const result = parse(
			d1ResponseSchema,
			await request(`d1/database/${database}/query`, "POST", body),
		);
		if (result.result.length !== statements.length)
			throw new Error("Incomplete publication query result");
		return result.result.map((row) => ({ rows: row.results, changes: row.meta.changes ?? 0 }));
	}
	const databaseClient: PublicationDatabase = {
		batch,
		query: async (statement) => (await batch([statement]))[0]!,
	};
	return {
		database: databaseClient,
		/** Read one explicitly referenced public upload; the media pipeline owns byte/signature limits. */
		async readPublicImage(key: string, signal: AbortSignal): Promise<Response> {
			if (!imagesBucket || !isPublicImageKey(key))
				throw new Error("An approved public image key and bucket are required");
			try {
				const response = await transport(
					`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${imagesBucket}/objects/${key}`,
					{
						method: "GET",
						redirect: "error",
						signal,
						headers: { Authorization: `Bearer ${apiToken}` },
					},
				);
				if (response.redirected) {
					await response.body?.cancel();
					throw new Error("Unexpected image redirect");
				}
				const headers = new Headers();
				for (const name of ["content-type", "content-length"]) {
					const value = response.headers.get(name);
					if (value !== null) headers.set(name, value);
				}
				// Do not hand provider URLs, credentials or error metadata to the renderer.
				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers,
				});
			} catch {
				throw new Error("Cloudflare public image request failed");
			}
		},
		/** Activate/restore an already uploaded immutable version; never modifies DNS or routes. */
		async activate(providerVersionId: string): Promise<PublicationReceipt> {
			if (!targetVerified)
				throw new Error("Verify the approved publication target before activation");
			z.uuid().parse(providerVersionId);
			const response = parse(
				deploymentResponseSchema,
				await request(`workers/scripts/${worker}/deployments`, "POST", {
					strategy: "percentage",
					versions: [{ version_id: providerVersionId, percentage: 100 }],
				}),
			);
			if (response.result.versions[0]!.version_id !== providerVersionId)
				throw new Error("Cloudflare deployment did not confirm the staged version");
			return {
				deploymentId: response.result.id,
				providerVersionId: response.result.versions[0]!.version_id,
			};
		},
		/** Require an explicitly bootstrapped publication target; never repurpose another app. */
		async verifyTarget(): Promise<void> {
			targetVerified = false;
			const settingsSchema = z
				.object({
					success: z.literal(true),
					result: z
						.object({
							bindings: z.array(z.object({ type: z.string() }).passthrough()),
							annotations: z.record(z.string(), z.string()).optional(),
							cache_options: z.object({ enabled: z.boolean() }).passthrough().optional(),
							exports: z
								.record(
									z.string(),
									z.object({ cache: z.object({ enabled: z.boolean() }).optional() }).passthrough(),
								)
								.optional(),
						})
						.passthrough(),
				})
				.passthrough();
			const settings = parse(
				settingsSchema,
				await request(`workers/scripts/${worker}/settings`, "GET"),
			);
			if (
				settings.result.bindings?.length ||
				!settings.result.annotations?.["workers/tag"]?.startsWith(`${worker}:`) ||
				settings.result.cache_options?.enabled ||
				Object.values(settings.result.exports ?? {}).some((entry) => entry.cache?.enabled)
			)
				throw new Error(
					"Publication target must be explicitly bootstrapped without bindings or Workers Cache",
				);
			const subdomainSchema = z
				.object({
					success: z.literal(true),
					result: z.object({ enabled: z.boolean(), previews_enabled: z.boolean() }).passthrough(),
				})
				.passthrough();
			const subdomain = parse(
				subdomainSchema,
				await request(`workers/scripts/${worker}/subdomain`, "GET"),
			);
			if (subdomain.result.previews_enabled)
				throw new Error("Publication target alternate hostnames must be closed before deployment");
			if (subdomain.result.enabled) {
				const accountSubdomainSchema = z
					.object({
						success: z.literal(true),
						result: z.object({ subdomain: z.string().regex(/^[a-z0-9-]+$/) }),
					})
					.passthrough();
				const accountSubdomain = parse(
					accountSubdomainSchema,
					await request("workers/subdomain", "GET"),
				);
				if (
					worker !== "linkden-public-staging" ||
					origin.origin !== `https://${worker}.${accountSubdomain.result.subdomain}.workers.dev`
				)
					throw new Error("Workers.dev is allowed only as the explicit staging origin");
			} else if (origin.hostname.endsWith(".workers.dev")) {
				throw new Error("The approved staging hostname is not enabled");
			}
			targetVerified = true;
		},
	};
}
