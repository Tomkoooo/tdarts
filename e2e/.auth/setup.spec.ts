import { test as setup, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  E2E_AUTH_STATE_PATH,
  getAuthCredentials,
  loginWithUi,
} from '../fixtures/auth';

setup('authenticate and store session', async ({ page }) => {
  const creds = getAuthCredentials();
  expect(creds.email).toBeTruthy();
  expect(creds.password).toBeTruthy();

  await loginWithUi(page);
  await expect(page).not.toHaveURL(/\/auth\/login/);
  await fs.mkdir(path.dirname(E2E_AUTH_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: E2E_AUTH_STATE_PATH });
});
