import { expect } from '@playwright/test';
import { expectFitsWidth, pickFirstCard, seedSettings, startSession } from './support/app';
import { test } from './support/microphone';

/** The fake microphone picks a C4 and bends it a whole step to D4, every two seconds. */
test.use({ recording: 'bendCtoD' });

test('hears a bend held in tune, on a phone', async ({ micPage: page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  // The only card is a whole step on the G string; its first fret, the 5th, is a C.
  await seedSettings(page, 'bends', { strings: [3], sizes: [2], maxFret: 12, target: 'ask' });
  await pickFirstCard(page);
  await startSession(page, 'bends');
  await expect(page.getByRole('heading', { name: 'C → D' })).toBeVisible();
  await expectFitsWidth(page, 'A bend asked for');

  await expect(page.getByText(/In tune: .*, held for half a second/)).toBeVisible({
    timeout: 10_000,
  });
  await expectFitsWidth(page, 'A bend held');
});
