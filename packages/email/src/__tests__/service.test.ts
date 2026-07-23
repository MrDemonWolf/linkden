import { afterEach, describe, expect, it, vi } from "vitest";
import { createResendEmailService } from "../service";

afterEach(() => vi.unstubAllGlobals());

describe("createResendEmailService", () => {
	it("posts to Resend and resolves on a 2xx response", async () => {
		const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
		vi.stubGlobal("fetch", fetchMock);

		await createResendEmailService("re_key", "me@example.com").send({
			to: "admin@example.com",
			subject: "Hi",
			html: "<p>hi</p>",
		});

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://api.resend.com/emails");
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_key");
		expect(JSON.parse(init.body as string)).toMatchObject({
			from: "me@example.com",
			to: "admin@example.com",
			subject: "Hi",
		});
	});

	it("throws on a non-2xx Resend response (surfaced, not swallowed)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: false, statusText: "Unauthorized" }) as Response),
		);
		await expect(
			createResendEmailService("bad", "me@example.com").send({
				to: "a@example.com",
				subject: "x",
				html: "x",
			}),
		).rejects.toThrow(/Failed to send email/);
	});
});
