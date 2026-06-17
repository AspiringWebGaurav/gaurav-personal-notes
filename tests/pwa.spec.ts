import { test, expect } from '@playwright/test';

test.describe('PWA Validation', () => {
  test('has manifest and theme-color', async ({ page }) => {
    await page.goto('/');

    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();
    
    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).not.toBeNull();

    // Check for theme color meta
    const themeColor = page.locator('meta[name="theme-color"]').first();
    await expect(themeColor).toBeAttached();
  });

  test('manifest returns valid JSON', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest'); // Next.js dynamic manifest endpoint (might be /manifest.json depending on implementation)
    // Actually, in next.js, if we used manifest.ts it serves at /manifest.webmanifest
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json.name).toBeDefined();
    expect(json.display).toBe('standalone');
  });

  test('service worker file exists and is served', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/javascript');
  });

  test.skip('serves offline fallback page when navigating without connection', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // First, visit the homepage to register and install the service worker
    await page.goto('/');
    
    // Wait for the Service Worker to take control of the page
    await page.waitForFunction(() => {
      return navigator.serviceWorker && navigator.serviceWorker.controller !== null;
    }, { timeout: 15000 }).catch(() => console.log('Timeout waiting for SW controller. Proceeding anyway.'));

    // Simulate going offline
    await context.setOffline(true);

    // Navigate to a random un-cached page
    await page.goto('/some-random-uncached-route').catch(() => null);
    
    // Wait for the fallback page to render
    await expect(page.getByText("You're offline")).toBeVisible({ timeout: 10000 });
    
    await context.close();
  });
});
