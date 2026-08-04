import { expect, test } from "@playwright/test";

// State-agnostic smoke checks: they pass on a fresh DB (no admin yet) and on a
// configured instance, so the suite is safe to run at any point in a dev cycle.
//
// NOTE: / and /admin/setup currently render no <main> landmark (a11y gap, see
// design review), so these assertions key on network + content signals instead.

test("public page renders with live data", async ({ page }) => {
	const pageData = page.waitForResponse(
		(res) => res.url().includes("/trpc/public.getPage") && res.ok(),
	);
	await page.goto("/");
	// The public page is client-fetched; a successful getPage round-trip proves
	// web -> (rewrite) -> API -> D1 end to end.
	await pageData;
	await expect(page.locator("body")).toBeVisible();
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

test("/api/og is served by Next, not proxied to the API", async ({
	request,
}) => {
	const res = await request.get("/api/og");
	expect(res.status()).toBe(200);
	expect(res.headers()["content-type"]).toContain("image/png");
});

test("/admin is gated", async ({ page }) => {
	await page.goto("/admin");
	// proxy.ts redirects unauthenticated /admin/* to the login page.
	await expect(page).toHaveURL(/\/admin\/login/);
	await expect(page.getByRole("heading").first()).toBeVisible();
});

test("setup wizard or login is reachable", async ({ page }) => {
	// Fresh DB: /admin/setup shows the wizard. Configured DB: it redirects to
	// /admin/login. Both are healthy states; a 500 or blank page is not.
	const res = await page.goto("/admin/setup");
	expect(res?.status()).toBeLessThan(400);
	await expect(page).toHaveURL(/\/admin\/(setup|login)/);
	await expect(page.locator("body")).toContainText(/LinkDen|Sign in|Welcome/i);
});
