import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// public.submitContact end to end against the in-memory libsql database: the
// form gate, honeypot, fail-closed CAPTCHA wiring (remoteip from
// cf-connecting-ip), sanitising, the optional connect fields and every delivery
// mode. Resend is mocked at the @linkden/email boundary; CAPTCHA siteverify goes
// through a stubbed global fetch.
vi.mock("@linkden/env/server", () => ({ env: { CORS_ORIGIN: "https://links.example.com" } }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});
const send = vi.fn(async () => {});
const createResendEmailService = vi.fn(() => ({ send }));
vi.mock("@linkden/email", () => ({
	createResendEmailService,
	renderContactNotification: vi.fn(async () => "<p>hi</p>"),
}));

const { db } = await import("@linkden/db");
const { auditLog, contactSubmission, siteSettings, user } = await import(
	"@linkden/db/schema/index"
);
const { appRouter } = await import("../routers/index");

const caller = appRouter.createCaller({
	session: null,
	headers: new Headers({ "cf-connecting-ip": "1.2.3.4" }),
} as never);

const validInput = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	whereMet: "Conference",
	message: "Hello",
	consent: true as const,
};

async function setSettings(values: Record<string, string>) {
	for (const [key, value] of Object.entries(values)) {
		await db
			.insert(siteSettings)
			.values({ key, value })
			.onConflictDoUpdate({ target: siteSettings.key, set: { value } });
	}
}

const rows = () => db.select().from(contactSubmission);

let fetchMock: ReturnType<typeof vi.fn>;
function stubSiteverify(body: unknown) {
	fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
		ok: true,
		json: async () => body,
	}));
	vi.stubGlobal("fetch", fetchMock);
}

beforeAll(async () => {
	await db.insert(user).values({
		id: "u1",
		name: "Owner",
		email: "owner@example.com",
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
});

beforeEach(async () => {
	await db.delete(contactSubmission);
	await db.delete(auditLog);
	await db.delete(siteSettings);
	await setSettings({ contact_form_enabled: "true" });
	send.mockReset();
	createResendEmailService.mockClear();
	stubSiteverify({ success: true, hostname: "links.example.com", action: "contact" });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("public.submitContact gate", () => {
	it("is FORBIDDEN and stores nothing when the form is disabled", async () => {
		await setSettings({ contact_form_enabled: "false" });
		await expect(caller.public.submitContact(validInput)).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
		expect(await rows()).toHaveLength(0);
	});

	it("answers a filled honeypot with success but stores and sends nothing", async () => {
		await setSettings({ contact_delivery: "both", email_api_key: "re_x", email_from: "a@b.co" });
		await expect(
			caller.public.submitContact({ ...validInput, website: "https://spam.example" }),
		).resolves.toEqual({ success: true });
		expect(await rows()).toHaveLength(0);
		expect(send).not.toHaveBeenCalled();
	});
});

describe("public.submitContact CAPTCHA (fail closed)", () => {
	beforeEach(async () => {
		await setSettings({ captcha_provider: "turnstile", captcha_secret_key: "sekret" });
	});

	it("rejects a missing token without calling the provider or storing", async () => {
		await expect(caller.public.submitContact(validInput)).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(await rows()).toHaveLength(0);
	});

	it("rejects a failed verification and stores nothing", async () => {
		stubSiteverify({ success: false });
		await expect(
			caller.public.submitContact({ ...validInput, captchaToken: "bad" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(await rows()).toHaveLength(0);
	});

	it("verifies with the server-derived IP, then stores the submission", async () => {
		await caller.public.submitContact({ ...validInput, captchaToken: "tok" });
		const body = String(fetchMock.mock.calls[0]?.[1]?.body);
		expect(body).toContain("remoteip=1.2.3.4");
		expect(body).toContain("response=tok");
		expect(await rows()).toHaveLength(1);
	});

	it("treats a provider with no secret as misconfigured", async () => {
		await setSettings({ captcha_secret_key: "" });
		await expect(
			caller.public.submitContact({ ...validInput, captchaToken: "tok" }),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
		expect(await rows()).toHaveLength(0);
	});
});

describe("public.submitContact storage", () => {
	it("strips tags without eating plain-text angle brackets", async () => {
		await caller.public.submitContact({
			...validInput,
			firstName: "<b>Ada</b>",
			message: "Reply to <jane@corp.com> please <script>x</script>",
		});
		const [row] = await rows();
		expect(row?.name).toBe("Ada Lovelace");
		expect(row?.message).toBe("Reply to <jane@corp.com> please x");
	});

	it("stores a submission without where-met (the block's toggle is off)", async () => {
		await caller.public.submitContact({
			...validInput,
			whereMet: "",
			blockId: "b1",
			blockTitle: "<i>Say hi</i>",
		});
		const [row] = await rows();
		expect(row).toMatchObject({ whereMet: null, blockId: "b1", blockTitle: "Say hi" });
	});

	it("rejects oversized input", async () => {
		await expect(
			caller.public.submitContact({ ...validInput, whereMet: "x".repeat(201) }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});

describe("public.submitContact delivery", () => {
	const email = { email_api_key: "re_live", email_from: "site@example.com" };

	it("both: a failed send still succeeds, keeps the row and audits the failure", async () => {
		await setSettings({ contact_delivery: "both", ...email });
		send.mockRejectedValueOnce(new Error("Failed to send email: Forbidden"));
		await expect(caller.public.submitContact(validInput)).resolves.toEqual({ success: true });
		expect(await rows()).toHaveLength(1);
		const audits = await db.select().from(auditLog);
		expect(audits.map((a) => a.action)).toEqual(["contact.email_failed"]);
	});

	it("email: sends to the admin and stores nothing on success", async () => {
		await setSettings({ contact_delivery: "email", ...email });
		await caller.public.submitContact(validInput);
		expect(createResendEmailService).toHaveBeenCalledWith("re_live", "site@example.com");
		expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.com" }));
		expect(await rows()).toHaveLength(0);
	});

	it("email: a failed send falls back to the Inbox instead of dropping the lead", async () => {
		await setSettings({ contact_delivery: "email", ...email });
		send.mockRejectedValueOnce(new Error("Resend outage"));
		await expect(caller.public.submitContact(validInput)).resolves.toEqual({ success: true });
		expect(await rows()).toHaveLength(1);
	});

	it("email: an unconfigured transport falls back to the Inbox", async () => {
		await setSettings({ contact_delivery: "email" });
		await caller.public.submitContact(validInput);
		expect(send).not.toHaveBeenCalled();
		expect(await rows()).toHaveLength(1);
	});

	it("never sends a non-Resend provider's key to Resend", async () => {
		await setSettings({ contact_delivery: "email", email_provider: "sendgrid", ...email });
		await caller.public.submitContact(validInput);
		expect(createResendEmailService).not.toHaveBeenCalled();
		expect(await rows()).toHaveLength(1);
	});
});
