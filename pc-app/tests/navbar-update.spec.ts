import { test, expect } from '@playwright/test';

test.describe('Live Visual Top Navbar Update Status Demonstration', () => {
  test('Live Headed Verification: Clean navbar -> Check updates -> Centered status -> Dismiss & Auto-vanish', async ({ page }) => {
    // 1. Navigate to app and observe clean navbar
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');

    // Pause so user's naked eyes can observe the initial clean, empty navbar
    await page.waitForTimeout(2000);

    // Verify top navbar center is clean and empty initially (no permanent static tags)
    const checkingText = page.getByText('Checking updates...', { exact: true });
    const upToDateText = page.getByText(/You're up to date/i);
    await expect(checkingText).toHaveCount(0);
    await expect(upToDateText).toHaveCount(0);

    // 2. Click "Check updates" in sidebar
    const checkUpdatesBtn = page.getByRole('button', { name: /check updates/i });
    await expect(checkUpdatesBtn).toBeVisible();
    await checkUpdatesBtn.click();

    // 3. Observe dynamic "Checking updates..." spinner in navbar center
    await expect(checkingText).toBeVisible({ timeout: 2000 });
    // Pause so user sees checking spinner live
    await page.waitForTimeout(1500);

    // 4. Observe dynamic "You're up to date" pill in navbar center fitting height
    await expect(upToDateText).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/GPN v0.0.1 is (the latest version|running locally)/i)).toBeVisible();
    // Pause so user sees the verified update status live in the center of the navbar
    await page.waitForTimeout(2500);

    // 5. Test manual close: Click the dismiss button [✕] in navbar
    const dismissBtn = page.locator('div[data-tauri-drag-region] button[title="Dismiss"]');
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();

    // 6. Observe that navbar is immediately clean and empty again
    await expect(upToDateText).toHaveCount(0);
    // Pause so user sees navbar clean after close
    await page.waitForTimeout(2000);

    // 7. Test auto-vanish: Trigger check updates once more
    await checkUpdatesBtn.click();
    await expect(upToDateText).toBeVisible({ timeout: 5000 });

    // 8. Wait for auto-vanish (4.5s) without clicking anything
    await page.waitForTimeout(4600);

    // 9. Verify it automatically vanished on its own
    await expect(upToDateText).toHaveCount(0);
    await page.waitForTimeout(1500);

    // 10. Test in Dark Mode live
    const darkModeBtn = page.getByRole('button', { name: /dark mode/i });
    if (await darkModeBtn.isVisible()) {
      await darkModeBtn.click();
      await page.waitForTimeout(1500);

      // Trigger check updates in dark mode
      await checkUpdatesBtn.click();
      await expect(upToDateText).toBeVisible({ timeout: 5000 });
      // Pause so user sees sleek dark mode update status in navbar
      await page.waitForTimeout(2500);

      // Dismiss in dark mode
      await dismissBtn.click();
      await expect(upToDateText).toHaveCount(0);
      await page.waitForTimeout(2000);

      // Switch back to light mode
      const lightModeBtn = page.getByRole('button', { name: /light mode/i });
      if (await lightModeBtn.isVisible()) {
        await lightModeBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});
