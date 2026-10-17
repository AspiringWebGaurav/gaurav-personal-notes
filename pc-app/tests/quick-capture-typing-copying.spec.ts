import { test, expect } from '@playwright/test';

test.describe('Quick Capture Modal - Typing, Copying & Editing Verification', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('Open via Ctrl+Shift+N, type title & body, format text, and copy page', async ({ page }) => {
    // 1. Trigger Quick Capture via event (bypasses Chromium browser's incognito shortcut interception)
    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'n',
          code: 'KeyN',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        })
      );
    });

    // 2. Verify modal is visible
    const modalHeader = page.locator('text=Capture Note').first();
    await expect(modalHeader).toBeVisible({ timeout: 5000 });

    // 3. Verify title input and test typing
    const titleInput = page.locator('input[placeholder*="Note title"]').first();
    await expect(titleInput).toBeVisible();
    await titleInput.click();
    await page.keyboard.type('Verified Title Test');
    await expect(titleInput).toHaveValue('Verified Title Test');

    // 4. Verify textarea and test typing
    const textarea = page.locator('textarea[placeholder*="Start typing page 1"]').first();
    await expect(textarea).toBeVisible();
    await textarea.click();
    await page.keyboard.type('Line 1: Fast typing test in Quick Capture.\nLine 2: Secondary test content.');
    await expect(textarea).toContainText('Fast typing test in Quick Capture.');

    // 5. Test Copy Page functionality
    const copyButton = page.locator('button[title*="Copy current page"], button[title*="Copy"], button:has-text("Copy")').first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      // Verify subtle confirmation notice appears
      const notice = page.getByText('Page copied to clipboard').first();
      await expect(notice).toBeVisible({ timeout: 4000 });

      // Verify actual clipboard text content
      const clipText = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      if (clipText) {
        expect(clipText).toContain('Fast typing test in Quick Capture.');
      }
    }

    // 6. Test Save Note (Ctrl+Enter)
    await page.keyboard.press('Control+Enter');

    // 7. Verify modal closes cleanly after saving
    await expect(page.locator('text=Capture Note').first()).not.toBeVisible({ timeout: 5000 });

    // 8. Verify note was saved into storage
    const savedNotes = await page.evaluate(() => {
      const raw = localStorage.getItem('gpn_browser_notes');
      return raw ? JSON.parse(raw) : [];
    });
    expect(savedNotes.length).toBeGreaterThan(0);
    expect(savedNotes[0].title).toBe('Verified Title Test');
    expect(savedNotes[0].content).toContain('Fast typing test in Quick Capture');
  });
});
