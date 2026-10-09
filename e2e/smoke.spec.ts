import { expect, test } from "@playwright/test";

// State-agnostic smoke checks: they pass on a fresh DB (no admin yet) and on a
// configured instance, so the suite is safe to run at any point in a dev cycle.
//
// NOTE: / and /admin/setup currently render no <main> landmark (a11y gap, see
// design review), so these assertions key on network + content signals instead.

test("public page renders with live data", async ({ page }) => {
	// The public page is server-rendered (app/page.tsx -> getPublicPageResult),
	// so the browser never calls public.getPage itself: the proof that
	// web -> API -> D1 works is in the HTML. When the API is unreachable the
	// server renders the PageLoadError card instead of the page.
	const res = await page.goto("/");
	expect(res?.status()).toBe(200);
	await expect(page.locator("body")).toBeVisible();
	await expect(page.getByText(/load this page/i)).toHaveCount(0);
	// Fresh DB: the WelcomePage. Configured: the profile page. Either renders
	// real content, never a blank body.
	await expect(page.locator("body")).not.toBeEmpty();
});

test("public.getPage answers through the API", async ({ request }) => {
	// Hits the API directly (the web origin only proxies /trpc when the dev
	// rewrite is active), so it covers the tRPC route + D1 read on its own.
	// biome-ignore lint/suspicious/noUndeclaredEnvVars: Playwright-only override, not a turbo task input
	const apiOrigin = process.env.PW_API_URL ?? "http://127.0.0.1:3000";
	const res = await request.get(`${apiOrigin}/trpc/public.getPage`);
	expect(res.status()).toBe(200);
	const body = (await res.json()) as { result?: { data?: unknown } };
	expect(body.result?.data).toBeDefined();
});

test("health endpoint responds through the web origin", async ({ request }) => {
	// Exercises the dev rewrite (next.config.ts) when DEV_API_ORIGIN is set, or
	// plain wrangler when hit directly — either way the contract is the same.
	const res = await request.get("/api/health");
	expect(res.status()).toBe(200);
	const body = (await res.json()) as { status: string; database: string };
	expect(body.status).toBe("ok");
	expect(body.database).toBe("ok");
});

test("/og is served by Next, not proxied to the API", async ({ request }) => {
	const res = await request.get("/og");
	expect(res.status()).toBe(200);
	expect(res.headers()["content-type"]).toContain("image/png");
});

test("/admin is gated", async ({ page }) => {
	await page.goto("/admin");
	// proxy.ts first 307s the legacy /admin root to /admin/links, then redirects
	// the unauthenticated request to the login page carrying that canonical path.
	await expect(page).toHaveURL(/\/admin\/login\?from=%2Fadmin%2Flinks$/);
	await expect(page.getByRole("heading").first()).toBeVisible();
});

// Every destination and every legacy shim must exist as a route. Unauthenticated
// they land on login (the edge proxy runs first), which still proves no 404/500.
const ADMIN_ROUTES = [
	"/admin/links",
	"/admin/links/profile",
	"/admin/links/social",
	"/admin/design",
	"/admin/design/banner",
	"/admin/design/branding",
	"/admin/design/seo",
	"/admin/insights",
	"/admin/inbox",
	"/admin/settings",
	"/admin/settings/email",
	"/admin/settings/integrations",
	"/admin/settings/wallet",
	"/admin/settings/data",
	// legacy shims → lib/admin-redirects.ts
	"/admin/builder",
	"/admin/builder?tab=social",
	"/admin/appearance",
	"/admin/analytics",
	"/admin/connections",
	"/admin/forms",
	"/admin/social",
	"/admin/account",
	"/admin/wallet",
	"/admin/settings?tab=seo",
];

for (const route of ADMIN_ROUTES) {
	test(`${route} resolves`, async ({ page }) => {
		const res = await page.goto(route);
		expect(res?.status()).toBeLessThan(400);
		await expect(page).toHaveURL(/\/admin\//);
		await expect(page.locator("body")).not.toContainText(/404|This page could not be found/);
	});
}

test("setup wizard or login is reachable", async ({ page }) => {
	// Fresh DB: /admin/setup shows the wizard. Configured DB: it redirects to
	// /admin/login. Both are healthy states; a 500 or blank page is not.
	const res = await page.goto("/admin/setup");
	expect(res?.status()).toBeLessThan(400);
	await expect(page).toHaveURL(/\/admin\/(setup|login)/);
	await expect(page.locator("body")).toContainText(/LinkDen|Sign in|Welcome/i);
});

test("the emailed reset-password link is not bounced to login", async ({ page }) => {
	// Opened by someone who is signed out by definition: the proxy and the admin
	// shell must both let it through with its ?token= intact.
	await page.context().clearCookies();
	await page.goto("/admin/reset-password?token=x");
	await page.waitForLoadState("networkidle");
	const url = new URL(page.url());
	expect(url.pathname).toBe("/admin/reset-password");
	expect(url.searchParams.get("token")).toBe("x");
});
