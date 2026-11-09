// Read-only deployment guard. Never changes provider settings or follows aliases.
const READBACK_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

type Env = Record<string, string | undefined>;
type AliasState = "closed" | "missing" | "open" | "unverified";

async function readAliasState(
	url: string,
	token: string,
	signal: AbortSignal,
	fetcher: typeof fetch,
): Promise<AliasState> {
	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
	const cancelReader = () => {
		void reader?.cancel().catch(() => {});
	};
	try {
		const response = await fetcher(url, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
			redirect: "error",
			signal,
		});
		if (signal.aborted || response.status === 404 || !response.ok) {
			void response.body?.cancel().catch(() => {});
			return !signal.aborted && response.status === 404 ? "missing" : "unverified";
		}
		const contentLength = response.headers.get("content-length");
		if (
			contentLength &&
			(!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_RESPONSE_BYTES)
		) {
			void response.body?.cancel().catch(() => {});
			return "unverified";
		}
		reader = response.body?.getReader();
		if (!reader) return "unverified";
		signal.addEventListener("abort", cancelReader, { once: true });
		const decoder = new TextDecoder();
		let body = "";
		let bytes = 0;
		while (true) {
			const chunk = await reader.read();
			if (signal.aborted) return "unverified";
			if (chunk.done) break;
			bytes += chunk.value.byteLength;
			if (bytes > MAX_RESPONSE_BYTES) return "unverified";
			body += decoder.decode(chunk.value, { stream: true });
		}
		body += decoder.decode();
		const data = JSON.parse(body);
		if (data?.success !== true || !Array.isArray(data.errors) || data.errors.length !== 0)
			return "unverified";
		const result = data.result;
		if (result?.enabled === false && result.previews_enabled === false) return "closed";
		return result?.enabled === true || result?.previews_enabled === true ? "open" : "unverified";
	} catch {
		return "unverified";
	} finally {
		signal.removeEventListener("abort", cancelReader);
		void reader?.cancel().catch(() => {});
	}
}

/** Both fixed LinkDen workers must have no workers.dev or version-preview aliases. */
export async function assertSplitAliasClosure(
	options: {
		mode: "legacy" | "split";
		isDeploy: boolean;
		stage: string;
		phase: "before" | "after";
		env: Env;
	},
	fetcher: typeof fetch = fetch,
): Promise<void> {
	if (options.mode !== "split" || !options.isDeploy) return;
	const accountId = options.env.CLOUDFLARE_ACCOUNT_ID;
	const token = options.env.CLOUDFLARE_API_TOKEN;
	const suffix = options.stage === "prod" ? "" : `-${options.stage}`;
	const workers = [
		{ role: "API", name: `linkden-api${suffix}` },
		{ role: "Admin", name: `linkden${suffix}` },
	];
	if (
		!accountId ||
		!/^[a-f0-9]{32}$/.test(accountId) ||
		!token ||
		/\s/.test(token) ||
		workers.some(({ name }) => !/^[a-z0-9_][a-z0-9_-]*$/.test(name) || name.length > 128)
	)
		throw new Error(
			"Split alias readback requires a valid account ID, API token and LinkDen stage.",
		);
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller.abort();
			reject(new Error("Split alias readback timed out; deployment is blocked."));
		}, READBACK_TIMEOUT_MS);
	});
	try {
		const states = await Promise.race([
			Promise.all(
				workers.map(({ name }) =>
					readAliasState(
						`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${name}/subdomain`,
						token,
						controller.signal,
						fetcher,
					),
				),
			),
			deadline,
		]);
		for (const [index, state] of states.entries()) {
			if (state === "closed" || (state === "missing" && options.phase === "before")) continue;
			const role = workers[index]!.role;
			throw new Error(
				state === "open"
					? `Split deployment blocked: ${role} workers.dev or preview aliases remain open. The owner must explicitly close them before cutover.`
					: `Split deployment blocked: ${role} alias closure could not be verified ${options.phase} apply.`,
			);
		}
	} finally {
		clearTimeout(timer);
		controller.abort();
	}
}
