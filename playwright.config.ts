import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;

/**
 * End-to-end smoke tests: only what the jsdom component tests can't check (real layout, real
 * clicks, the microphone with fake audio, reloads, the production build). See the README.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/support/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The optimised production build, on its own port so the dev server on 4200 can keep running.
    command: `npx ng serve --configuration production --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
