import { afterEach, describe, expect, it, vi } from "vitest";
import { createPublicContactSubmit, publicContactEndpoint } from "../public-contact";

afterEach(() => vi.unstubAllGlobals());

describe("static public contact transport", () => {
	it("sends only an explicit contact submission without credentials or redirects", async () => {
		const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
		vi.stubGlobal("fetch", fetcher);
		await createPublicContactSubmit("https://api.example.test/api/contact")({
			firstName: "Ada",
			lastName: "Example",
			email: "ada@example.test",
			consent: true,
		});
		expect(fetcher).toHaveBeenCalledWith(
			"https://api.example.test/api/contact",
			expect.objectContaining({
				credentials: "omit",
				redirect: "error",
				referrerPolicy: "no-referrer",
				method: "POST",
			}),
		);
	});
	it.each([
		"https://user:password@api.example.test/api/contact",
		"https://api.example.test/trpc",
		"https://api.example.test/api/contact?x=1",
		"http://api.example.test/api/contact",
	])("rejects unsafe action %s", (url) => expect(() => publicContactEndpoint(url)).toThrow());
	it("preserves rate-limit feedback and rejects forged success responses", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Wait" }), { status: 429 }))
				.mockResolvedValueOnce(new Response("{}")),
		);
		const submit = createPublicContactSubmit("https://api.example.test/api/contact");
		const input = {
			firstName: "Ada",
			lastName: "Example",
			email: "ada@example.test",
			consent: true as const,
		};
		await expect(submit(input)).rejects.toMatchObject({
			data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
		});
		await expect(submit(input)).rejects.toThrow("Contact submission failed");
	});
});
