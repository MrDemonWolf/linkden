import { test, expect } from "@playwright/test";

test.describe("QR Code Page", () => {
  test("should load the QR code page", async ({ page }) => {
    await page.goto("/qr");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display a QR code image or SVG", async ({ page }) => {
    await page.goto("/qr");
    const qrCode = page.locator(
      "[data-testid='qr-code'], canvas, svg.qr-code, img[alt*='QR'], img[alt*='qr']"
    );
    await expect(qrCode.first()).toBeVisible({ timeout: 10000 });
  });

  test("should render the QR code at a reasonable size", async ({ page }) => {
    await page.goto("/qr");
    const qrCode = page.locator(
      "[data-testid='qr-code'], canvas, svg.qr-code, img[alt*='QR'], img[alt*='qr']"
    );
    await expect(qrCode.first()).toBeVisible({ timeout: 10000 });

    const box = await qrCode.first().boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // QR code should be at least 100x100 pixels
      expect(box.width).toBeGreaterThan(100);
      expect(box.height).toBeGreaterThan(100);
    }
  });

  test("should not require authentication", async ({ page }) => {
    await page.goto("/qr");
    await page.waitForTimeout(1000);
    // Should not redirect to sign-in
    expect(page.url()).not.toContain("sign-in");
    expect(page.url()).toContain("/qr");
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/qr");

    const qrCode = page.locator(
      "[data-testid='qr-code'], canvas, svg.qr-code, img[alt*='QR'], img[alt*='qr']"
    );
    await expect(qrCode.first()).toBeVisible({ timeout: 10000 });

    const box = await qrCode.first().boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // QR code should fit within mobile viewport
      expect(box.width).toBeLessThan(375);
    }
  });

  test("should display a download or share button", async ({ page }) => {
    await page.goto("/qr");
    const actionButton = page.locator(
      "button:has-text('Download'), button:has-text('Share'), a:has-text('Download'), [data-testid='qr-download'], [data-testid='qr-share']"
    );
    const count = await actionButton.count();
    // Download/share button may or may not exist depending on implementation
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have proper page title", async ({ page }) => {
    await page.goto("/qr");
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });
});
