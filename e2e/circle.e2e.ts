import { expect, test } from '@playwright/test';
import { correctResult, seedSettings, startSession } from './support/app';
import { E_FLAT_IN_FOURTHS } from './support/decks';

test.describe('Circle of fifths', () => {
  test.beforeEach(({ page }) => seedSettings(page, 'circle', E_FLAT_IN_FOURTHS));

  test('naming the next note is correct, and the circle shows the step', async ({ page }) => {
    await startSession(page, 'circle');
    await expect(page.getByRole('heading', { level: 1, name: 'E♭ in fourths' })).toBeVisible();

    await page
      .getByRole('group', { name: 'Note names' })
      .getByRole('button', { name: 'A♭', exact: true })
      .click();

    await expect(correctResult(page)).toBeVisible();
    await expect(page.getByRole('img', { name: 'Circle of fifths: E♭ to A♭' })).toBeVisible();
  });
});
