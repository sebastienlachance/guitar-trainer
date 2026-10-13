import { defineConfig, devices } from '@playwright/test';
import { APP_PORT, PAGES_BASE, PAGES_PORT, PAGES_URL } from './e2e/support/servers';

/**
 * End-to-end smoke tests: only what the jsdom component tests can't check (real layout, real
 * clicks, the microphone with fake audio, reloads, the production build, the service worker).
 * See the README.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/support/global-setup.ts',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    // Only e2e/pwa.e2e.ts runs the service worker, against the real build.
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The optimised production build, on its own port so the dev server on 4200 can keep running.
      command: `npx ng serve --configuration production --port ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
    {
      // Always rebuilt, so the service worker test never runs against a stale build.
      command:
        `npx ng build --base-href ${PAGES_BASE} --output-path dist/e2e-pages && ` +
        `node e2e/support/serve-build.mjs dist/e2e-pages/browser ${PAGES_PORT} ${PAGES_BASE}`,
      url: PAGES_URL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
