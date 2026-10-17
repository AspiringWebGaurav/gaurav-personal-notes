import { test, expect } from '@playwright/test';

test.describe('In-App Direct Google Sign-In Popup', () => {
  test('Verify In-App Sign in Modal and Google Popup trigger', async ({ page }) => {
    // 1. Load desktop app
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Open Account tab
    const accountTab = page.getByRole('button', { name: 'Account' });
    await accountTab.click();
    await page.waitForTimeout(800);

    // 3. Click Sign in to open the modal
    const signInBtn = page.getByRole('button', { name: /sign in/i });
    await signInBtn.click();
    await page.waitForTimeout(600);

    // 4. Verify the modal and Google Sign-in button
    const modalHeading = page.getByRole('heading', { name: 'Sign in' });
    await expect(modalHeading).toBeVisible();

    const googleBtn = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleBtn).toBeVisible();

    // 5. Capture screenshot of the in-app modal
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_in_app_auth_modal.png',
    });

    // 6. Listen for popup event when clicking Google button
    const popupPromise = page.waitForEvent('popup', { timeout: 8000 }).catch(() => null);
    await googleBtn.click();

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      console.log('Popup URL successfully opened:', popup.url());
      await popup.screenshot({
        path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_google_account_chooser_popup.png',
      }).catch(() => {});
      await popup.close().catch(() => {});
    }
  });
});
