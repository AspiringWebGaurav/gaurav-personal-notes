import { test, expect } from '@playwright/test';

test.describe('Startup Boot Update Check Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Scenario 1: Newer version available -> Boot check promptly triggers toast without any user interaction', async ({ page }) => {
    // Intercept GPHost release endpoint to simulate newer version v0.0.9 available
    await page.route('**/api/v1/releases/gpn/latest*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '0.99.0',
          notes: 'v0.99.0: Next available release',
          pub_date: new Date().toISOString(),
          platforms: {
            'windows-x86_64': {
              url: 'https://gphost.eu.cc/raw/gpn-dynamic-update/update0.99.0.gpn.bin',
            },
          },
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // On initial mount (<1s), toast should not be present yet
    const updateCardHeading = page.getByRole('heading', { name: /Update Available/i });
    const sidebarBadge = page.getByRole('button', { name: /Update available/i });
    await expect(updateCardHeading).toHaveCount(0);

    // After 1.2s boot timer fires and network resolves (~1.5s total), update card should appear automatically
    await expect(updateCardHeading).toBeVisible({ timeout: 6000 });
    await expect(sidebarBadge).toBeVisible();
    await expect(page.getByText(/is available to download/i)).toBeVisible();

    // Verify "Download" and "Later" buttons are present
    const downloadBtn = page.getByRole('button', { name: /Download/i });
    const laterBtn = page.getByRole('button', { name: /Later/i });
    await expect(downloadBtn).toBeVisible();
    await expect(laterBtn).toBeVisible();

    // Verify "Later" dismisses the toast
    await laterBtn.click();
    await expect(updateCardHeading).toHaveCount(0);
  });

  test('Scenario 2: Same version (up to date) -> 100% silent, zero toast, zero popups', async ({ page }) => {
    // Intercept GPHost release endpoint to simulate current running version v0.0.10
    await page.route('**/api/v1/releases/gpn/latest*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '0.0.12',
          notes: 'Current running version',
          pub_date: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait past the 1.2s boot timer and network resolution
    await page.waitForTimeout(3000);

    // Verify that NO update card or sidebar badge appears
    const updateCardHeading = page.getByRole('heading', { name: /Update Available/i });
    const sidebarBadge = page.getByRole('button', { name: /Update available/i });
    await expect(updateCardHeading).toHaveCount(0);
    await expect(sidebarBadge).toHaveCount(0);

    // Verify no noisy error banners appeared
    const errorBanner = page.locator('text=Update Failed');
    await expect(errorBanner).toHaveCount(0);
  });

  test('Scenario 3: Offline / Network failure on boot -> 100% silent, no annoying error popups', async ({ page }) => {
    // Simulate network error on update check
    await page.route('**/api/v1/releases/gpn/latest*', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait past the 1.2s boot timer
    await page.waitForTimeout(3000);

    // Verify neither available nor error toast appears
    const updateCardHeading = page.getByRole('heading', { name: /Update Available/i });
    const errorToast = page.locator('text=Update Failed');
    await expect(updateCardHeading).toHaveCount(0);
    await expect(errorToast).toHaveCount(0);
  });
});
