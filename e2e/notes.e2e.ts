import { expect, test } from '@playwright/test';
import {
  correctResult,
  seedSettings,
  startSession,
  startSessionWithKeyboard,
  tapFret,
} from './support/app';
import { F_SHARP_ON_A } from './support/decks';

test.describe('Fretboard notes', () => {
  test.beforeEach(({ page }) => seedSettings(page, 'notes', F_SHARP_ON_A));

  test('a tap on the right fret is correct', async ({ page }) => {
    await startSession(page, 'notes');
    await expect(page.getByRole('heading', { level: 1, name: 'F♯ on string 5 (A)' })).toBeVisible();

    await tapFret(page, 5, 9);

    await expect(correctResult(page)).toBeVisible();
  });

  test('a wrong fret shows where the note really is', async ({ page }) => {
    await startSession(page, 'notes');

    await tapFret(page, 5, 7);

    await expect(page.getByText("That's E. F♯ is at fret 9.")).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/ })).toBeVisible();
  });

  test('answering from the keyboard', async ({ page }) => {
    await startSessionWithKeyboard(page, 'notes');
    const fretboard = page.getByRole('application');
    await expect(fretboard).toBeFocused();

    for (let fret = 0; fret < 9; fret++) {
      await page.keyboard.press('ArrowRight');
    }
    await page.keyboard.press('Enter');

    await expect(correctResult(page)).toBeVisible();
  });
});
