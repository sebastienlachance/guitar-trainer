import { expect } from '@playwright/test';
import { expectFitsWidth } from './support/app';
import { test } from './support/microphone';

test.use({ recording: 'flatA2' });

/** Cents as shown, e.g. "−20 cents" → -20. */
function centsIn(text: string | null): number {
  return Number(/([−+]?\d+) cents?/.exec(text ?? '')?.[1].replace('−', '-'));
}

test('reads a string 20 cents flat to within 2 cents, on a phone', async ({ micPage: page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/tuner');

  await expect(page.getByText('A2, Tune up')).toBeAttached({ timeout: 10_000 });
  const cents = page.getByText(/^[−+]?\d+ cents?$/);
  const readings: number[] = [];
  for (let sample = 0; sample < 10; sample++) {
    readings.push(centsIn(await cents.textContent()));
    await page.waitForTimeout(100);
  }
  for (const reading of readings) {
    expect(Math.abs(reading + 20), `readings: ${readings.join(', ')}`).toBeLessThanOrEqual(2);
  }

  await expect(page.getByRole('listitem').filter({ hasText: 'String 5:' })).toContainText(
    'playing now',
  );
  await expectFitsWidth(page, 'Tuner');
});
