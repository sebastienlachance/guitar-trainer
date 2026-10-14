import { Locator, Page, expect } from '@playwright/test';

/** Same prefix as STORAGE_PREFIX in src/app/core/practice/storage.ts. */
const STORAGE_PREFIX = 'guitar-trainer:v1:';

/**
 * Saves a value under an app storage key (without the prefix) before the app loads. Applies to
 * every later navigation and reload of the page.
 */
export async function seedStorage(page: Page, key: string, value: unknown): Promise<void> {
  await page.addInitScript(
    ([fullKey, json]) => localStorage.setItem(fullKey, json),
    [`${STORAGE_PREFIX}${key}`, JSON.stringify(value)],
  );
}

/** Saves a module's settings before the app loads, e.g. a one-card deck so the prompt is known. */
export async function seedSettings(page: Page, module: string, settings: object): Promise<void> {
  await seedStorage(page, `${module}:settings`, settings);
}

/**
 * Makes card picking predictable: with Math.random fixed at 0, the first card of the deck comes
 * up. For modules whose deck can't be narrowed to one card through settings.
 */
export async function pickFirstCard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
}

/** Opens a module's practice page and starts a session. */
export async function startSession(page: Page, module: string): Promise<void> {
  await page.goto(`/#/${module}/practice`);
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByRole('region', { name: 'Session' })).toBeVisible();
}

/**
 * Opens a module's practice page and starts a session from the keyboard. Answer controls only
 * take focus for keyboard users, so keyboard tests start this way.
 */
export async function startSessionWithKeyboard(page: Page, module: string): Promise<void> {
  await page.goto(`/#/${module}/practice`);
  await expect(page.getByRole('button', { name: 'Start session' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Session' })).toBeVisible();
}

/** Clicks a fretboard position where it really is on screen, as a finger would. */
export async function tapFret(page: Page, string: number, fret: number): Promise<void> {
  await page.locator(`[data-position="${string}:${fret}"]`).click();
}

/**
 * The "Correct, 1.2 s" line the practice frame shows after an app-checked answer. One shared
 * locator, so tests expecting it and tests expecting its absence can't drift apart.
 */
export function correctResult(page: Page): Locator {
  return page.getByText(/Correct, \d/);
}
