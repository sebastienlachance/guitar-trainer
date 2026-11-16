import { expect, test } from '@playwright/test';
import { correctResult, pickFirstCard, seedSettings, startSession, tapFret } from './support/app';
import { A_FLAT_ON_THE_NECK, E_FLAT_IN_FOURTHS } from './support/decks';

test.describe('Circle of fifths', () => {
  test('naming the next note is correct, and the circle shows the step', async ({ page }) => {
    await seedSettings(page, 'circle', E_FLAT_IN_FOURTHS);
    await startSession(page, 'circle');
    await expect(page.getByRole('heading', { level: 1, name: 'E♭ in fourths' })).toBeVisible();

    await page
      .getByRole('group', { name: 'Note names' })
      .getByRole('button', { name: 'A♭', exact: true })
      .click();

    await expect(correctResult(page)).toBeVisible();
    await expect(page.getByRole('img', { name: 'Circle of fifths: E♭ to A♭' })).toBeVisible();
  });

  test('on the neck, the next string at the same fret is correct', async ({ page }) => {
    await seedSettings(page, 'circle', A_FLAT_ON_THE_NECK);
    await pickFirstCard(page);
    await startSession(page, 'circle');
    await expect(page.getByRole('heading', { level: 1, name: 'A♭ in fourths' })).toBeVisible();

    // A♭ is on the B string at fret 9: D♭ is on the high E at fret 9.
    await tapFret(page, 1, 9);

    await expect(correctResult(page)).toBeVisible();
    await expect(page.getByText('Same fret on the next thinner string.')).toBeVisible();
  });
});
