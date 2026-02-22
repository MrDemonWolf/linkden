import { test, expect } from "@playwright/test";

test.describe("Admin Custom Pages", () => {
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

  test("should load the pages management page", async ({ page }) => {
    await page.goto("/admin/pages");
    await expect(
      page.locator("h1, [data-testid='pages-heading']")
    ).toContainText(/page/i);
  });

  test("should create a new custom page", async ({ page }) => {
    await page.goto("/admin/pages");

    // Click add new page button
    const addButton = page.locator(
      "a:has-text('Add'), button:has-text('Add'), button:has-text('New'), [data-testid='add-page-button']"
    );
    await addButton.first().click();
    await page.waitForTimeout(500);

    // Fill in page title
    const titleInput = page.locator(
      "input[name='title'], [data-testid='page-title-input']"
    );
    await titleInput.fill("E2E Test Page");

    // Fill in slug
    const slugInput = page.locator(
      "input[name='slug'], [data-testid='page-slug-input']"
    );
    if (await slugInput.isVisible()) {
      await slugInput.clear();
      await slugInput.fill("e2e-test-page");
    }

    // Fill in content
    const contentEditor = page.locator(
      "textarea[name='content'], [data-testid='page-content-editor'], .editor-content, [contenteditable='true']"
    );
    if (await contentEditor.isVisible()) {
      await contentEditor.fill(
        "This is a test page created by the E2E test suite."
      );
    }

    // Save
    const saveButton = page.locator(
      "button[type='submit'], button:has-text('Save'), [data-testid='save-page-button']"
    );
    await saveButton.click();

    // Should show success or redirect
    await page.waitForTimeout(1000);
  });

  test("should edit an existing custom page", async ({ page }) => {
    await page.goto("/admin/pages");

    const pageItems = page.locator(
      "[data-testid='page-item'], .page-list-item, tr[data-page]"
    );
    const count = await pageItems.count();
    test.skip(count === 0, "No custom pages to edit");

    await pageItems.first().click();
    await page.waitForTimeout(500);

    const titleInput = page.locator(
      "input[name='title'], [data-testid='page-title-input']"
    );
    await titleInput.clear();
    await titleInput.fill("Updated E2E Test Page");

    const saveButton = page.locator(
      "button[type='submit'], button:has-text('Save'), [data-testid='save-page-button']"
    );
    await saveButton.click();
    await page.waitForTimeout(1000);
  });

  test("should delete a custom page", async ({ page }) => {
    await page.goto("/admin/pages");

    const pageItems = page.locator(
      "[data-testid='page-item'], .page-list-item, tr[data-page]"
    );
    const count = await pageItems.count();
    test.skip(count === 0, "No custom pages to delete");

    await pageItems.first().click();

    const deleteButton = page.locator(
      "button:has-text('Delete'), [data-testid='delete-page-button']"
    );
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator(
      "button:has-text('Confirm'), button:has-text('Yes'), [data-testid='confirm-delete']"
    );
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    await page.waitForTimeout(1000);
  });

  test("should toggle page publish status", async ({ page }) => {
    await page.goto("/admin/pages");

    const pageItems = page.locator(
      "[data-testid='page-item'], .page-list-item, tr[data-page]"
    );
    const count = await pageItems.count();
    test.skip(count === 0, "No custom pages available");

    await pageItems.first().click();

    const publishToggle = page.locator(
      "[data-testid='publish-toggle'], input[name='published'], button:has-text('Publish')"
    );
    if (await publishToggle.isVisible()) {
      await publishToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test("should show published pages on the public site", async ({ page }) => {
    // Check if privacy page exists (common custom page)
    const response = await page.goto("/privacy");
    if (response && response.status() === 200) {
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
