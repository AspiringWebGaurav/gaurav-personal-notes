import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1420',
    headless: false,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'msedge',
      use: {
        channel: 'msedge',
        headless: false,
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'npm run dev:frontend',
    port: 1420,
    reuseExistingServer: true,
    timeout: 15000,
  },
});
