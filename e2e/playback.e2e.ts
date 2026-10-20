import { expect } from '@playwright/test';
import {
  correctResult,
  expectFitsWidth,
  pickFirstCard,
  seedSettings,
  startSession,
} from './support/app';
import { test } from './support/microphone';

/** The fake microphone plays E2 then G♯2, over and over: a major 3rd up from the open low E. */
test.use({ recording: 'eToGSharp' });

test('hears the phrase played back, on a phone', async ({ micPage: page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  // The only card is a major 3rd up; its first note is the lowest one, the open low E.
  await seedSettings(page, 'playback', {
    kinds: ['interval'],
    intervals: ['M3'],
    direction: 'up',
    answer: 'mic',
  });
  await pickFirstCard(page);
  await startSession(page, 'playback');
  await expect(page.getByRole('heading', { name: 'Starts on E' })).toBeVisible();
  await expectFitsWidth(page, 'Play it back question');

  await expect(correctResult(page)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Major 3rd up')).toBeVisible();
  await expectFitsWidth(page, 'Play it back answer');
});
