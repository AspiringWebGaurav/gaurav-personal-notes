import { test, expect } from '@playwright/test';

test.describe('Co-op Collaborative Notes - Desktop Cross-Device Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to hydrate
    await page.waitForSelector('text=gpn', { state: 'visible' });
  });

  test('1. Co-op Note button in Home view navigates directly to Co-op Lobby', async ({ page }) => {
    // Click on Co-op Note button in the Fast Action Row
    const coopHomeBtn = page.locator('button:has-text("Co-op Note")').first();
    await expect(coopHomeBtn).toBeVisible();
    await coopHomeBtn.click();

    // Verify Co-op Lobby mounts cleanly
    await expect(page.locator('h1:has-text("Co-op Sessions")')).toBeVisible();
    await expect(page.locator('text=Start a New Session')).toBeVisible();
    await expect(page.locator('text=Join Existing Session')).toBeVisible();
    await expect(page.locator('text=Active Sessions')).toBeVisible();
  });

  test('2. Sidebar navigation includes Co-op tab and opens Lobby', async ({ page }) => {
    // Click on Co-op in Sidebar
    const coopTab = page.locator('aside button:has-text("Co-op")').first();
    await expect(coopTab).toBeVisible();
    await coopTab.click();

    // Verify Lobby contents
    await expect(page.locator('h1:has-text("Co-op Sessions")')).toBeVisible();
    await expect(page.locator('input[placeholder="ENTER ROOM CODE"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create Room")')).toBeVisible();
    await expect(page.locator('button:has-text("Join Room")')).toBeVisible();
  });

  test('3. Room code validation and P2P room join lifecycle', async ({ page }) => {
    const coopTab = page.locator('aside button:has-text("Co-op")').first();
    await coopTab.click();

    const roomInput = page.locator('input[placeholder="ENTER ROOM CODE"]');
    await roomInput.fill('AB');

    // Button should remain disabled for < 3 characters
    const joinBtn = page.locator('button:has-text("Join Room")');
    await expect(joinBtn).toBeDisabled();

    // Type 4-character room code to join
    await roomInput.fill('TEST');
    await expect(joinBtn).toBeEnabled();
    await joinBtn.click();

    // Expect CollabEditor canvas to mount cleanly
    await expect(page.locator('.ProseMirror').first()).toBeVisible({ timeout: 15000 });
  });
});
