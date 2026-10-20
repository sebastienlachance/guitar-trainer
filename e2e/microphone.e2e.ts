import { expect } from '@playwright/test';
import { correctResult, pickFirstCard, seedSettings, startSession } from './support/app';
import { CSUS4_ONLY, F_SHARP_ON_A, MINOR_THIRD_IN_F_SHARP } from './support/decks';
import { test } from './support/microphone';

const WITH_MIC = { ...F_SHARP_ON_A, micMode: 'play' };
const INTERVAL_WITH_MIC = { ...MINOR_THIRD_IN_F_SHARP, micMode: 'play' };

test.describe('Microphone: playing the asked note', () => {
  test.use({ recording: 'fSharp3' });

  test('answers the card', async ({ micPage: page }) => {
    await seedSettings(page, 'notes', WITH_MIC);
    await startSession(page, 'notes');

    await expect(correctResult(page)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Microphone: playing another note', () => {
  test.use({ recording: 'e3' });

  test('is heard but does not count', async ({ micPage: page }) => {
    await seedSettings(page, 'notes', WITH_MIC);
    await startSession(page, 'notes');

    await expect(page.getByText('Hearing E3')).toBeVisible({ timeout: 10_000 });
    await expect(correctResult(page)).toHaveCount(0);
    await expect(page.getByText('Not quite')).toHaveCount(0);
  });
});

test.describe('Microphone: playing the asked interval', () => {
  test.use({ recording: 'a3' });

  test('answers a Find question', async ({ micPage: page }) => {
    await seedSettings(page, 'intervals', INTERVAL_WITH_MIC);
    await pickFirstCard(page);
    await startSession(page, 'intervals');

    await expect(correctResult(page)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Microphone: playing another note of the scale', () => {
  test.use({ recording: 'e3' });

  test('is heard but does not answer', async ({ micPage: page }) => {
    await seedSettings(page, 'intervals', INTERVAL_WITH_MIC);
    await pickFirstCard(page);
    await startSession(page, 'intervals');

    await expect(page.getByText('Hearing E3')).toBeVisible({ timeout: 10_000 });
    await expect(correctResult(page)).toHaveCount(0);
    await expect(page.getByText('Not quite')).toHaveCount(0);
  });
});

test.describe('Microphone: strumming the asked chord', () => {
  test.use({ recording: 'cSus4' });

  test('moves straight on to the next chord and says which one it heard', async ({
    micPage: page,
  }) => {
    // With pickFirstCard(), Csus4 comes first, then Dsus4.
    await seedSettings(page, 'triads', { ...CSUS4_ONLY, roots: ['C', 'D'], micMode: 'strum' });
    await pickFirstCard(page);
    await startSession(page, 'triads');

    await expect(page.getByText(/Csus4, \d\.\d s/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dsus4');
    await expect(page.getByRole('region', { name: 'Answer' })).toHaveCount(0);
  });
});

test.describe('Microphone: a chord not played in time', () => {
  test.use({ recording: 'e3' });

  test('counts as a miss and shows the answer', async ({ micPage: page }) => {
    await seedSettings(page, 'triads', { ...CSUS4_ONLY, micMode: 'arpeggio', timeLimit: 5 });
    await startSession(page, 'triads');
    await expect(page.getByText('5 s limit')).toBeVisible();

    await expect(page.getByText("Time's up")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('region', { name: 'Answer' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/ })).toBeVisible();
  });
});

test.describe('Microphone: a whole-neck prompt', () => {
  test.use({ recording: 'e3' });

  test('is answered by playing each place', async ({ micPage: page }) => {
    // "Find every E" on string 5 alone has one place below fret 12: fret 7, which is E3.
    await seedSettings(page, 'notes', {
      ...F_SHARP_ON_A,
      notes: ['E'],
      promptKind: 'neck',
      micMode: 'play',
    });
    await startSession(page, 'notes');
    await expect(page.getByText(/play E on string 5 \(A\)/)).toBeVisible();

    // "Correct" shows for 1.5 s before the card comes back; a busy machine can check too
    // seldom to see it. The count of answers stays.
    await expect(page.getByRole('region', { name: 'Session' })).toContainText(/1 note\s*100%/, {
      timeout: 10_000,
    });
  });
});
