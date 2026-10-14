import { Page, expect, test } from '@playwright/test';
import {
  correctResult,
  pickFirstCard,
  seedSettings,
  seedStorage,
  startSession,
  tapFret,
} from './support/app';
import {
  CSUS4_ONLY,
  E_ON_A_STRING,
  F_SHARP_ON_A,
  MAJOR_OR_MINOR_PENTATONIC,
  MINOR_THIRD_IN_F_SHARP,
} from './support/decks';

/** Fails when the page is wider than the screen, i.e. it scrolls sideways. */
async function expectFitsWidth(page: Page, where: string): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${where} is wider than the screen`).toBeLessThanOrEqual(clientWidth);
}

test.describe('Phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('home and triads pages fit the screen', async ({ page }) => {
    await seedSettings(page, 'triads', CSUS4_ONLY);

    await page.goto('/#/');
    await expectFitsWidth(page, 'Home');
    await page.goto('/#/triads');
    await expectFitsWidth(page, 'Triads setup');

    await startSession(page, 'triads');
    await page.getByRole('button', { name: /Reveal/ }).click();
    await expect(page.getByRole('list', { name: 'Chord tones' })).toBeVisible();
    await expectFitsWidth(page, 'Triads answer');
    await page.getByRole('button', { name: /Got it/ }).click();

    await page.goto('/#/triads/stats');
    await expect(page.getByRole('heading', { name: 'By chord' })).toBeVisible();
    await expectFitsWidth(page, 'Triads stats');
  });

  test('fretboard notes pages fit the screen', async ({ page }) => {
    await seedSettings(page, 'notes', F_SHARP_ON_A);

    await page.goto('/#/notes');
    await expectFitsWidth(page, 'Notes setup');

    await startSession(page, 'notes');
    await expectFitsWidth(page, 'Notes question');
    // Fret 7 is off screen on a phone: the board must scroll to it, not the page.
    await tapFret(page, 5, 7);
    await expect(page.getByText(/is at fret 9/)).toBeVisible();
    await expectFitsWidth(page, 'Notes correction');

    await page.goto('/#/notes/stats');
    await expect(page.getByRole('heading', { name: 'Accuracy by string' })).toBeVisible();
    await expectFitsWidth(page, 'Notes stats');
  });
});

test.describe('Phone width, identify notes', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('identify notes pages fit the screen', async ({ page }) => {
    await seedSettings(page, 'identify', { ...E_ON_A_STRING, choices: 12 });

    await page.goto('/#/identify');
    await expectFitsWidth(page, 'Identify setup');

    await startSession(page, 'identify');
    await page
      .getByRole('group', { name: 'Note names' })
      .getByRole('button', { name: 'E', exact: true })
      .click();
    await expect(correctResult(page)).toBeVisible();
    await expectFitsWidth(page, 'Identify answer');

    await page.goto('/#/identify/stats');
    await expect(page.getByRole('heading', { name: 'Accuracy by string' })).toBeVisible();
    await expectFitsWidth(page, 'Identify stats');
  });
});

test.describe('Phone width, identify scales', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('identify scales pages fit the screen', async ({ page }) => {
    await seedSettings(page, 'scales', MAJOR_OR_MINOR_PENTATONIC);
    await pickFirstCard(page);

    await page.goto('/#/scales');
    await expectFitsWidth(page, 'Scales setup');

    await startSession(page, 'scales');
    await page
      .getByRole('group', { name: 'Scale names' })
      .getByRole('button', { name: 'Major', exact: true })
      .click();
    await expect(page.getByText('Major: 1 2 3 4 5 6 7')).toBeVisible();
    await expectFitsWidth(page, 'Scales answer');

    await page.goto('/#/scales/stats');
    await expect(page.getByRole('heading', { name: 'Accuracy by scale' })).toBeVisible();
    await expectFitsWidth(page, 'Scales stats');
  });
});

test.describe('Phone width, intervals in a scale', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await pickFirstCard(page);
  });

  test('intervals setup, Find and stats pages fit the screen', async ({ page }) => {
    await seedSettings(page, 'intervals', MINOR_THIRD_IN_F_SHARP);

    await page.goto('/#/intervals');
    await expectFitsWidth(page, 'Intervals setup');

    await startSession(page, 'intervals');
    await tapFret(page, 5, 2);
    await expect(page.getByText("That's the 4 (perfect 4th).")).toBeVisible();
    await expectFitsWidth(page, 'Intervals find answer');

    await page.goto('/#/intervals/stats');
    await expect(
      page.getByRole('heading', { name: 'Accuracy by scale and interval' }),
    ).toBeVisible();
    await expectFitsWidth(page, 'Intervals stats');
  });

  test('an intervals Name question fits the screen', async ({ page }) => {
    await seedSettings(page, 'intervals', { ...MINOR_THIRD_IN_F_SHARP, tasks: ['name'] });

    await startSession(page, 'intervals');
    await page
      .getByRole('group', { name: 'Intervals' })
      .getByRole('button', { name: '♭3' })
      .click();
    await expect(correctResult(page)).toBeVisible();
    await expectFitsWidth(page, 'Intervals name answer');
  });
});

test.describe('Phone width, progress', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the progress chart and speed grid fit the screen', async ({ page }) => {
    const day = 24 * 60 * 60_000;
    const now = Date.now();
    await seedStorage(
      page,
      'sessions',
      [3, 2, 1].map((daysAgo, index) => ({
        id: `triads-${now - daysAgo * day}`,
        module: 'triads',
        startedAt: now - daysAgo * day,
        endedAt: now - daysAgo * day + 10 * 60_000,
        activeMs: 10 * 60_000,
        answered: 60 + 20 * index,
        correct: 60 + 20 * index,
        totalResponseMs: (60 + 20 * index) * (3000 - 500 * index),
      })),
    );
    await seedStorage(page, 'triads:stats', {
      'C|sus4': {
        attempts: 8,
        correct: 8,
        totalResponseMs: 16_000,
        lastSeen: now,
        recentMs: [1500],
      },
      'Ab|sus4': {
        attempts: 8,
        correct: 8,
        totalResponseMs: 40_000,
        lastSeen: now,
        recentMs: [5000],
      },
    });

    await page.goto('/#/triads/stats');
    await expect(page.getByRole('img', { name: /^Over 3 sessions/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'By chord' })).toBeVisible();
    await expectFitsWidth(page, 'Triads stats with progress');
  });
});

test.describe('Phone width, play along', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('play along pages fit the screen', async ({ page }) => {
    const day = 24 * 60 * 60_000;
    await seedSettings(page, 'rhythm', { subdivisions: ['eighth', 'sixteenth'], latencyMs: 40 });
    await seedStorage(
      page,
      'rhythm:takes',
      [70, 74, 78].map((bpm, index) => ({
        subdivision: 'eighth',
        bpm,
        at: Date.now() - (3 - index) * day,
        onTimePct: 90,
        biasMs: 6,
        spreadMs: 14,
        meanAbsMs: 20 - index,
        missed: 0,
        passed: true,
      })),
    );

    await page.goto('/#/rhythm');
    await expect(page.getByRole('heading', { name: 'Calibration' })).toBeVisible();
    await expectFitsWidth(page, 'Play along setup');

    await startSession(page, 'rhythm');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expectFitsWidth(page, 'Play along practice');

    await page.goto('/#/rhythm/stats');
    await expect(page.getByRole('img', { name: /^Over 3 takes/ })).toBeVisible();
    await expectFitsWidth(page, 'Play along stats');
  });
});

test('a deep link opens the page directly', async ({ page }) => {
  await page.goto('/#/notes/stats');

  await expect(page).toHaveTitle('Fretboard notes stats · Guitar trainer');
  await expect(page.getByRole('heading', { name: 'Fretboard notes stats' })).toBeAttached();
});
