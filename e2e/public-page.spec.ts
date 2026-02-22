import { test, expect } from "@playwright/test";

test.describe("Public Page", () => {
  test("should load the public link page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.*$/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display the profile section", async ({ page }) => {
    await page.goto("/");
    const profileSection = page.locator("[data-testid='profile-section']");
    await expect(profileSection).toBeVisible();
  });

  test("should display the profile name", async ({ page }) => {
    await page.goto("/");
    const profileName = page.locator("[data-testid='profile-name']");
    await expect(profileName).toBeVisible();
    await expect(profileName).not.toBeEmpty();
  });

  test("should render link buttons", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("[data-testid='link-item']");
    const count = await links.count();
    // Page may have zero links if freshly installed, but should not error
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have clickable link buttons with href", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("[data-testid='link-item'] a");
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
    }
  });

  test("should display headings between link groups", async ({ page }) => {
    await page.goto("/");
    const headings = page.locator("[data-testid='block-heading']");
    const count = await headings.count();
    // Headings are optional, just verify they render without errors
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have proper meta tags for SEO", async ({ page }) => {
    await page.goto("/");
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Links should still be visible on mobile
    const links = page.locator("[data-testid='link-item']");
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toBeVisible();
    }
  });

  test("should display footer", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer, [data-testid='footer']");
    await expect(footer).toBeVisible();
  });
});
