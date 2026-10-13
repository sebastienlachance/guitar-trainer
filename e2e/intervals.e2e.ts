import { expect, test } from '@playwright/test';
import {
  correctResult,
  pickFirstCard,
  seedSettings,
  startSession,
  startSessionWithKeyboard,
  tapFret,
} from './support/app';
import { MINOR_THIRD_IN_F_SHARP } from './support/decks';

test.describe('Intervals in a scale', () => {
  test.beforeEach(async ({ page }) => {
    await pickFirstCard(page);
  });

  test('finding the interval on the neck', async ({ page }) => {
    await seedSettings(page, 'intervals', MINOR_THIRD_IN_F_SHARP);
    await startSession(page, 'intervals');
    await expect(page.getByText('in F♯ minor pentatonic, root on string 6')).toBeVisible();

    await tapFret(page, 6, 5);

    await expect(correctResult(page)).toBeVisible();
    await expect(page.getByText('Minor pentatonic: 1 ♭3 4 5 ♭7')).toBeVisible();
  });

  test('a wrong place says which interval it was', async ({ page }) => {
    await seedSettings(page, 'intervals', MINOR_THIRD_IN_F_SHARP);
    await startSession(page, 'intervals');

    await tapFret(page, 5, 2);

    await expect(page.getByText("That's the 4 (perfect 4th).")).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/ })).toBeVisible();
  });

  test('naming the marked note from the keyboard', async ({ page }) => {
    await seedSettings(page, 'intervals', { ...MINOR_THIRD_IN_F_SHARP, tasks: ['name'] });
    await startSessionWithKeyboard(page, 'intervals');

    await page.keyboard.press('1');

    await expect(correctResult(page)).toBeVisible();
  });
});
