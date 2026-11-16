import { defineConfig, devices } from '@playwright/test';

/** Run FastAPI on port 8000 and Vite on port 5173 before running these tests. */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
