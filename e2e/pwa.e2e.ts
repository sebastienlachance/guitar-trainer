import { Page, expect, test } from '@playwright/test';
import { PAGES_URL } from './support/servers';

/** Resolves once the service worker has stored every file of the app in its cache. */
async function waitForAppCached(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const manifest = await (await fetch('ngsw.json?ngsw-bypass')).json();
          const appFiles: string[] = manifest.assetGroups.find(
            (group: { name: string }) => group.name === 'app',
          ).urls;
          const cached = new Set<string>();
          for (const name of await caches.keys()) {
            for (const request of await (await caches.open(name)).keys()) {
              cached.add(new URL(request.url).pathname);
            }
          }
          return appFiles.filter((file) => !cached.has(file));
        }),
      { message: 'app files not cached yet', timeout: 20_000 },
    )
    .toEqual([]);
}

test.describe('Installable app', () => {
  test.use({ baseURL: PAGES_URL, serviceWorkers: 'allow' });

  test('links a manifest whose icons load', async ({ page, request }) => {
    await page.goto('./');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');

    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({
      name: 'Guitar trainer',
      display: 'standalone',
      start_url: './',
    });
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    }
  });

  test('keeps working offline once loaded', async ({ page, context }) => {
    await page.goto('./');
    await waitForAppCached(page);

    await context.setOffline(true);
    // The network really is gone, for the service worker too.
    expect(
      await page.evaluate(() =>
        fetch('ngsw.json?ngsw-bypass').then(
          () => 'online',
          () => 'offline',
        ),
      ),
    ).toBe('offline');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Guitar trainer' })).toBeVisible();
    // A module's code loads on demand, so this proves the lazy chunks were cached too.
    await page.getByRole('link', { name: /Identify scales/ }).click();
    await expect(page.getByRole('button', { name: 'Start session' })).toBeVisible();
  });
});
