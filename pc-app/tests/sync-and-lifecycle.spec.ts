import { test, expect } from '@playwright/test';

test.describe('GPN Lifecycle & Mirror Engine E2E Tests', () => {
  test('Full verification: clean app, note creation, sync toggle, and account modal', async ({ page }) => {
    // 1. Navigate to app
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');

    // 2. Clear browser localStorage and reload for a fresh state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Screenshot initial fresh view
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_initial_fresh.png',
      fullPage: true,
    });

    // 3. Check for "NEW NOTE" or "CREATE NEW NOTE" button
    const newNoteBtn = page.getByRole('button', { name: /new note|create new note/i }).first();
    await expect(newNoteBtn).toBeVisible();
    await newNoteBtn.click();
    await page.waitForTimeout(500);

    // 4. Verify Note Editor appears with Title input
    const titleInput = page.getByPlaceholder('Untitled Note');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Lifecycle Engine Test Note');

    // Verify Saved Locally badge
    await expect(page.getByText('SAVED LOCALLY')).toBeVisible();

    // 5. Test Cloud Sync / Local Only toggle button
    const syncToggleBtn = page.getByRole('button', { name: /cloud sync|local only/i }).first();
    await expect(syncToggleBtn).toBeVisible();

    // Initial state is CLOUD SYNC
    await expect(syncToggleBtn).toContainText(/cloud sync/i);

    // Click toggle to switch to LOCAL ONLY
    await syncToggleBtn.click();
    await page.waitForTimeout(400);
    await expect(syncToggleBtn).toContainText(/local only/i);

    // Screenshot with LOCAL ONLY active
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_local_only_toggle.png',
      fullPage: true,
    });

    // Click toggle again to switch back to CLOUD SYNC
    await syncToggleBtn.click();
    await page.waitForTimeout(400);
    await expect(syncToggleBtn).toContainText(/cloud sync/i);

    // 6. Test Navigation to Account view
    const accountTab = page.getByRole('button', { name: 'Account' });
    await expect(accountTab).toBeVisible();
    await accountTab.click();
    await page.waitForTimeout(500);

    // Verify Account page elements
    await expect(page.getByText('Local Account')).toBeVisible();
    const signInBtn = page.getByRole('button', { name: /sign in/i });
    await expect(signInBtn).toBeVisible();

    // Screenshot Account view
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_account_view.png',
      fullPage: true,
    });

    // 7. Click Sign In to open AuthModal
    await signInBtn.click();
    await page.waitForTimeout(500);

    // Verify AuthModal elements
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();

    // Screenshot Auth modal
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_auth_modal.png',
      fullPage: true,
    });

    // Close modal by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 8. Return to Notes tab and reset database/storage to leave app pristine and fresh
    const notesTab = page.getByRole('button', { name: 'Notes' }).first();
    await notesTab.click();
    await page.waitForTimeout(300);

    // Clean wipe database and storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Final screenshot of clean fresh app
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_final_fresh.png',
      fullPage: true,
    });
  });
});
