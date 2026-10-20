import { expect } from '@playwright/test';
import { expectFitsWidth, seedSettings, startSession } from './support/app';
import { test } from './support/microphone';

/** The fake microphone strums an open C, then an open G, a second apart, over and over. */
test.use({ recording: 'changesCG' });

test('counts the changes it hears, on a phone', async ({ micPage: page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await seedSettings(page, 'changes', { chords: ['C', 'G'], seconds: 30, count: 'mic' });
  await page.goto('/#/changes');
  await expectFitsWidth(page, 'Chord changes setup');

  await startSession(page, 'changes');
  await page.getByRole('button', { name: 'Start Space' }).click();

  await expect(page.getByText(/^\s*([3-9]|\d\d) changes\s*$/)).toBeVisible({ timeout: 15_000 });
  await expectFitsWidth(page, 'Chord changes take');
});
