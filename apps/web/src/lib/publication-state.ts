import type { AppRouter } from "@linkden/api/routers/index";
import { PUBLIC_PAGE_SETTING_KEYS } from "@linkden/validators/public-settings";
import { PUBLICATION_QUEUE_TIMEOUT_MS } from "@linkden/validators/publication";
import type { inferRouterOutputs } from "@trpc/server";

export type PublicationStatus = inferRouterOutputs<AppRouter>["publication"]["status"];
export const PUBLICATION_POLL_MS = 10_000;
export const PUBLICATION_POLL_WINDOW_MS = 120_000;
const publicSettingKeys = new Set<string>(PUBLIC_PAGE_SETTING_KEYS);

export function queuedPublicationExpiry(
	status: PublicationStatus | undefined,
	now: number,
): { at: number; reason: "timeout" | "schedule" } | null {
	const current = status?.current;
	if (current?.status !== "draft") return null;
	const timeout = new Date(current.createdAt).getTime() + PUBLICATION_QUEUE_TIMEOUT_MS;
	const boundary = current.nextVisibilityBoundary
		? new Date(current.nextVisibilityBoundary).getTime()
		: Infinity;
	const at = Math.min(timeout, boundary);
	return at <= now ? { at, reason: boundary <= timeout ? "schedule" : "timeout" } : null;
}

export function pendingPublication(
	status: PublicationStatus | undefined,
	now = Date.now(),
): string | null {
	return status?.current &&
		!queuedPublicationExpiry(status, now) &&
		["draft", "publishing"].includes(status.current.status)
		? status.current.revision
		: null;
}

/** Derive display and action guards from the latest observed server state. No provider payloads. */
export function publicationView(
	data: PublicationStatus | undefined,
	options: {
		unsaved: boolean;
		isError: boolean;
		isFetching: boolean;
		requesting: boolean;
		dataUpdatedAt: number;
		now: number;
	},
) {
	const pending = !!pendingPublication(data, options.now);
	const expiry = queuedPublicationExpiry(data, options.now);
	const needsRefresh = !!expiry && options.dataUpdatedAt <= expiry.at;
	const unchanged =
		!!data?.current && data.current.status === "published" && data.hasUnpublishedChanges === false;
	const disabled =
		options.unsaved ||
		options.requesting ||
		options.isFetching ||
		options.isError ||
		!data?.available ||
		!data.sourceDigest ||
		!data.approvalDigest ||
		data.recoveryRequired ||
		needsRefresh ||
		pending ||
		unchanged;
	let label = "Draft";
	if (options.unsaved) label = "Unsaved";
	else if (options.isError) label = "Check status";
	else if (!data) label = "Checking…";
	else if (data.recoveryRequired) label = "Failed";
	else if (!data.available) label = "Publishing off";
	else if (pending) label = "Publishing";
	else if (data.status === "published" && data.liveVerified) label = "Published";
	else if (data.status === "failed") label = "Failed";

	let description =
		"Publish your saved profile as one public revision. Unpublished profile blocks stay out.";
	if (options.isError) description = "Couldn't check publishing status. Refresh before publishing.";
	else if (options.unsaved) description = "Save or discard your unsaved changes before publishing.";
	else if (data?.recoveryRequired)
		description =
			"Live state could not be verified. Publishing is paused until the target is checked and recovered.";
	else if (!data) description = "Checking whether publishing is available.";
	else if (!data.available) description = data.unavailableReason || "Publishing is unavailable.";
	else if (expiry?.reason === "timeout")
		description = needsRefresh
			? "The queued publication timed out before it started. Refresh status before trying again."
			: "The queued publication timed out before it started. Publish the current saved content to request a new revision.";
	else if (expiry)
		description = needsRefresh
			? "The queued revision expired at a scheduled content change. Refresh status before publishing again."
			: "The queued revision expired before it started. Publish the current saved content to request a new revision.";
	else if (pending)
		description =
			data.current?.status === "draft"
				? "Your saved revision is queued for publication."
				: "Your saved revision is being published.";
	else if (unchanged)
		description = data.liveVerified
			? "Saved public content matches this revision. No new publication is needed."
			: "Saved content matches a recorded revision, but live state is unverified. Refresh status before publishing.";
	else if (data.status === "failed")
		description = data.liveVerified
			? "The last publication failed. The previous verified revision is retained; refresh status before trying again."
			: "The last publication failed. No current live page has been verified. Refresh status before trying again.";
	return { pending, disabled, label, description };
}

export function publicationPollInterval(
	status: PublicationStatus | undefined,
	startedAt: number,
	now: number,
) {
	return status?.available &&
		!status.recoveryRequired &&
		pendingPublication(status, now) &&
		now - startedAt < PUBLICATION_POLL_WINDOW_MS
		? PUBLICATION_POLL_MS
		: false;
}

/** Only successful source-changing mutations should make publication status stale. */
export function changesPublicationSource(
	key: readonly unknown[] | undefined,
	variables: unknown,
): boolean {
	const path = Array.isArray(key?.[0]) ? key[0].join(".") : "";
	if (path === "settings.updateBulk" || path === "settings.update") {
		const updates = path === "settings.update" ? [variables] : variables;
		return (
			Array.isArray(updates) &&
			updates.some(
				(row) =>
					row &&
					typeof row === "object" &&
					"key" in row &&
					typeof row.key === "string" &&
					publicSettingKeys.has(row.key),
			)
		);
	}
	return (
		/^(?:blocks|social)\./.test(path) ||
		[
			"vcard.updateConfig",
			"backup.import",
			"danger.deleteAllContent",
			"danger.resetEverything",
		].includes(path)
	);
}
