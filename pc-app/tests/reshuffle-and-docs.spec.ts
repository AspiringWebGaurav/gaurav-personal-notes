import { test, expect } from '@playwright/test';

test.describe('Reshuffled Sidebar & GitHub-style Docs Live Verification', () => {
  test('Verify Account 2nd, Database 3rd, Docs in bottom section, and GitHub Docs UI/UX', async ({ page }) => {
    // 1. Navigate to app
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');

    // Pause for human visibility
    await page.waitForTimeout(2000);

    // 2. Verify reshuffled sidebar navigation order
    const navButtons = page.locator('aside nav button');
    await expect(navButtons.nth(0)).toContainText('Notes');
    await expect(navButtons.nth(1)).toContainText('Account');
    await expect(navButtons.nth(2)).toContainText('Database');
    await expect(navButtons.nth(3)).toContainText('Permissions');
    await expect(navButtons.nth(4)).toContainText('Trash');

    // Screenshot showing reshuffled tabs (Account 2nd, Database 3rd)
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_reshuffled_sidebar.png',
    });

    // 3. Verify Docs button in the bottom section below FAQ
    const docsBtn = page.getByRole('button', { name: 'Docs', exact: true });
    await expect(docsBtn).toBeVisible();

    // 4. Click Docs to open GitHub-style documentation view
    await docsBtn.click();
    await page.waitForTimeout(1500);

    // Verify GitHub documentation header breadcrumbs
    await expect(page.getByText('README.md')).toBeVisible();
    await expect(page.getByText('v0.0.1', { exact: true })).toBeVisible();

    // Verify Sticky TOC / Index exists
    const tocSection = page.locator('aside:has-text("On this page")');
    await expect(tocSection).toBeVisible();

    // Screenshot of GitHub-style Docs View in Light Mode
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_docs_view_light.png',
      fullPage: true,
    });

    // 5. Click an index item to test smooth-scroll action
    const gphostTopicBtn = page.getByRole('button', { name: /gphost image & video storage/i });
    if (await gphostTopicBtn.isVisible()) {
      await gphostTopicBtn.click();
      await page.waitForTimeout(1200);
      await expect(page.getByRole('heading', { name: /gphost image & video storage/i })).toBeVisible();
    }

    // 6. Test copy button on code snippet
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      await page.waitForTimeout(600);
    }

    // 7. Test Dark Mode GitHub-style Docs
    const darkModeBtn = page.getByRole('button', { name: /dark mode/i });
    if (await darkModeBtn.isVisible()) {
      await darkModeBtn.click();
      await page.waitForTimeout(1500);

      // Screenshot in Dark Mode
      await page.screenshot({
        path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_docs_view_dark.png',
        fullPage: true,
      });

      // Switch back to light mode
      const lightModeBtn = page.getByRole('button', { name: /light mode/i });
      if (await lightModeBtn.isVisible()) {
        await lightModeBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});
