import { PUBLICATION_QUEUE_TIMEOUT_MS } from "@linkden/validators/publication";
import { QueryClient, QueryClientProvider, type QueryObserverOptions } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicationStatus } from "@/lib/publication-state";

const api = vi.hoisted(() => ({ status: vi.fn(), request: vi.fn(), unsaved: false }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const KEY = ["publication-status"];
vi.mock("@/utils/trpc", () => ({
	trpc: {
		publication: {
			status: { queryOptions: () => ({ queryKey: KEY, queryFn: api.status }) },
			request: {
				mutationOptions: (options: Record<string, unknown>) => ({
					...options,
					mutationFn: api.request,
				}),
			},
		},
	},
}));
vi.mock("@/hooks/use-unsaved-changes", () => ({ useAnyUnsaved: () => api.unsaved }));
vi.mock("sonner", () => ({ toast }));

import { StatePill } from "../state-pill";

const digest = "a".repeat(64);
const approvalDigest = "c".repeat(64);
function metadata(status: "draft" | "publishing" | "published" | "failed") {
	return {
		revision: "revision-one",
		sourceDigest: digest,
		approvedSourceDigest: approvalDigest,
		approvalRevision: "revision-one",
		requestKind: "manual" as const,
		targetId: "approved-staging",
		rendererSourceId: "renderer-one",
		publicOrigin: "https://profile.example.test",
		status,
		createdAt: new Date().toISOString(),
		startedAt: null,
		finishedAt: null,
		nextVisibilityBoundary: null,
		artifactDigest: null,
		deploymentId: null,
		providerVersionId: null,
		failureCode: null,
	};
}
function status(overrides: Partial<PublicationStatus> = {}): PublicationStatus {
	return {
		status: "draft",
		available: true,
		unavailableReason: null,
		sourceDigest: digest,
		approvalDigest,
		hasUnpublishedChanges: true,
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
			minIntervalMs: 60_000,
			dailyRequests: 20,
			retainedRevisions: 100,
			snapshotBytes: 1024 * 1024,
		},
		...overrides,
	};
}

const clients: QueryClient[] = [];
function renderPill(initial?: { data: PublicationStatus; updatedAt: number }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	clients.push(client);
	if (initial) client.setQueryData(KEY, initial.data, { updatedAt: initial.updatedAt });
	render(
		<QueryClientProvider client={client}>
			<StatePill />
		</QueryClientProvider>,
	);
	return client;
}
async function open(label = "Draft") {
	const trigger = await screen.findByRole("button", { name: `Publishing: ${label}` });
	fireEvent.click(trigger);
	await screen.findByText("Publish changes");
	return trigger;
}
beforeEach(() => {
	api.unsaved = false;
	api.status.mockReset().mockResolvedValue(status());
	api.request.mockReset().mockResolvedValue({ deduplicated: false, dispatched: true });
	vi.clearAllMocks();
});
afterEach(() => {
	cleanup();
	for (const client of clients.splice(0)) client.clear();
	vi.restoreAllMocks();
});

describe("explicit publication control", () => {
	it("shows unavailable publishing without claiming Published or making a request", async () => {
		api.status.mockResolvedValue(
			status({
				available: false,
				unavailableReason: "An approved target and runner have not been enabled",
				sourceDigest: null,
				hasUnpublishedChanges: null,
			}),
		);
		renderPill();
		await open("Publishing off");
		expect(screen.getByText("An approved target and runner have not been enabled")).toBeTruthy();
		expect(screen.getByRole("link", { name: "Review block drafts" }).getAttribute("href")).toBe(
			"/admin/links?filter=drafts",
		);
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
		expect(screen.queryByText("Published", { exact: true })).toBeNull();
		expect(api.request).not.toHaveBeenCalled();
	});

	it("requests only after an explicit click, with the source digest the admin reviewed", async () => {
		api.request.mockImplementation(async () => {
			api.status.mockResolvedValue(
				status({ current: metadata("draft"), hasUnpublishedChanges: false }),
			);
			return { ...metadata("draft"), deduplicated: false, dispatched: true };
		});
		renderPill();
		await open();
		expect(api.request).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Publish" }));
		await waitFor(() => expect(api.request).toHaveBeenCalledTimes(1));
		expect(api.request.mock.calls[0]?.[0]).toEqual({
			expectedSourceDigest: digest,
			expectedApprovalDigest: approvalDigest,
		});
		expect(await screen.findByRole("button", { name: "Publishing: Publishing" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
		expect(toast.success).toHaveBeenCalledWith("Publication requested");
	});

	it("keeps saved-source publishing disabled while any form has unsaved changes", async () => {
		api.unsaved = true;
		renderPill();
		await open("Unsaved");
		expect(
			screen.getByText("Save or discard your unsaved changes before publishing."),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Publish" }));
		expect(api.request).not.toHaveBeenCalled();
	});

	it("coalesces rapid repeated clicks while the request is still pending", async () => {
		let finish: (value: { deduplicated: boolean; dispatched: boolean }) => void = () => {};
		api.request.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		renderPill();
		await open();
		const publish = screen.getByRole("button", { name: "Publish" });
		act(() => {
			fireEvent.click(publish);
			fireEvent.click(publish);
		});
		await waitFor(() => expect(api.request).toHaveBeenCalledTimes(1));
		expect(screen.getByRole("button", { name: "Requesting…" }).hasAttribute("disabled")).toBe(true);
		await act(async () => {
			finish({ deduplicated: false, dispatched: true });
		});
	});

	it("does not request another unchanged, verified revision", async () => {
		api.status.mockResolvedValue(
			status({
				status: "published",
				current: metadata("published"),
				lastGood: metadata("published"),
				hasUnpublishedChanges: false,
				liveVerified: true,
			}),
		);
		renderPill();
		await open("Published");
		expect(screen.getByText(/No new publication is needed/)).toBeTruthy();
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
		expect(screen.getByRole("link", { name: "Open verified page" }).getAttribute("href")).toBe(
			"https://profile.example.test/",
		);
		expect(api.request).not.toHaveBeenCalled();
	});

	it("guards approval of future-only edits even when the visible source digest is unchanged", async () => {
		const futureDigest = "d".repeat(64);
		api.status.mockResolvedValue(
			status({
				current: metadata("published"),
				approvalDigest: futureDigest,
				hasUnpublishedChanges: true,
			}),
		);
		renderPill();
		await open("Draft");
		fireEvent.click(screen.getByRole("button", { name: "Publish" }));
		await waitFor(() => expect(api.request).toHaveBeenCalledTimes(1));
		expect(api.request.mock.calls[0]?.[0]).toEqual({
			expectedSourceDigest: digest,
			expectedApprovalDigest: futureDigest,
		});
	});

	it("describes configured scheduling and overdue state without rendering provider failure codes", async () => {
		api.status.mockResolvedValue(
			status({
				nextVisibilityBoundary: new Date().toISOString(),
				scheduler: {
					configured: true,
					cadenceMinutes: 5,
					approvalAvailable: true,
					overdue: true,
					lastAttemptAt: null,
					failureCode: "RAW_PROVIDER_DETAIL",
				},
			}),
		);
		renderPill();
		await open("Draft");
		expect(screen.getByText(/Scheduled checks are configured every 5 minutes/)).toBeTruthy();
		expect(screen.getByText(/A scheduled content change is overdue/)).toBeTruthy();
		expect(screen.queryByText("RAW_PROVIDER_DETAIL")).toBeNull();
		expect(api.request).not.toHaveBeenCalled();
	});

	it("handles a concurrent same-source request as a no-op", async () => {
		api.request.mockResolvedValue({
			...metadata("published"),
			deduplicated: true,
			dispatched: false,
		});
		renderPill();
		await open();
		fireEvent.click(screen.getByRole("button", { name: "Publish" }));
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("No new publication was needed"),
		);
		expect(api.request).toHaveBeenCalledTimes(1);
	});

	it("does not call an old receipt Published when live state is unverified", async () => {
		api.status.mockResolvedValue(
			status({
				status: "published",
				current: metadata("published"),
				lastGood: metadata("published"),
				hasUnpublishedChanges: false,
				liveVerified: false,
			}),
		);
		renderPill();
		await open("Draft");
		expect(screen.queryByRole("button", { name: "Publishing: Published" })).toBeNull();
		expect(screen.queryByRole("link", { name: "Open verified page" })).toBeNull();
		expect(screen.getByText(/live state unverified/)).toBeTruthy();
	});

	it("keeps last-good history unverified and blocks retry during recovery", async () => {
		api.status.mockResolvedValue(
			status({
				status: "failed",
				available: false,
				recoveryRequired: true,
				current: { ...metadata("failed"), failureCode: "provider-secret-must-not-render" },
				lastGood: metadata("published"),
				liveVerified: false,
			}),
		);
		renderPill();
		await open("Failed");
		expect(screen.getByText(/Historical successful revision · live state unverified/)).toBeTruthy();
		expect(screen.getByText(/Publishing is paused/)).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Open verified page" })).toBeNull();
		expect(screen.queryByText("provider-secret-must-not-render")).toBeNull();
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
	});

	it("reports a safe failure and supports manual status refresh", async () => {
		api.status.mockRejectedValue(new Error("RAW_PROVIDER_SECRET"));
		renderPill();
		await open("Check status");
		expect(screen.queryByText("RAW_PROVIDER_SECRET")).toBeNull();
		expect(screen.getByText(/Couldn't check publishing status/)).toBeTruthy();
		api.status.mockResolvedValue(status());
		fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
		expect(await screen.findByRole("button", { name: "Publishing: Draft" })).toBeTruthy();
		expect(api.request).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		"describes retained live state only when verified (%s)",
		async (liveVerified) => {
			api.status.mockResolvedValue(
				status({
					status: "failed",
					current: metadata("failed"),
					lastGood: liveVerified ? metadata("published") : null,
					liveVerified,
				}),
			);
			renderPill();
			await open("Failed");
			expect(
				screen.getByText(
					liveVerified
						? /previous verified revision is retained/
						: /No current live page has been verified/,
				),
			).toBeTruthy();
		},
	);

	it("keeps provider failure details out of publication feedback", async () => {
		api.request.mockRejectedValue({ message: "RAW_PROVIDER_SECRET", data: { httpStatus: 500 } });
		renderPill();
		await open();
		fireEvent.click(screen.getByRole("button", { name: "Publish" }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Publication could not be requested. Refresh status before retrying.",
			),
		);
		expect(screen.queryByText("RAW_PROVIDER_SECRET")).toBeNull();
	});

	it("closes with Escape and returns keyboard focus to its trigger", async () => {
		renderPill();
		const trigger = await open();
		fireEvent.keyDown(screen.getByRole("button", { name: "Refresh status" }), { key: "Escape" });
		await waitFor(() => expect(screen.queryByText("Publish changes")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
	});

	it("polls only a pending available job for two minutes; manual refresh restarts the window", async () => {
		api.status.mockResolvedValue(
			status({
				current: metadata("publishing"),
				status: "publishing",
				hasUnpublishedChanges: false,
			}),
		);
		const client = renderPill();
		await open("Publishing");
		const query = client.getQueryCache().find({ queryKey: KEY })!;
		const interval = (
			query.options as typeof query.options & Pick<QueryObserverOptions, "refetchInterval">
		).refetchInterval;
		expect(typeof interval).toBe("function");
		if (typeof interval !== "function") throw new Error("Expected bounded job polling");
		expect(interval(query)).toBe(10_000);
		const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 120_001);
		expect(interval(query)).toBe(false);
		fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
		await waitFor(() => expect(api.status).toHaveBeenCalledTimes(2));
		const resumed = (
			query.options as typeof query.options & Pick<QueryObserverOptions, "refetchInterval">
		).refetchInterval;
		expect(typeof resumed === "function" && resumed(query)).toBe(10_000);
		clock.mockRestore();
		await act(async () => {
			client.setQueryData(KEY, status({ available: false }));
		});
		expect(interval(query)).toBe(false);
	});

	it("refreshes an expired queued revision before enabling a request with the current digest", async () => {
		const now = Date.now();
		const queued = {
			...metadata("draft"),
			nextVisibilityBoundary: new Date(now - 10_000).toISOString(),
		};
		const currentDigest = "b".repeat(64);
		api.status.mockResolvedValue(status({ current: queued, sourceDigest: currentDigest }));
		renderPill({ data: status({ current: queued }), updatedAt: now - 20_000 });
		await open("Draft");
		expect(screen.getByText(/Refresh status before publishing again/)).toBeTruthy();
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
		expect(api.status).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
		await screen.findByText(/The queued revision expired before it started/);
		fireEvent.click(screen.getByRole("button", { name: "Publish" }));
		await waitFor(() => expect(api.request).toHaveBeenCalledTimes(1));
		expect(api.request.mock.calls[0]?.[0]).toEqual({
			expectedSourceDigest: currentDigest,
			expectedApprovalDigest: approvalDigest,
		});
	});

	it("continues blocking an active Publishing job after a visibility boundary passes", async () => {
		api.status.mockResolvedValue(
			status({
				status: "publishing",
				current: {
					...metadata("publishing"),
					createdAt: new Date(Date.now() - PUBLICATION_QUEUE_TIMEOUT_MS - 1000).toISOString(),
					nextVisibilityBoundary: new Date(Date.now() - 1000).toISOString(),
				},
			}),
		);
		renderPill();
		await open("Publishing");
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
		expect(api.request).not.toHaveBeenCalled();
	});

	it("requires a fresh check after an unclaimed queued job times out, then permits an explicit retry", async () => {
		const now = Date.now();
		const expiry = now - 10_000;
		const queued = {
			...metadata("draft"),
			createdAt: new Date(expiry - PUBLICATION_QUEUE_TIMEOUT_MS).toISOString(),
			nextVisibilityBoundary: new Date(now + 60 * 60_000).toISOString(),
		};
		api.status.mockResolvedValue(status({ current: queued, hasUnpublishedChanges: false }));
		renderPill({ data: status({ current: queued }), updatedAt: now - 20_000 });
		await open("Draft");
		expect(screen.getByText(/timed out before it started\. Refresh status/)).toBeTruthy();
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
		await screen.findByText(/timed out before it started\. Publish the current saved content/);
		fireEvent.click(screen.getByRole("button", { name: "Publish" }));
		await waitFor(() => expect(api.request).toHaveBeenCalledTimes(1));
		expect(api.request.mock.calls[0]?.[0]).toEqual({
			expectedSourceDigest: digest,
			expectedApprovalDigest: approvalDigest,
		});
	});

	it("does not promise automatic checks while publication availability is blocked", async () => {
		api.status.mockResolvedValue(
			status({
				available: false,
				current: metadata("publishing"),
				unavailableReason: "Publication source is unavailable",
			}),
		);
		renderPill();
		await open("Publishing off");
		expect(screen.queryByText(/Automatic checks run/)).toBeNull();
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
	});
});
