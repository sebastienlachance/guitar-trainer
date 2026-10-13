import { Page, expect, test } from '@playwright/test';
import { correctResult, seedSettings, startSession, startSessionWithKeyboard } from './support/app';
import { E_ON_A_STRING } from './support/decks';

/** The answer labels in order, without their number-key hints. */
function choiceLabels(page: Page): Promise<string[]> {
  return page
    .getByRole('group', { name: 'Note names' })
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.textContent?.replace(/^\s*\d\s*/, '').trim() ?? ''),
    );
}

test.describe('Identify notes', () => {
  test.beforeEach(({ page }) => seedSettings(page, 'identify', E_ON_A_STRING));

  test('picking the right name is correct', async ({ page }) => {
    await startSession(page, 'identify');
    await expect(
      page.getByRole('heading', { level: 1, name: 'String 5 (A), fret 7' }),
    ).toBeVisible();

    await page
      .getByRole('group', { name: 'Note names' })
      .getByRole('button', { name: 'E', exact: true })
      .click();

    await expect(correctResult(page)).toBeVisible();
  });

  test('a wrong name shows the right one', async ({ page }) => {
    await startSession(page, 'identify');
    const choices = page.getByRole('group', { name: 'Note names' });
    const labels = await choiceLabels(page);

    await choices
      .getByRole('button')
      .nth(labels.findIndex((label) => label !== 'E'))
      .click();

    await expect(page.getByText('Not quite')).toBeVisible();
    await expect(choices.getByRole('button', { name: 'E (correct answer)' })).toBeVisible();
  });

  test('answering with a number key', async ({ page }) => {
    await startSessionWithKeyboard(page, 'identify');
    const labels = await choiceLabels(page);

    await page.keyboard.press(String(labels.indexOf('E') + 1));

    await expect(correctResult(page)).toBeVisible();
  });
});
