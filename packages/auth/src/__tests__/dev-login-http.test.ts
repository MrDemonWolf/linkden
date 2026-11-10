// @vitest-environment node
import { createTestDb } from "@linkden/db/testing";
import { betterAuth } from "better-auth";
import { afterEach, describe, expect, it } from "vitest";
import { createAuthOptions } from "../auth-options";

const BASE_URL = "http://localhost:3000";
const clients: Awaited<ReturnType<typeof createTestDb>>["client"][] = [];

async function fixture(
	configuration: {
		baseURL?: string;
		devLogin?: string;
		nodeEnv?: string;
		trustedOrigins?: string[];
	} = {},
) {
	const { db, client } = await createTestDb();
	clients.push(client);
	const { baseURL = BASE_URL, trustedOrigins = [baseURL], nodeEnv } = configuration;
	const options = createAuthOptions({
		db,
		secret: "isolated-auth-test-012345678901234567890123456789",
		baseURL,
		trustedOrigins,
		devLogin: Object.hasOwn(configuration, "devLogin") ? configuration.devLogin : "true",
		nodeEnv,
		sendEmail: async () => {},
		isEmailConfigured: async () => false,
	});
	const auth = betterAuth({
		...options,
		// Better Auth otherwise disables Origin checks under NODE_ENV=test.
		advanced: { ...options.advanced, disableOriginCheck: false, disableCSRFCheck: false },
		logger: { disabled: true },
	});
	return { auth, client };
}

function request(headers: Record<string, string> = {}, origin = BASE_URL) {
	return new Request(`${origin}/api/auth/dev-login`, {
		method: "POST",
		headers: { host: "localhost:3000", "content-type": "application/json", ...headers },
		body: "{}",
	});
}

afterEach(() => {
	for (const client of clients.splice(0)) client.close();
});

describe("dev-login HTTP safety", () => {
	it("rejects a hostile Origin without cookies", async () => {
		const { auth, client } = await fixture();
		const response = await auth.handler(request({ origin: "https://evil.example.test" }));
		expect(response.status).toBe(403);
		expect(Number((await client.execute('SELECT count(*) AS n FROM "user"')).rows[0]?.n)).toBe(0);
		expect(Number((await client.execute("SELECT count(*) AS n FROM session")).rows[0]?.n)).toBe(0);
	});

	it("rejects cross-site browser navigation even when Origin is absent", async () => {
		const { auth } = await fixture();
		const response = await auth.handler(
			request({
				"sec-fetch-site": "cross-site",
				"sec-fetch-mode": "navigate",
				"sec-fetch-dest": "document",
			}),
		);
		expect(response.status).toBe(403);
	});

	it("rejects a tunnel host even with a trusted Origin", async () => {
		const { auth } = await fixture();
		expect(
			(await auth.handler(request({ host: "remote.trycloudflare.com", origin: BASE_URL }))).status,
		).toBe(404);
	});

	it.each([
		[BASE_URL, "false"],
		["https://links.example.test", "true"],
	])("does not register the endpoint for base %s and flag %s", async (baseURL, flag) => {
		const { auth } = await fixture({ baseURL, devLogin: flag });
		const response = await auth.handler(
			new Request(`${baseURL}/api/auth/dev-login`, {
				method: "POST",
				headers: {
					host: new URL(baseURL).host,
					origin: baseURL,
					"content-type": "application/json",
				},
				body: "{}",
			}),
		);
		expect(response.status).toBe(404);
	});

	it.each([
		["public request URL", "https://public.example.test", "localhost:3000"],
		["HTTPS loopback request", "https://localhost:3000", "localhost:3000"],
		["mismatched Host", BASE_URL, "localhost:3001"],
		["Host userinfo", BASE_URL, "evil.example.test@localhost:3000"],
		["Host path", BASE_URL, "localhost:3000/ignored"],
		["encoded Host", BASE_URL, "%6cocalhost:3000"],
		["numeric Host", BASE_URL, "2130706433:3000"],
		["mismatched loopback names", "http://127.0.0.1:3000", "localhost:3000"],
	])("rejects %s before creating any account or session", async (_name, url, host) => {
		const { auth, client } = await fixture();
		const response = await auth.handler(request({ host, origin: BASE_URL }, url));
		expect(response.status).toBe(404);
		expect(Number((await client.execute('SELECT count(*) AS n FROM "user"')).rows[0]?.n)).toBe(0);
		expect(Number((await client.execute("SELECT count(*) AS n FROM session")).rows[0]?.n)).toBe(0);
	});

	it.each<Record<string, string>>([
		{ origin: "https://admin.example.test" },
		{ referer: "https://admin.example.test/admin/login" },
	])("refuses non-local browser headers even when globally trusted: %j", async (headers) => {
		const { auth } = await fixture({ trustedOrigins: [BASE_URL, "https://admin.example.test"] });
		expect((await auth.handler(request(headers))).status).toBe(404);
	});

	it.each<Record<string, string>>([
		{ "cf-ray": "edge-request" },
		{ forwarded: 'for=203.0.113.1;host="localhost:3000";proto=http' },
		{ "cf-connecting-ip": "203.0.113.1" },
		{ "x-forwarded-for": "203.0.113.1, 127.0.0.1" },
		{ "x-real-ip": "203.0.113.1" },
		{ "x-forwarded-host": "tunnel.example.test, localhost:3000" },
		{ "x-forwarded-proto": "https" },
	])("refuses forwarded public traffic: %j", async (headers) => {
		const { auth } = await fixture();
		expect((await auth.handler(request({ ...headers, origin: BASE_URL }))).status).toBe(404);
	});

	it.each([{ devLogin: undefined }, { nodeEnv: "production" }])(
		"does not expose a bypass for configuration %j",
		async (configuration) => {
			const { auth } = await fixture(configuration);
			expect((await auth.handler(request({ origin: BASE_URL }))).status).toBe(404);
		},
	);

	it("rejects a missing Host header", async () => {
		const { auth } = await fixture();
		const req = request({ origin: BASE_URL });
		req.headers.delete("host");
		expect((await auth.handler(req)).status).toBe(404);
	});

	it("allows a configured local frontend through a local development proxy", async () => {
		const frontend = "http://localhost:3001";
		const { auth } = await fixture({ trustedOrigins: [frontend] });
		const response = await auth.handler(
			request(
				{
					host: "127.0.0.1:3000",
					origin: frontend,
					"x-forwarded-host": "localhost:3001",
					"x-forwarded-proto": "http",
					"x-forwarded-for": "::ffff:127.0.0.1",
					"cf-connecting-ip": "127.0.0.1",
				},
				"http://127.0.0.1:3000",
			),
		);
		expect(response.status).toBe(200);
	});

	it("allows configured IPv6 loopback development", async () => {
		const origin = "http://[::1]:3000";
		const { auth } = await fixture({ baseURL: origin, nodeEnv: "development" });
		expect((await auth.handler(request({ host: "[::1]:3000", origin }, origin))).status).toBe(200);
	});

	it("keeps explicit loopback development login working with a real session", async () => {
		const { auth } = await fixture();
		const response = await auth.handler(request({ origin: BASE_URL }));
		expect(response.status).toBe(200);
		const cookie = (response.headers as Headers & { getSetCookie(): string[] })
			.getSetCookie()
			.map((value) => value.split(";")[0])
			.join("; ");
		const session = await auth.api.getSession({
			headers: new Headers({ cookie }),
			query: { disableCookieCache: true },
		});
		expect(session?.user.email).toBe("dev@localhost");
	});
});
