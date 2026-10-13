import { expect, test } from '@playwright/test';
import { seedSettings, startSession } from './support/app';
import { CSUS4_ONLY } from './support/decks';

test.describe('Triads', () => {
  test.beforeEach(({ page }) => seedSettings(page, 'triads', CSUS4_ONLY));

  test('a session from setup to history, with the mouse', async ({ page }) => {
    await page.goto('/#/triads');
    await page.getByRole('button', { name: 'Start session' }).click();

    await expect(page).toHaveURL(/#\/triads\/practice$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Csus4' })).toBeVisible();
    await page.getByRole('button', { name: /Reveal/ }).click();
    await expect(page.getByRole('list', { name: 'Chord tones' })).toContainText('F');
    await page.getByRole('button', { name: /Got it/ }).click();
    await page.getByRole('button', { name: 'End session' }).click();

    await expect(page.getByText('Session saved')).toBeVisible();
    await page.getByRole('link', { name: 'See history' }).click();
    await expect(page.getByRole('region', { name: 'Sessions' })).toContainText('1 session');
  });

  test('answering from the keyboard', async ({ page }) => {
    await startSession(page, 'triads');

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Got it/ })).toBeVisible();
    await page.keyboard.press('ArrowRight');

    await expect(page.getByRole('region', { name: 'Session' })).toContainText('1 chord');
  });
});
