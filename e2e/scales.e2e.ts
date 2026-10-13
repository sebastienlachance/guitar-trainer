import { expect, test } from '@playwright/test';
import { correctResult, pickFirstCard, seedSettings, startSession } from './support/app';
import { MAJOR_OR_MINOR_PENTATONIC } from './support/decks';

test.describe('Identify scales', () => {
  test.beforeEach(async ({ page }) => {
    await seedSettings(page, 'scales', MAJOR_OR_MINOR_PENTATONIC);
    await pickFirstCard(page);
  });

  test('naming the scale shows its formula', async ({ page }) => {
    await startSession(page, 'scales');
    await expect(page.getByRole('heading', { level: 1, name: 'C root, frets 2–6' })).toBeVisible();

    await page
      .getByRole('group', { name: 'Scale names' })
      .getByRole('button', { name: 'Major', exact: true })
      .click();

    await expect(correctResult(page)).toBeVisible();
    await expect(page.getByText('Major: 1 2 3 4 5 6 7')).toBeVisible();
  });

  test('a wrong scale marks the right one', async ({ page }) => {
    await startSession(page, 'scales');

    await page.keyboard.press('2');

    await expect(page.getByText('Not quite')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Major (correct answer)' })).toBeVisible();
  });
});
