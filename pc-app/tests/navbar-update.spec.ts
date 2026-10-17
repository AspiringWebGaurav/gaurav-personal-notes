import { test, expect } from '@playwright/test';

test.describe('Live Visual Top Navbar Update Status Demonstration', () => {
  test('Live Headed Verification: Clean navbar -> Check updates -> Centered status -> Dismiss & Auto-vanish', async ({ page }) => {
    // 1. Navigate to app and observe clean navbar
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');

    // Pause so user's naked eyes can observe the initial clean, empty navbar
    await page.waitForTimeout(2000);

    // Verify top navbar center is clean and empty initially (no permanent static tags)
    const checkingText = page.locator('div[data-tauri-drag-region]').getByText('Checking updates...', { exact: true });
    const upToDateHeaderPill = page.locator('div[data-tauri-drag-region]').getByRole('button', { name: /up to date/i });
    await expect(checkingText).toHaveCount(0);
    await expect(upToDateHeaderPill).toHaveCount(0);

    // 2. Click "Check updates" in sidebar
    const checkUpdatesBtn = page.getByRole('button', { name: /check updates/i });
    await expect(checkUpdatesBtn).toBeVisible();
    await checkUpdatesBtn.click();

    // 3. Observe dynamic "Checking updates..." spinner in navbar center
    await expect(checkingText).toBeVisible({ timeout: 3000 });
    // Pause so user sees checking spinner live
    await page.waitForTimeout(1500);

    // 4. Observe dynamic "Up to date" pill in navbar center
    await expect(upToDateHeaderPill).toBeVisible({ timeout: 6000 });
    // Pause so user sees the verified update status live in the center of the navbar
    await page.waitForTimeout(2500);

    // 5. Test interactive pill: Click the "Up to date" pill to open What's New patch notes
    await upToDateHeaderPill.click();
    await expect(page.getByText("What's New")).toBeVisible({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await expect(page.getByText("What's New")).toHaveCount(0);

    // 7. Test auto-vanish: Trigger check updates once more
    await checkUpdatesBtn.click();
    await expect(upToDateHeaderPill).toBeVisible({ timeout: 5000 });

    // 8. Wait for auto-vanish (4.5s) without clicking anything
    await page.waitForTimeout(4600);

    // 9. Verify it automatically vanished on its own
    await expect(upToDateHeaderPill).toHaveCount(0);
    await page.waitForTimeout(1500);

    // 10. Test in Dark Mode live
    const darkModeBtn = page.getByRole('button', { name: /dark mode/i });
    if (await darkModeBtn.isVisible()) {
      await darkModeBtn.click();
      await page.waitForTimeout(1500);

      // Trigger check updates in dark mode
      await checkUpdatesBtn.click();
      await expect(upToDateHeaderPill).toBeVisible({ timeout: 5000 });
      // Pause so user sees sleek dark mode update status in navbar
      await page.waitForTimeout(2500);

      // Wait for auto-vanish in dark mode
      await page.waitForTimeout(4600);
      await expect(upToDateHeaderPill).toHaveCount(0);
      await page.waitForTimeout(1000);

      // Switch back to light mode
      const lightModeBtn = page.getByRole('button', { name: /light mode/i });
      if (await lightModeBtn.isVisible()) {
        await lightModeBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});
