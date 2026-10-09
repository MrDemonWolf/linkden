import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", () => ({ db: {} }));

const { appRouter } = await import("../index");
const { resetUpdateCheckCache } = await import("../version");
const { APP_VERSION } = await import("../../utils/version");

const admin = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);
const anon = appRouter.createCaller({ session: null, headers: new Headers() } as never);

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	resetUpdateCheckCache();
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("version.checkUpdate", () => {
	it("is admin-only (no anonymous GitHub proxy / version fingerprint)", async () => {
		await expect(anon.version.checkUpdate()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("reports a newer release and bounds the fetch with a timeout", async () => {
		fetchMock.mockResolvedValue(
			Response.json({ tag_name: "v999.0.0", html_url: "https://gh/r", body: "notes" }),
		);
		const result = await admin.version.checkUpdate();
		expect(result).toMatchObject({
			status: "ok",
			current: APP_VERSION,
			latest: "999.0.0",
			hasUpdate: true,
			releaseUrl: "https://gh/r",
		});
		expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it("says 'unavailable' (not 'up to date') when GitHub fails", async () => {
		fetchMock.mockResolvedValue(new Response("", { status: 404 }));
		expect(await admin.version.checkUpdate()).toMatchObject({
			status: "unavailable",
			reason: "404",
			hasUpdate: false,
		});
		resetUpdateCheckCache();
		fetchMock.mockRejectedValue(new Error("timeout"));
		expect(await admin.version.checkUpdate()).toMatchObject({
			status: "unavailable",
			reason: "network",
		});
	});

	it("memoizes the answer instead of calling GitHub on every request", async () => {
		fetchMock.mockResolvedValue(Response.json({ tag_name: APP_VERSION }));
		await admin.version.checkUpdate();
		await admin.version.checkUpdate();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("force skips the long cache but not the one-minute floor", async () => {
		let now = 1_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);
		fetchMock.mockImplementation(async () => Response.json({ tag_name: APP_VERSION }));

		await admin.version.checkUpdate();
		// A burst of "Check for updates" clicks inside the floor reuses the answer.
		await admin.version.checkUpdate({ force: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);

		now += 61_000;
		fetchMock.mockImplementation(async () => Response.json({ tag_name: "v999.0.0" }));
		// Unforced reads keep the cached answer for hours…
		expect(await admin.version.checkUpdate()).toMatchObject({ hasUpdate: false });
		// …but the button gets a fresh one, which then becomes the cached answer.
		expect(await admin.version.checkUpdate({ force: true })).toMatchObject({ hasUpdate: true });
		expect(await admin.version.checkUpdate()).toMatchObject({ hasUpdate: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("shares one GitHub request between concurrent misses", async () => {
		fetchMock.mockImplementation(async () => Response.json({ tag_name: APP_VERSION }));
		await Promise.all([admin.version.checkUpdate(), admin.version.checkUpdate({ force: true })]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
