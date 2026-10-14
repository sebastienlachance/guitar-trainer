import { expect } from '@playwright/test';
import { seedSettings } from './support/app';
import { test } from './support/microphone';

/**
 * The fake microphone plucks a string every 750 ms, as steady as a player can't be. Its plucks
 * fall at some unknown time relative to the metronome, but always the same one: whatever the
 * engine measures beyond that constant offset is its own imprecision.
 */
test.use({ recording: 'plucks80' });

const QUARTERS_AT_80 = { subdivisions: ['quarter'], startTempo: 80, bars: 2, click: 'sound' };

/** Calibrates in setup and returns how much the strikes varied, in ms. */
async function calibrate(page: import('@playwright/test').Page): Promise<number> {
  await page.goto('/#/rhythm');
  await page.getByRole('button', { name: 'Calibrate' }).click();
  const status = page.getByText(/Your strikes varied by \d+ ms/);
  await expect(status).toBeVisible({ timeout: 20_000 });
  const text = (await status.textContent()) ?? '';
  return Number(/varied by (\d+) ms/.exec(text)?.[1]);
}

// Measured at 3–4 ms through Chromium's fake microphone. 5 ms is a fifth of the narrowest on-time
// tolerance (25 ms): measurement scatter that small doesn't change a score.
test('times strikes within 5 ms', async ({ micPage: page }) => {
  await seedSettings(page, 'rhythm', QUARTERS_AT_80);

  expect(await calibrate(page)).toBeLessThanOrEqual(5);
});

test('a take is scored hit by hit and moves the tempo ladder', async ({ micPage: page }) => {
  await seedSettings(page, 'rhythm', QUARTERS_AT_80);
  await calibrate(page);

  await page.goto('/#/rhythm/practice');
  await page.getByRole('button', { name: 'Start session' }).click();
  await page.getByRole('button', { name: 'Play' }).click();

  // The take starts at a new moment, so the plucks sit at some other constant offset from its
  // beats: whether they count as on time is up to chance, so only the scoring is checked here.
  await expect(page.getByText(/^On time \d+%/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('img', { name: /^On time/ })).toBeVisible();
  await expect(page.getByText(/^(Passed|Not yet)\./)).toBeVisible();
  await expect(page.getByRole('button', { name: /Next/ })).toBeVisible();
});
