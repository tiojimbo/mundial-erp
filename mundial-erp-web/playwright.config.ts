/**
 * Playwright config — Mundial ERP web (PLANO-TASKS §14.2).
 *
 * Convencao:
 *   - specs em `e2e/` com sufixo `.spec.ts`.
 *   - placeholders Sprint 0 com sufixo `.spec.ts.skip` — ignorado pelo
 *     testMatch abaixo.
 *   - baseURL aponta para o dev server local; override via PLAYWRIGHT_BASE_URL
 *     em CI/staging.
 */

import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
