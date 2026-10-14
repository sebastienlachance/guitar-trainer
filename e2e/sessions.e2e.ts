import { expect, test } from '@playwright/test';
import { correctResult, seedSettings, startSession, tapFret } from './support/app';
import { F_SHARP_ON_A } from './support/decks';

test('a session interrupted by a reload is still saved', async ({ page }) => {
  await seedSettings(page, 'notes', F_SHARP_ON_A);
  await startSession(page, 'notes');
  await tapFret(page, 5, 9);
  await expect(correctResult(page)).toBeVisible();

  // A reload, like closing the tab, never gets to end the session normally.
  await page.reload();
  await page.goto('/#/notes/stats');

  const sessions = page.getByRole('region', { name: 'Sessions' });
  await expect(sessions).toContainText('1 session');
  await expect(sessions).toContainText('1 note');
  // The answer's time survived the reload too: the "Each" column shows it.
  await expect(sessions.getByRole('row').nth(1)).toContainText(/\d\.\d s/);
});
