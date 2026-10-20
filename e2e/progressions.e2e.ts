import { expect } from '@playwright/test';
import { expectFitsWidth, seedSettings, startSession } from './support/app';
import { test } from './support/microphone';

/** The fake microphone strums an open C, then an open G, a second apart, over and over. */
test.use({ recording: 'changesCG' });

test('a take of a progression is scored chord by chord, on a phone', async ({ micPage: page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  // C then G, two beats each at 60 bpm: a chord every 2 seconds, 4 in the take.
  await seedSettings(page, 'progressions', {
    presets: [],
    custom: 'C G',
    beatsPerChord: 2,
    startTempo: 60,
  });
  await startSession(page, 'progressions');
  await expect(page.getByRole('heading', { name: /C G/ })).toBeVisible();
  await expectFitsWidth(page, 'A progression');
  await page.getByRole('button', { name: /Play/ }).click();

  // The strums fall wherever the recording happens to be against the metronome, so whether a
  // chord is on time is up to chance. But each chord's two seconds hold a strum of it: heard
  // and recognised, none is missed.
  const summary = page.getByText(/^\d of 4 chords on the beat/);
  await expect(summary).toBeVisible({ timeout: 20_000 });
  await expect(summary).not.toContainText('missed');
  await expect(page.getByText(/^(Passed|Not yet)\./)).toBeVisible();
  await expectFitsWidth(page, 'A progression take');
});
