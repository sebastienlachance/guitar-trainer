import { Page, expect, test } from '@playwright/test';
import { correctResult, seedSettings, startSession, tapFret } from './support/app';
import { CSUS4_ONLY, E_ON_A_STRING, F_SHARP_ON_A } from './support/decks';

/** Fails when the page is wider than the screen, i.e. it scrolls sideways. */
async function expectFitsWidth(page: Page, where: string): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${where} is wider than the screen`).toBeLessThanOrEqual(clientWidth);
}

test.describe('Phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('home and triads pages fit the screen', async ({ page }) => {
    await seedSettings(page, 'triads', CSUS4_ONLY);

    await page.goto('/#/');
    await expectFitsWidth(page, 'Home');
    await page.goto('/#/triads');
    await expectFitsWidth(page, 'Triads setup');

    await startSession(page, 'triads');
    await page.getByRole('button', { name: /Reveal/ }).click();
    await expect(page.getByRole('list', { name: 'Chord tones' })).toBeVisible();
    await expectFitsWidth(page, 'Triads answer');
    await page.getByRole('button', { name: /Got it/ }).click();

    await page.goto('/#/triads/stats');
    await expect(page.getByRole('heading', { name: 'Accuracy by chord' })).toBeVisible();
    await expectFitsWidth(page, 'Triads stats');
  });

  test('fretboard notes pages fit the screen', async ({ page }) => {
    await seedSettings(page, 'notes', F_SHARP_ON_A);

    await page.goto('/#/notes');
    await expectFitsWidth(page, 'Notes setup');

    await startSession(page, 'notes');
    await expectFitsWidth(page, 'Notes question');
    // Fret 7 is off screen on a phone: the board must scroll to it, not the page.
    await tapFret(page, 5, 7);
    await expect(page.getByText(/is at fret 9/)).toBeVisible();
    await expectFitsWidth(page, 'Notes correction');

    await page.goto('/#/notes/stats');
    await expect(page.getByRole('heading', { name: 'Accuracy by string' })).toBeVisible();
    await expectFitsWidth(page, 'Notes stats');
  });
});

test.describe('Phone width, identify notes', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('identify notes pages fit the screen', async ({ page }) => {
    await seedSettings(page, 'identify', { ...E_ON_A_STRING, choices: 12 });

    await page.goto('/#/identify');
    await expectFitsWidth(page, 'Identify setup');

    await startSession(page, 'identify');
    await page
      .getByRole('group', { name: 'Note names' })
      .getByRole('button', { name: 'E', exact: true })
      .click();
    await expect(correctResult(page)).toBeVisible();
    await expectFitsWidth(page, 'Identify answer');

    await page.goto('/#/identify/stats');
    await expect(page.getByRole('heading', { name: 'Accuracy by string' })).toBeVisible();
    await expectFitsWidth(page, 'Identify stats');
  });
});

test('a deep link opens the page directly', async ({ page }) => {
  await page.goto('/#/notes/stats');

  await expect(page).toHaveTitle('Fretboard notes stats · Guitar trainer');
  await expect(page.getByRole('heading', { name: 'Fretboard notes stats' })).toBeAttached();
});
