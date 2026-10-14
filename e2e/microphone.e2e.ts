import { Page, chromium, expect, test as base } from '@playwright/test';
import { correctResult, pickFirstCard, seedSettings, startSession } from './support/app';
import { TONES, tonePath } from './support/audio';
import { CSUS4_ONLY, F_SHARP_ON_A, MINOR_THIRD_IN_F_SHARP } from './support/decks';

type Tone = keyof typeof TONES;

/**
 * `page` replaced by one whose microphone plays a looping recording of `tone`. Launch options
 * can't vary per test, so each test starts its own browser with Chromium's fake-device flags.
 */
const test = base.extend<{ tone: Tone; micPage: Page }>({
  tone: ['fSharp3', { option: true }],
  micPage: async ({ tone, baseURL }, use) => {
    const browser = await chromium.launch({
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${tonePath(tone)}`,
      ],
    });
    await use(await browser.newPage({ baseURL }));
    await browser.close();
  },
});

const WITH_MIC = { ...F_SHARP_ON_A, micMode: 'play' };
const INTERVAL_WITH_MIC = { ...MINOR_THIRD_IN_F_SHARP, micMode: 'play' };

test.describe('Microphone: playing the asked note', () => {
  test.use({ tone: 'fSharp3' });

  test('answers the card', async ({ micPage: page }) => {
    await seedSettings(page, 'notes', WITH_MIC);
    await startSession(page, 'notes');

    await expect(correctResult(page)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Microphone: playing another note', () => {
  test.use({ tone: 'e3' });

  test('is heard but does not count', async ({ micPage: page }) => {
    await seedSettings(page, 'notes', WITH_MIC);
    await startSession(page, 'notes');

    await expect(page.getByText('Hearing E3')).toBeVisible({ timeout: 10_000 });
    await expect(correctResult(page)).toHaveCount(0);
    await expect(page.getByText('Not quite')).toHaveCount(0);
  });
});

test.describe('Microphone: playing the asked interval', () => {
  test.use({ tone: 'a3' });

  test('answers a Find question', async ({ micPage: page }) => {
    await seedSettings(page, 'intervals', INTERVAL_WITH_MIC);
    await pickFirstCard(page);
    await startSession(page, 'intervals');

    await expect(correctResult(page)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Microphone: playing another note of the scale', () => {
  test.use({ tone: 'e3' });

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
  test.use({ tone: 'cSus4' });

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
  test.use({ tone: 'e3' });

  test('counts as a miss and shows the answer', async ({ micPage: page }) => {
    await seedSettings(page, 'triads', { ...CSUS4_ONLY, micMode: 'arpeggio', timeLimit: 5 });
    await startSession(page, 'triads');
    await expect(page.getByText('5 s limit')).toBeVisible();

    await expect(page.getByText("Time's up")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('region', { name: 'Answer' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/ })).toBeVisible();
  });
});
