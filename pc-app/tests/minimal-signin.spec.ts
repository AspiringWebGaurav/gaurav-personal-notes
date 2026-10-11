import { test, expect } from '@playwright/test';

test.describe('Minimal Sign In Modal', () => {
  test('Verify minimal sign-in modal with simple words and Google button', async ({ page }) => {
    // 1. Open app
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    // 2. Navigate to Account tab
    const accountTab = page.getByRole('button', { name: 'Account' });
    await expect(accountTab).toBeVisible();
    await accountTab.click();
    await page.waitForTimeout(1000);

    // 3. Click Sign in button to open the AuthModal
    const signInBtn = page.getByRole('button', { name: /sign in/i });
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();
    await page.waitForTimeout(1000);

    // 4. Verify minimal modal: Simple header "Sign in", no heavy words
    const modalHeading = page.getByRole('heading', { name: 'Sign in' });
    await expect(modalHeading).toBeVisible();

    // Verify subtitle is simple
    await expect(page.getByText('Sign in to sync your notes.')).toBeVisible();

    // Verify Google button
    const googleBtn = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleBtn).toBeVisible();

    // Hover on Google button
    await googleBtn.hover();
    await page.waitForTimeout(800);

    // Screenshot Light Mode
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_minimal_signin_light.png',
    });

    // 5. Close modal
    const closeBtn = page.getByRole('button', { name: 'Close' });
    await closeBtn.click();
    await page.waitForTimeout(800);

    // 6. Switch to Dark Mode
    const darkModeBtn = page.getByRole('button', { name: /dark mode/i });
    if (await darkModeBtn.isVisible()) {
      await darkModeBtn.click();
      await page.waitForTimeout(800);

      // Re-open Sign in modal in Dark Mode
      await signInBtn.click();
      await page.waitForTimeout(1000);

      // Hover on Google button in Dark Mode
      await googleBtn.hover();
      await page.waitForTimeout(800);

      // Screenshot Dark Mode
      await page.screenshot({
        path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_minimal_signin_dark.png',
      });

      // Switch back to light mode
      await closeBtn.click();
      await page.waitForTimeout(500);
      const lightModeBtn = page.getByRole('button', { name: /light mode/i });
      if (await lightModeBtn.isVisible()) {
        await lightModeBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
