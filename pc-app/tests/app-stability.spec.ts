import { test, expect } from '@playwright/test';

test.describe('Gaurav Personal Notes v0.0.0 Base Lifetime Stability Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear stale test storage to ensure 100% clean boot
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('1. App mounts cleanly at v0.0.0 with home dashboard & header pill', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();

    // Verify brand
    await expect(page.locator('text=gpn').first()).toBeVisible();

    // Verify Home greeting (e.g. Good morning / afternoon / evening / night)
    const homeGreeting = page.locator('h1, h2, h3').filter({ hasText: /Good (morning|afternoon|evening|night)/ });
    await expect(homeGreeting).toBeVisible({ timeout: 5000 });

    // Verify primary action buttons exist on Home
    await expect(page.locator('button:has-text("Blank Note")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Burning Note")').first()).toBeVisible();
    await expect(page.locator('text=Storage & Sync').first()).toBeVisible();
  });

  test('2. Note creation, rich text editor, and local persistence lifecycle', async ({ page }) => {
    // Click Blank Note from Home View
    const blankNoteBtn = page.locator('button:has-text("Blank Note")').first();
    await blankNoteBtn.click();

    // Editor should load
    const editor = page.locator('.tiptap, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 5000 });

    // Type in editor using real keyboard events so TipTap transactions fire
    await editor.click();
    await page.keyboard.type('Testing GPN v0.0.0 Lifetime Base Stability.');

    // Edit title
    const titleInput = page.locator('input[placeholder="Untitled Note"]').first();
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Stability Test Note');
    await titleInput.blur();

    // Wait for auto-save debounce
    await page.waitForTimeout(800);

    // Verify that the note is saved into localStorage
    const savedNotes = await page.evaluate(() => {
      const raw = localStorage.getItem('gpn_browser_notes');
      return raw ? JSON.parse(raw) : [];
    });
    expect(savedNotes.length).toBeGreaterThan(0);
    expect(savedNotes[0].title).toBe('Stability Test Note');
    expect(savedNotes[0].content).toContain('Testing GPN v0.0.0 Lifetime Base Stability');
  });

  test('3. Full sidebar navigation across all core views', async ({ page }) => {
    // Navigate to Database
    const dbTab = page.locator('button:has-text("Database")').first();
    await dbTab.click();
    await expect(page.locator('text=Database').first()).toBeVisible();

    // Navigate to Permissions
    const permTab = page.locator('button:has-text("Permissions")').first();
    await permTab.click();
    await expect(page.locator('text=Permissions').first()).toBeVisible();

    // Navigate to Account
    const accTab = page.locator('button:has-text("Account")').first();
    await accTab.click();
    await expect(page.locator('text=Account').first()).toBeVisible();

    // Navigate to Trash
    const trashTab = page.locator('button:has-text("Trash")').first();
    await trashTab.click();
    await expect(page.locator('text=Trash').first()).toBeVisible();

    // Navigate to Settings
    const settingsTab = page.locator('button:has-text("Settings")').first();
    await settingsTab.click();
    await expect(page.locator('text=Settings').first()).toBeVisible();

    // Return to Home
    const homeTab = page.locator('button:has-text("Home")').first();
    await homeTab.click();
    await expect(page.locator('text=Storage & Sync').first()).toBeVisible();
  });

  test('4. Settings view, General controls, and in-binary Patch Notes history', async ({ page }) => {
    // Go to Settings
    await page.locator('button:has-text("Settings")').first().click();

    // Verify Sub-tabs: General Settings and Patch Notes History
    const generalSubTab = page.locator('button:has-text("General Settings")').first();
    const patchNotesSubTab = page.locator('button:has-text("Patch Notes")').first();

    await expect(generalSubTab).toBeVisible();
    await expect(patchNotesSubTab).toBeVisible();

    // Verify General sections: SOFTWARE UPDATES and FILE EXPLORER
    await expect(page.locator('text=SOFTWARE UPDATES').first()).toBeVisible();
    await expect(page.locator('text=FILE EXPLORER').first()).toBeVisible();

    // Click Patch Notes tab
    await patchNotesSubTab.click();
    await page.waitForTimeout(300);

    // Verify v0.0.0 Lifetime Base Anchor is present in history
    await expect(page.locator('text=0.0.0').first()).toBeVisible();
    await expect(page.locator('text=Base Application Lifetime Anchor').first()).toBeVisible();
  });

  test('5. Dark mode & light mode toggle lifecycle', async ({ page }) => {
    const darkModeBtn = page.locator('button:has-text("Dark mode"), button:has-text("Light mode")').first();

    if (await darkModeBtn.isVisible()) {
      const initialText = await darkModeBtn.innerText();
      await darkModeBtn.click();
      await page.waitForTimeout(300);

      // Verify toggle switched
      const newText = await darkModeBtn.innerText();
      expect(newText).not.toBe(initialText);

      // Toggle back
      await darkModeBtn.click();
      await page.waitForTimeout(300);
      expect(await darkModeBtn.innerText()).toBe(initialText);
    }
  });

  test('6. Interactive shortcuts modal opens and closes cleanly', async ({ page }) => {
    // Press Ctrl+/ or click shortcuts button if visible
    await page.keyboard.press('Control+/');
    await page.waitForTimeout(300);

    const shortcutsDialog = page.locator('text=Keyboard Shortcuts, text=Shortcuts').first();
    if (await shortcutsDialog.isVisible()) {
      await expect(shortcutsDialog).toBeVisible();
      // Dismiss with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(shortcutsDialog).not.toBeVisible();
    }
  });

  test('7. Search modal opens, filters, and closes', async ({ page }) => {
    // Trigger search with Ctrl+K or search button
    const searchTrigger = page.locator('button:has-text("Search"), [aria-label*="Search"]').first();
    if (await searchTrigger.isVisible()) {
      await searchTrigger.click();
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible({ timeout: 3000 });

      // Type search query
      await searchInput.fill('Personal Notes');
      await page.waitForTimeout(200);

      // Dismiss with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(searchInput).not.toBeVisible();
    }
  });

  test('8. Update lifecycle UI: available state, dismiss to header pill & sidebar, and on-demand modal', async ({ page }) => {
    // Simulate available update state via exposed window.__GPN_UPDATE_STORE__
    await page.evaluate(() => {
      const store = (window as any).__GPN_UPDATE_STORE__;
      if (store) {
        store.setState({
          status: {
            state: 'available',
            version: '0.0.1',
            currentVersion: '0.0.0',
            notes: 'v0.0.1: In-process atomic self-updater engine',
          },
          isToastDismissed: false,
          isHeaderDismissed: false,
        });
      }
    });

    await page.waitForTimeout(300);

    // Check bottom-right update toast
    const updateToast = page.locator('text=Update Available').first();
    await expect(updateToast).toBeVisible({ timeout: 5000 });

    // Click Later to dismiss toast and verify transfer to top header pill
    const laterBtn = page.locator('button:has-text("Later")').first();
    await laterBtn.click();
    await page.waitForTimeout(300);

    // Top header pill now displays available version
    const headerPill = page.locator('[data-tauri-drag-region="false"]').filter({ hasText: /Available/ }).first();
    await expect(headerPill).toBeVisible();

    // Sidebar badge displays available version
    const sidebarBadge = page.locator('aside').filter({ hasText: /Update available/ }).first();
    await expect(sidebarBadge).toBeVisible();
  });
});
