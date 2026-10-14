import { Page, chromium, test as base } from '@playwright/test';
import { Recording, recordingPath } from './audio';

/**
 * Tests whose `micPage` has a microphone playing a looping `recording`. Launch options can't
 * vary per test, so each test starts its own browser with Chromium's fake-device flags.
 */
export const test = base.extend<{ recording: Recording; micPage: Page }>({
  recording: ['fSharp3', { option: true }],
  micPage: async ({ recording, baseURL }, use) => {
    const browser = await chromium.launch({
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${recordingPath(recording)}`,
      ],
    });
    await use(await browser.newPage({ baseURL }));
    await browser.close();
  },
});
