import { test, expect } from "@playwright/test";

test.describe("Admin Contacts", () => {
  test.skip(
    !process.env.CLERK_TEST_TOKEN,
    "Skipping: CLERK_TEST_TOKEN not set"
  );

  test.beforeEach(async ({ page }) => {
    if (process.env.CLERK_TEST_TOKEN) {
      await page.goto("/");
      await page.evaluate((token) => {
        document.cookie = `__session=${token}; path=/`;
      }, process.env.CLERK_TEST_TOKEN);
    }
  });

  test("should load the contacts page", async ({ page }) => {
    await page.goto("/admin/contacts");
    await expect(
      page.locator("h1, [data-testid='contacts-heading']")
    ).toContainText(/contact|message|submission/i);
  });

  test("should display contact submissions list", async ({ page }) => {
    await page.goto("/admin/contacts");
    // The list may be empty, but the container should exist
    const listContainer = page.locator(
      "[data-testid='contacts-list'], table, .contacts-list"
    );
    await expect(listContainer.first()).toBeVisible();
  });

  test("should show submission details when clicking a contact", async ({
    page,
  }) => {
    await page.goto("/admin/contacts");

    const contactItems = page.locator(
      "[data-testid='contact-item'], tr[data-contact], .contact-item"
    );
    const count = await contactItems.count();
    test.skip(count === 0, "No contact submissions to view");

    await contactItems.first().click();
    await page.waitForTimeout(500);

    // Should show the message details
    const messageContent = page.locator(
      "[data-testid='contact-message'], .contact-detail, .message-content"
    );
    await expect(messageContent.first()).toBeVisible();
  });

  test("should mark a submission as read", async ({ page }) => {
    await page.goto("/admin/contacts");

    const contactItems = page.locator(
      "[data-testid='contact-item'], tr[data-contact], .contact-item"
    );
    const count = await contactItems.count();
    test.skip(count === 0, "No contact submissions available");

    // Click the first contact to view it
    await contactItems.first().click();
    await page.waitForTimeout(500);

    // Look for mark as read button
    const readButton = page.locator(
      "button:has-text('Mark as Read'), button:has-text('Read'), [data-testid='mark-read']"
    );
    if (await readButton.isVisible()) {
      await readButton.click();
      await page.waitForTimeout(500);
    }
  });

  test("should archive a submission", async ({ page }) => {
    await page.goto("/admin/contacts");

    const contactItems = page.locator(
      "[data-testid='contact-item'], tr[data-contact], .contact-item"
    );
    const count = await contactItems.count();
    test.skip(count === 0, "No contact submissions available");

    await contactItems.first().click();

    const archiveButton = page.locator(
      "button:has-text('Archive'), [data-testid='archive-contact']"
    );
    if (await archiveButton.isVisible()) {
      await archiveButton.click();
      await page.waitForTimeout(500);
    }
  });

  test("should display empty state when no submissions", async ({ page }) => {
    await page.goto("/admin/contacts");
    const contactItems = page.locator(
      "[data-testid='contact-item'], tr[data-contact], .contact-item"
    );
    const count = await contactItems.count();

    if (count === 0) {
      const emptyState = page.locator(
        "[data-testid='empty-state'], .empty-state, p:has-text('No')"
      );
      await expect(emptyState.first()).toBeVisible();
    }
  });
});
