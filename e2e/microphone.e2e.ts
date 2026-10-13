import { Page, chromium, expect, test as base } from '@playwright/test';
import { correctResult, seedSettings, startSession } from './support/app';
import { TONES, tonePath } from './support/audio';
import { F_SHARP_ON_A } from './support/decks';

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
