import { test, expect } from '@playwright/test';

test.describe('Cross-Platform Co-op Collaboration - End-to-End Multi-Device Suite', () => {
  test.describe.configure({ timeout: 60000 });

  // 1. App-to-App Real-time Collaboration (Desktop Instance A <-> Desktop Instance B)
  test('1. App-to-App: Two independent desktop instances sync edits and peer awareness in real time', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Desktop A opens app and creates room
      await pageA.goto('http://127.0.0.1:1420');
      await pageA.waitForSelector('text=gpn', { state: 'visible' });

      const coopHomeBtn = pageA.locator('button:has-text("Co-op Note")').first();
      await coopHomeBtn.click();
      await expect(pageA.locator('h1:has-text("Co-op Sessions")')).toBeVisible();

      // Click Create Room
      await pageA.locator('button:has-text("Create Room")').first().click();

      // Wait for CollabEditor canvas to mount
      const editorA = pageA.locator('.ProseMirror').first();
      await expect(editorA).toBeVisible({ timeout: 15000 });

      // Extract Room ID
      const roomIdBtn = pageA.locator('button[title="Click to copy room code"]').first();
      await expect(roomIdBtn).toBeVisible();
      const roomId = (await roomIdBtn.innerText()).trim();
      expect(roomId.length).toBeGreaterThanOrEqual(4);

      // Desktop B opens app and joins room
      await pageB.goto('http://127.0.0.1:1420');
      await pageB.waitForSelector('text=gpn', { state: 'visible' });

      const coopSidebarBtn = pageB.locator('aside button:has-text("Co-op")').first();
      await coopSidebarBtn.click();
      await expect(pageB.locator('h1:has-text("Co-op Sessions")')).toBeVisible();

      const inputB = pageB.locator('input[placeholder="ENTER ROOM CODE"]');
      await inputB.fill(roomId);
      await pageB.locator('button:has-text("Join Room")').click();

      // Desktop B editor mounts
      const editorB = pageB.locator('.ProseMirror').first();
      await expect(editorB).toBeVisible({ timeout: 15000 });

      // Desktop A types message
      await editorA.click();
      await pageA.keyboard.type('Desktop Client A: Real-time P2P sync initialized.');

      // Desktop B editor receives Desktop A's text via real-time WebRTC P2P
      await expect(editorB).toContainText('Desktop Client A: Real-time P2P sync initialized.', { timeout: 20000 });

      // Desktop B types response
      await editorB.click();
      await pageB.keyboard.press('Enter');
      await pageB.keyboard.type('Desktop Client B: Received on separate desktop instance with zero latency.');

      // Desktop A sees Desktop B's response in real time
      await expect(editorA).toContainText('Desktop Client B: Received on separate desktop instance with zero latency.', { timeout: 20000 });

      // Verify peer status reflects connected state
      await expect(pageA.locator('text=P2P Live').or(pageA.locator('text=peers'))).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('text=P2P Live').or(pageB.locator('text=peers'))).toBeVisible({ timeout: 10000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  // 2. Website-to-App Real-time Collaboration (Web Dashboard Host -> Desktop App Guest)
  test('2. Website-to-App: Web dashboard host creates session and syncs bidirectionally with desktop app', async ({ browser }) => {
    const webContext = await browser.newContext();
    const appContext = await browser.newContext();
    const webPage = await webContext.newPage();
    const appPage = await appContext.newPage();

    try {
      // 1. Web host navigates to collab lobby
      await webPage.goto('http://localhost:3000/dashboard/collab');
      await expect(webPage.locator('h1:has-text("Co-op Sessions")')).toBeVisible({ timeout: 15000 });

      // 2. Web host creates room
      await webPage.locator('button:has-text("Create Room")').first().click();

      // Wait for URL transition to dynamic room
      await webPage.waitForURL(/\/dashboard\/collab\/[A-Z0-9]+/, { timeout: 15000 });
      const webUrl = webPage.url();
      const roomId = webUrl.split('/').pop()?.toUpperCase() || '';
      expect(roomId.length).toBeGreaterThanOrEqual(4);

      // 3. Web editor mounts
      const webEditor = webPage.locator('.ProseMirror').first();
      await expect(webEditor).toBeVisible({ timeout: 15000 });

      // 4. Desktop app opens and joins room
      await appPage.goto('http://127.0.0.1:1420');
      await appPage.waitForSelector('text=gpn', { state: 'visible' });

      await appPage.locator('aside button:has-text("Co-op")').first().click();
      await expect(appPage.locator('h1:has-text("Co-op Sessions")')).toBeVisible();

      const input = appPage.locator('input[placeholder="ENTER ROOM CODE"]');
      await input.fill(roomId);
      await appPage.locator('button:has-text("Join Room")').click();

      // 5. Desktop app editor mounts
      const appEditor = appPage.locator('.ProseMirror').first();
      await expect(appEditor).toBeVisible({ timeout: 15000 });

      // 6. Web host types message
      await webEditor.click();
      await webPage.keyboard.type('Web Dashboard Host: Broadcast message from Chrome browser.');

      // Desktop app verifies receipt via P2P
      await expect(appEditor).toContainText('Web Dashboard Host: Broadcast message from Chrome browser.', { timeout: 20000 });

      // 7. Desktop app types reply
      await appEditor.click();
      await appPage.keyboard.press('Enter');
      await appPage.keyboard.type('Desktop App Guest: Received seamlessly on PC App.');

      // 8. Web host receives Desktop reply
      await expect(webEditor).toContainText('Desktop App Guest: Received seamlessly on PC App.', { timeout: 20000 });
    } finally {
      await webContext.close();
      await appContext.close();
    }
  });

  // 3. App-to-Website Real-time Collaboration (Desktop App Host -> Mobile Web Guest)
  test('3. App-to-Website: Desktop app host creates room and mobile web guest participates with zero latency', async ({ browser }) => {
    const appContext = await browser.newContext();
    // Emulate iPhone / Mobile viewport for mobile web guest
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    const appPage = await appContext.newPage();
    const mobilePage = await mobileContext.newPage();

    try {
      // 1. Desktop app creates room
      await appPage.goto('http://127.0.0.1:1420');
      await appPage.waitForSelector('text=gpn', { state: 'visible' });

      await appPage.locator('button:has-text("Co-op Note")').first().click();
      await appPage.locator('button:has-text("Create Room")').first().click();

      const appEditor = appPage.locator('.ProseMirror').first();
      await expect(appEditor).toBeVisible({ timeout: 15000 });

      const roomIdBtn = appPage.locator('button[title="Click to copy room code"]').first();
      await expect(roomIdBtn).toBeVisible();
      const roomId = (await roomIdBtn.innerText()).trim();

      // 2. Mobile web navigates to mobile collab lobby
      await mobilePage.goto('http://localhost:3000/mobile/collab');
      await expect(mobilePage.locator('h1:has-text("Co-op Sessions")')).toBeVisible({ timeout: 15000 });

      const mobileInput = mobilePage.locator('input[placeholder="ENTER ROOM CODE"]');
      await mobileInput.fill(roomId);
      await mobilePage.locator('button:has-text("Join Room")').click();

      // 3. Mobile editor mounts
      const mobileEditor = mobilePage.locator('.ProseMirror').first();
      await expect(mobileEditor).toBeVisible({ timeout: 15000 });

      // 4. Desktop host types message
      await appEditor.click();
      await appPage.keyboard.type('Desktop Host: Originating session from native desktop client.');

      // Mobile guest receives text
      await expect(mobileEditor).toContainText('Desktop Host: Originating session from native desktop client.', { timeout: 20000 });

      // 5. Mobile types reply
      await mobileEditor.click();
      await mobilePage.keyboard.press('Enter');
      await mobilePage.keyboard.type('Mobile Guest: Connected from smartphone mobile view.');

      // 6. Desktop host sees mobile reply
      await expect(appEditor).toContainText('Mobile Guest: Connected from smartphone mobile view.', { timeout: 20000 });
    } finally {
      await appContext.close();
      await mobileContext.close();
    }
  });

  // 4. Website-to-Website Cross-Platform (Desktop Web <-> Mobile Web)
  test('4. Website-to-Website: Desktop web and mobile web collaborate seamlessly in the same room', async ({ browser }) => {
    const desktopWebContext = await browser.newContext();
    const mobileWebContext = await browser.newContext({
      viewport: { width: 393, height: 852 },
    });
    const desktopPage = await desktopWebContext.newPage();
    const mobilePage = await mobileWebContext.newPage();

    try {
      // 1. Desktop web creates room
      await desktopPage.goto('http://localhost:3000/dashboard/collab');
      await desktopPage.locator('button:has-text("Create Room")').first().click();

      await desktopPage.waitForURL(/\/dashboard\/collab\/[A-Z0-9]+/, { timeout: 15000 });
      const roomId = desktopPage.url().split('/').pop()?.toUpperCase() || '';
      expect(roomId.length).toBeGreaterThanOrEqual(4);

      const desktopEditor = desktopPage.locator('.ProseMirror').first();
      await expect(desktopEditor).toBeVisible({ timeout: 15000 });

      // 2. Mobile web joins
      await mobilePage.goto(`http://localhost:3000/mobile/collab/${roomId}`);
      const mobileEditor = mobilePage.locator('.ProseMirror').first();
      await expect(mobileEditor).toBeVisible({ timeout: 15000 });

      // 3. Desktop web types
      await desktopEditor.click();
      await desktopPage.keyboard.type('Desktop Browser: Initialized web session.');

      // Mobile receives
      await expect(mobileEditor).toContainText('Desktop Browser: Initialized web session.', { timeout: 20000 });

      // 4. Mobile web types
      await mobileEditor.click();
      await mobilePage.keyboard.press('Enter');
      await mobilePage.keyboard.type('Mobile Browser: Verified web-to-web cross-device sync.');

      // Desktop receives
      await expect(desktopEditor).toContainText('Mobile Browser: Verified web-to-web cross-device sync.', { timeout: 20000 });
    } finally {
      await desktopWebContext.close();
      await mobileWebContext.close();
    }
  });

  // 5. Real-time Session Deletion & Remote Disconnect Lifecycle
  test('5. Lifecycle: Session deletion by host triggers real-time closure banner on remote peer', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Host creates room on desktop app
      await hostPage.goto('http://127.0.0.1:1420');
      await hostPage.waitForSelector('text=gpn', { state: 'visible' });
      await hostPage.locator('button:has-text("Co-op Note")').first().click();
      await hostPage.locator('button:has-text("Create Room")').first().click();

      const hostEditor = hostPage.locator('.ProseMirror').first();
      await expect(hostEditor).toBeVisible({ timeout: 15000 });

      const roomIdBtn = hostPage.locator('button[title="Click to copy room code"]').first();
      const roomId = (await roomIdBtn.innerText()).trim();

      // Guest joins from website
      await guestPage.goto(`http://localhost:3000/dashboard/collab/${roomId}`);
      const guestEditor = guestPage.locator('.ProseMirror').first();
      await expect(guestEditor).toBeVisible({ timeout: 15000 });

      // Host deletes session
      const deleteBtn = hostPage.locator('button[title="Close / Delete Session"]').first();
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();

      // Confirm in modal
      const confirmDeleteBtn = hostPage.locator('button:has-text("Close Session")').first();
      await expect(confirmDeleteBtn).toBeVisible();
      await confirmDeleteBtn.click();

      // Guest receives real-time deletion signal and displays "Session Closed"
      await expect(
        guestPage.locator('h2:has-text("Session Closed")').first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
