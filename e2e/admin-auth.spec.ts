import { test, expect } from "@playwright/test";

test.describe("Admin Authentication", () => {
  test("should redirect unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/admin");
    // Clerk should redirect to the sign-in page
    await page.waitForURL(/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("sign-in");
  });

  test("should redirect from admin/links to sign-in when not authenticated", async ({
    page,
  }) => {
    await page.goto("/admin/links");
    await page.waitForURL(/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("sign-in");
  });

  test("should redirect from admin/appearance to sign-in when not authenticated", async ({
    page,
  }) => {
    await page.goto("/admin/appearance");
    await page.waitForURL(/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("sign-in");
  });

  test("should redirect from admin/settings to sign-in when not authenticated", async ({
    page,
  }) => {
    await page.goto("/admin/settings");
    await page.waitForURL(/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("sign-in");
  });

  test("should redirect from admin/analytics to sign-in when not authenticated", async ({
    page,
  }) => {
    await page.goto("/admin/analytics");
    await page.waitForURL(/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("sign-in");
  });

  test("should display the Clerk sign-in form", async ({ page }) => {
    await page.goto("/sign-in");
    // Wait for Clerk to render
    await page.waitForTimeout(2000);
    // Clerk renders its form in an iframe or shadow DOM
    const signInContainer = page.locator(
      "[data-clerk-component], .cl-rootBox, .cl-signIn-root"
    );
    await expect(signInContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test("should not allow access to admin API routes without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/trpc/admin.links.list", {
      headers: { "Content-Type": "application/json" },
    });
    // Should return 401 or redirect
    expect([401, 403, 302, 307]).toContain(response.status());
  });

  test("should allow public routes without authentication", async ({
    page,
  }) => {
    // Public page should load without redirect
    await page.goto("/");
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain("sign-in");
  });

  test("should allow QR page without authentication", async ({ page }) => {
    await page.goto("/qr");
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain("sign-in");
  });
});
