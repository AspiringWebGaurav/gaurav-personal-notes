import { test } from '@playwright/test';

test('wipe database and reset to clean state', async ({ page }) => {
  await page.goto('http://localhost:1420/');
  await page.waitForLoadState('networkidle');

  // Clear in-memory and local storage
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    // If Tauri is active in the window:
    if (window.__TAURI_INTERNALS__) {
      try {
        await window.__TAURI_INTERNALS__.invoke('cmd_clear_local_database');
      } catch (e) {
        console.error('cmd_clear_local_database error:', e);
      }
    }
  });

  await page.reload();
  await page.waitForLoadState('networkidle');

  // Verify notes count is 0
  const noNotesMsg = page.getByText(/no notes in workspace/i);
  await noNotesMsg.waitFor({ state: 'visible', timeout: 5000 });

  await page.screenshot({
    path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/fresh_app_verified.png',
    fullPage: true,
  });
});
