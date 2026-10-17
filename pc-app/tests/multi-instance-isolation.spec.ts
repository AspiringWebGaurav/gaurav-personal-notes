import { test, expect } from '@playwright/test';

test.describe('4-Instance Machine Isolation & Independent Download Lifecycle', () => {
  test('Open 4 separate isolated app instances on same network: Clicking download on one instance never triggers the other 3 instances', async ({ browser }) => {
    // 1. Create 4 completely isolated browser contexts (representing 4 separate physical machines on the same Wi-Fi)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    const context4 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();
    const page4 = await context4.newPage();

    const pages = [page1, page2, page3, page4];

    // Dummy 64KB binary buffer for mock download
    const mockBinaryBytes = Buffer.alloc(65536, 0x42);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      await page.addInitScript((instanceIndex) => {
        (window as any).__PLAYWRIGHT_TEST__ = true;
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('gpn_machine_instance_id', `physical-machine-node-${instanceIndex + 1}`);
      }, i);

      // Mock release manifest: v0.99.0 available
      await page.route('**/api/v1/releases/gpn/latest*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            version: '0.99.0',
            notes: 'v0.99.0: Multi-instance isolation release',
            pub_date: new Date().toISOString(),
            platforms: {
              'windows-x86_64': {
                url: 'https://gphost.eu.cc/api/v1/releases/gpn/download/0.99.0',
              },
            },
          }),
        });
      });

      // Mock binary download endpoint
      await page.route('**/api/v1/releases/gpn/download/0.99.0*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/octet-stream',
          body: mockBinaryBytes,
        });
      });
    }

    // 2. Open all 4 instances simultaneously
    await Promise.all(pages.map((p) => p.goto('/')));
    await Promise.all(pages.map((p) => p.waitForLoadState('domcontentloaded')));

    // 3. Verify all 4 instances discover update v0.0.13 and display "Update Available"
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const heading = page.getByRole('heading', { name: /Update Available/i });
      await expect(heading).toBeVisible({ timeout: 6000 });
      const downloadBtn = page.getByRole('button', { name: /Download/i });
      await expect(downloadBtn).toBeVisible();
    }

    // 4. Verify each instance has its own unique Machine Instance ID
    const machineIds = await Promise.all(
      pages.map((p) =>
        p.evaluate(() => {
          const store = (window as any).__GPN_UPDATE_STORE__?.getState();
          return store?.status?.machineInstanceId || localStorage.getItem('gpn_machine_instance_id');
        })
      )
    );

    expect(new Set(machineIds).size).toBe(4);
    expect(machineIds[0]).toContain('physical-machine-node-1');
    expect(machineIds[1]).toContain('physical-machine-node-2');
    expect(machineIds[2]).toContain('physical-machine-node-3');
    expect(machineIds[3]).toContain('physical-machine-node-4');

    // 5. CLICK DOWNLOAD ONLY ON INSTANCE 1
    const downloadBtn1 = page1.getByRole('button', { name: /Download/i });
    await downloadBtn1.click();

    // 6. Verify Instance 1 enters downloading state
    await expect(page1.getByRole('heading', { name: /Downloading update/i })).toBeVisible({ timeout: 4000 });

    // 7. STRICT VERIFICATION: Verify Instance 2, 3, and 4 DID NOT DOWNLOAD and remain in 'available' state
    for (const otherPage of [page2, page3, page4]) {
      const heading = otherPage.getByRole('heading', { name: /Update Available/i });
      await expect(heading).toBeVisible();
      const downloadBtn = otherPage.getByRole('button', { name: /Download/i });
      await expect(downloadBtn).toBeVisible();
      // Ensure "Downloading" is NOT present on other machines
      await expect(otherPage.getByRole('heading', { name: /Downloading update/i })).toHaveCount(0);
    }

    // 8. AT A SEPARATE TIME: CLICK DOWNLOAD ON INSTANCE 3
    await page1.waitForTimeout(1500); // 1.5s pause
    const downloadBtn3 = page3.getByRole('button', { name: /Download/i });
    await downloadBtn3.click();

    // Verify Instance 3 enters downloading state
    await expect(page3.getByRole('heading', { name: /Downloading update/i })).toBeVisible({ timeout: 4000 });

    // Verify Instance 2 and 4 STILL DID NOT DOWNLOAD and remain in 'available' state
    for (const stillIdlePage of [page2, page4]) {
      const heading = stillIdlePage.getByRole('heading', { name: /Update Available/i });
      await expect(heading).toBeVisible();
      const downloadBtn = stillIdlePage.getByRole('button', { name: /Download/i });
      await expect(downloadBtn).toBeVisible();
      await expect(stillIdlePage.getByRole('heading', { name: /Downloading update/i })).toHaveCount(0);
    }

    // 9. AT A SEPARATE TIME: CLICK DOWNLOAD ON INSTANCE 2
    await page2.waitForTimeout(1500);
    const downloadBtn2 = page2.getByRole('button', { name: /Download/i });
    await downloadBtn2.click();
    await expect(page2.getByRole('heading', { name: /Downloading update/i })).toBeVisible({ timeout: 4000 });

    // Instance 4 still untouched
    await expect(page4.getByRole('heading', { name: /Update Available/i })).toBeVisible();
    await expect(page4.getByRole('heading', { name: /Downloading update/i })).toHaveCount(0);

    // 10. AT A SEPARATE TIME: CLICK DOWNLOAD ON INSTANCE 4
    await page4.waitForTimeout(1500);
    const downloadBtn4 = page4.getByRole('button', { name: /Download/i });
    await downloadBtn4.click();
    await expect(page4.getByRole('heading', { name: /Downloading update/i })).toBeVisible({ timeout: 4000 });

    // Cleanup contexts
    await context1.close();
    await context2.close();
    await context3.close();
    await context4.close();
  });
});
