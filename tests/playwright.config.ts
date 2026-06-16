import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://manar.cloud-stacks.com';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,
  reporter: [['html'], ['list']],
  timeout: 60000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 45000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
      },
    },
  ],
});
