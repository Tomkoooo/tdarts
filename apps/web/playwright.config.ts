import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const authStatePath = 'e2e/.auth/user.json';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.auth\/setup\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: /.*\.auth\/setup\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-auth',
      testIgnore: /.*\.auth\/setup\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStatePath,
      },
    },
  ],
  webServer: {
    command: 'pnpm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      ALLOW_E2E_SSE_TEST: process.env.ALLOW_E2E_SSE_TEST ?? '',
      JWT_SECRET: process.env.JWT_SECRET ?? 'ci-test-secret-not-for-production',
      MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/tdarts_ci',
      MONGODB_DB_NAME: process.env.MONGODB_DB_NAME ?? 'tdarts_ci',
      SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION ?? '1',
    },
  },
});
