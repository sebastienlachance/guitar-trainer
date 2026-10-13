import { Locator, Page, expect } from '@playwright/test';

/** Same prefix as STORAGE_PREFIX in src/app/core/practice/storage.ts. */
const STORAGE_PREFIX = 'guitar-trainer:v1:';

/**
 * Saves a module's settings before the app loads, e.g. a one-card deck so the prompt is known.
 * Applies to every later navigation and reload of the page.
 */
export async function seedSettings(page: Page, module: string, settings: object): Promise<void> {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [`${STORAGE_PREFIX}${module}:settings`, JSON.stringify(settings)],
  );
}

/** Opens a module's practice page and starts a session. */
export async function startSession(page: Page, module: string): Promise<void> {
  await page.goto(`/#/${module}/practice`);
  await page.getByRole('button', { name: 'Start session' }).click();
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
