import { afterEach, describe, expect, it, vi } from "vitest";
import { createResendEmailService } from "../service";

afterEach(() => vi.unstubAllGlobals());

const message = { to: "admin@example.com", subject: "Hi", html: "<p>hi</p>" };

describe("createResendEmailService", () => {
	it("posts to Resend with a timeout signal and resolves on a 2xx response", async () => {
		const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await createResendEmailService("re_key", "me@example.com").send(message);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("https://api.resend.com/emails");
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_key");
		expect(init.signal).toBeInstanceOf(AbortSignal);
		expect(JSON.parse(init.body as string)).toMatchObject({
			from: "me@example.com",
			to: "admin@example.com",
			subject: "Hi",
		});
	});

	it("surfaces the status and Resend's reason on a non-2xx response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							statusCode: 403,
							name: "validation_error",
							message: "The example.com domain is not verified.",
						}),
						{ status: 403, statusText: "" },
					),
			),
		);
		const send = createResendEmailService("re_secret", "me@example.com").send(message);
		await expect(send).rejects.toThrow(
			"Failed to send email (403): The example.com domain is not verified.",
		);
		await expect(send).rejects.not.toThrow(/re_secret/);
	});

	it("falls back to the status text when the body is not JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }),
			),
		);
		await expect(createResendEmailService("bad", "me@example.com").send(message)).rejects.toThrow(
			"Failed to send email (502): Bad Gateway",
		);
	});

	it("reports a stalled request as a timeout", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new DOMException("The operation timed out.", "TimeoutError");
			}),
		);
		await expect(
			createResendEmailService("re_key", "me@example.com").send(message),
		).rejects.toThrow("Failed to send email: no response within 10s");
	});
});
