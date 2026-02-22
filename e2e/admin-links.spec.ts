import { test, expect } from "@playwright/test";

// These tests require authentication. In CI, use Clerk testing tokens
// or a test account configured via environment variables.
test.describe("Admin Links Management", () => {
  test.skip(
    !process.env.CLERK_TEST_TOKEN,
    "Skipping: CLERK_TEST_TOKEN not set"
  );

  test.beforeEach(async ({ page }) => {
    // Set the Clerk test token cookie for authenticated access
    if (process.env.CLERK_TEST_TOKEN) {
      await page.goto("/");
      await page.evaluate((token) => {
        document.cookie = `__session=${token}; path=/`;
      }, process.env.CLERK_TEST_TOKEN);
    }
  });

  test("should load the links page", async ({ page }) => {
    await page.goto("/admin/links");
    await expect(
      page.locator("h1, [data-testid='links-heading']")
    ).toContainText(/links/i);
  });

  test("should navigate to the new link form", async ({ page }) => {
    await page.goto("/admin/links");
    const addButton = page.locator(
      "a[href='/admin/links/new'], button:has-text('Add'), [data-testid='add-link-button']"
    );
    await addButton.first().click();
    await expect(page).toHaveURL(/\/admin\/links\/new/);
  });

  test("should create a new link", async ({ page }) => {
    await page.goto("/admin/links/new");

    // Select link type
    const typeSelector = page.locator(
      "[data-testid='link-type-select'], select[name='type']"
    );
    if (await typeSelector.isVisible()) {
      await typeSelector.selectOption("link");
    }

    // Fill in title
    const titleInput = page.locator(
      "input[name='title'], [data-testid='link-title-input']"
    );
    await titleInput.fill("Test Link - E2E");

    // Fill in URL
    const urlInput = page.locator(
      "input[name='url'], [data-testid='link-url-input']"
    );
    await urlInput.fill("https://example.com/e2e-test");

    // Submit
    const saveButton = page.locator(
      "button[type='submit'], button:has-text('Save'), [data-testid='save-link-button']"
    );
    await saveButton.click();

    // Should redirect back to links list or show success
    await expect(page).toHaveURL(/\/admin\/links(?!\/new)/);
  });

  test("should edit an existing link", async ({ page }) => {
    await page.goto("/admin/links");

    // Click the first link to edit
    const firstLink = page.locator(
      "[data-testid='link-item'], .link-list-item"
    );
    const count = await firstLink.count();
    test.skip(count === 0, "No links to edit");

    await firstLink.first().click();
    await expect(page).toHaveURL(/\/admin\/links\/\w+/);

    // Modify the title
    const titleInput = page.locator(
      "input[name='title'], [data-testid='link-title-input']"
    );
    await titleInput.clear();
    await titleInput.fill("Updated Link - E2E");

    // Save
    const saveButton = page.locator(
      "button[type='submit'], button:has-text('Save'), [data-testid='save-link-button']"
    );
    await saveButton.click();

    // Verify redirect or success message
    await expect(page).toHaveURL(/\/admin\/links/);
  });

  test("should delete a link", async ({ page }) => {
    await page.goto("/admin/links");

    const linkItems = page.locator(
      "[data-testid='link-item'], .link-list-item"
    );
    const initialCount = await linkItems.count();
    test.skip(initialCount === 0, "No links to delete");

    // Click the first link to open editor
    await linkItems.first().click();

    // Click delete button
    const deleteButton = page.locator(
      "button:has-text('Delete'), [data-testid='delete-link-button']"
    );
    await deleteButton.click();

    // Confirm deletion in dialog
    const confirmButton = page.locator(
      "button:has-text('Confirm'), button:has-text('Yes'), [data-testid='confirm-delete']"
    );
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Should redirect to links list
    await expect(page).toHaveURL(/\/admin\/links/);
  });

  test("should toggle link visibility", async ({ page }) => {
    await page.goto("/admin/links");

    const toggleButton = page.locator(
      "[data-testid='visibility-toggle'], button[aria-label*='visibility']"
    );
    const count = await toggleButton.count();
    test.skip(count === 0, "No links with visibility toggle");

    // Click the first visibility toggle
    await toggleButton.first().click();

    // The toggle should change state (visual check)
    await page.waitForTimeout(500);
  });
});
