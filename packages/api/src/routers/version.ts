import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { APP_VERSION, compareSemver } from "../utils/version";

// ─── Version Router ────────────────────────────────────────────────────────
// Admin-only update check against the latest GitHub release. Protected (the
// only caller is Settings → Data) so anonymous traffic can't drive outbound
// GitHub calls, burn the shared unauthenticated quota, or fingerprint the
// running version. Results are memoized per isolate and the fetch is bounded.

const RELEASES_URL = "https://api.github.com/repos/mrdemonwolf/LinkDen/releases/latest";
const FETCH_TIMEOUT_MS = 5_000;
/** Successful answers are cached for hours — releases are rare. */
const OK_TTL_MS = 6 * 60 * 60 * 1000;
/** Failures are cached briefly so a GitHub outage isn't hammered, but recovers soon. */
const FAIL_TTL_MS = 10 * 60 * 1000;
/** A forced check ("Check for updates") still reuses an answer this fresh. */
const FORCE_FLOOR_MS = 60 * 1000;

export interface UpdateCheck {
	/** "unavailable" = the check itself failed; it says nothing about being up to date. */
	status: "ok" | "unavailable";
	/** Why the check failed: the HTTP status (e.g. "404") or "network". */
	reason: string | null;
	current: string;
	latest: string;
	hasUpdate: boolean;
	releaseUrl: string | null;
	changelog: string | null;
}

let cached: { value: UpdateCheck; fetchedAt: number; expiresAt: number } | null = null;
/** Concurrent misses share one GitHub request. */
let inflight: Promise<UpdateCheck> | null = null;

/** Test hook: forget the memoized result. */
export function resetUpdateCheckCache(): void {
	cached = null;
	inflight = null;
}

function unavailable(reason: string): UpdateCheck {
	return {
		status: "unavailable",
		reason,
		current: APP_VERSION,
		latest: APP_VERSION,
		hasUpdate: false,
		releaseUrl: null,
		changelog: null,
	};
}

async function fetchUpdateCheck(): Promise<UpdateCheck> {
	try {
		const response = await fetch(RELEASES_URL, {
			headers: {
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "LinkDen",
			},
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!response.ok) return unavailable(String(response.status));

		const data = (await response.json()) as {
			tag_name?: unknown;
			html_url?: unknown;
			body?: unknown;
		};
		if (typeof data.tag_name !== "string") return unavailable("malformed");
		const latest = data.tag_name.replace(/^v/, "");
		return {
			status: "ok",
			reason: null,
			current: APP_VERSION,
			latest,
			hasUpdate: compareSemver(latest, APP_VERSION) > 0,
			releaseUrl: typeof data.html_url === "string" ? data.html_url : null,
			changelog: typeof data.body === "string" ? data.body : null,
		};
	} catch {
		// Timeout, DNS, TLS, bad JSON.
		return unavailable("network");
	}
}

export async function getUpdateCheck(force = false): Promise<UpdateCheck> {
	const now = Date.now();
	if (cached) {
		const fresh = force ? now - cached.fetchedAt < FORCE_FLOOR_MS : cached.expiresAt > now;
		if (fresh) return cached.value;
	}
	if (!inflight) {
		inflight = fetchUpdateCheck()
			.then((value) => {
				const fetchedAt = Date.now();
				cached = {
					value,
					fetchedAt,
					expiresAt: fetchedAt + (value.status === "ok" ? OK_TTL_MS : FAIL_TTL_MS),
				};
				return value;
			})
			.finally(() => {
				inflight = null;
			});
	}
	return inflight;
}

export const versionRouter = router({
	// `force` (the "Check for updates" button) skips the long cache but not
	// the one-minute floor, so a burst of clicks still makes one GitHub call.
	checkUpdate: protectedProcedure
		.input(z.object({ force: z.boolean().optional() }).optional())
		.query(({ input }): Promise<UpdateCheck> => getUpdateCheck(input?.force ?? false)),
});
