import { test, expect } from '@playwright/test';

test.describe('Layout and Viewport Routing', () => {
  test('Desktop viewport redirects mobile paths to root', async ({ page, isMobile }) => {
    // Skip if running on a mobile project
    test.skip(isMobile, 'This test is only for desktop viewports');

    // Attempt to access mobile page
    await page.goto('/mobile');

    // Wait for URL to change to root
    await page.waitForURL('http://localhost:3000/');
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('Mobile viewport redirects root to mobile', async ({ page, isMobile }) => {
    // Skip if running on a desktop project
    test.skip(!isMobile, 'This test is only for mobile viewports');

    // Attempt to access root page
    await page.goto('/');

    // Wait for URL to change to mobile (or mobile login)
    await page.waitForURL(/.*\/mobile.*/);
    expect(page.url()).toContain('/mobile');
  });
});
