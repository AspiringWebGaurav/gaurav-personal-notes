import { test, expect } from '@playwright/test';

test.describe('Window Close Hover Effect & External Website Docs', () => {
  test('Verify red/rose hover effect on window close X and external docs link', async ({ page }) => {
    // 1. Open app
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(1500);

    // 2. Locate top-right window close button [✕]
    const closeBtn = page.locator('div[data-tauri-drag-region] button[title="Minimize to System Tray"]');
    await expect(closeBtn).toBeVisible();

    // 3. Hover over the [✕] close button
    await closeBtn.hover();
    await page.waitForTimeout(800);

    // Capture screenshot showing the red/rose hover effect
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_close_hover_red.png',
    });

    // 4. Verify 5 core tabs in sidebar (clean, no in-app docs page)
    const navButtons = page.locator('aside nav button');
    await expect(navButtons).toHaveCount(5);
    await expect(navButtons.nth(0)).toContainText('Notes');
    await expect(navButtons.nth(1)).toContainText('Account');
    await expect(navButtons.nth(2)).toContainText('Database');
    await expect(navButtons.nth(3)).toContainText('Permissions');
    await expect(navButtons.nth(4)).toContainText('Trash');

    // 5. Verify Docs button in bottom utility section
    const docsBtn = page.getByRole('button', { name: /docs/i });
    await expect(docsBtn).toBeVisible();

    // Hover over Docs button to show external arrow animation
    await docsBtn.hover();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_docs_button_hover.png',
    });

    // 6. Test in dark mode
    const darkModeBtn = page.getByRole('button', { name: /dark mode/i });
    if (await darkModeBtn.isVisible()) {
      await darkModeBtn.click();
      await page.waitForTimeout(800);

      // Hover over [✕] in dark mode
      await closeBtn.hover();
      await page.waitForTimeout(800);

      await page.screenshot({
        path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_close_hover_dark_red.png',
      });

      // Switch back to light mode
      const lightModeBtn = page.getByRole('button', { name: /light mode/i });
      if (await lightModeBtn.isVisible()) {
        await lightModeBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
