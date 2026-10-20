import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { TakeRecord } from '../deck';
import { provideRhythm } from '../rhythm-session';
import { fakeRhythmAudio } from '../rhythm.testing';
import { StatsPage } from './stats-page';

function take(
  subdivision: string,
  bpm: number,
  meanAbsMs: number,
  passed: boolean,
  at: number,
): TakeRecord {
  return {
    subdivision,
    bpm,
    at,
    onTimePct: 90,
    biasMs: 5,
    spreadMs: 12,
    meanAbsMs,
    missed: 0,
    passed,
  };
}

describe('Rhythm StatsPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows where each subdivision stands and charts its takes', async () => {
    const day = 24 * 60 * 60_000;
    localStorage.setItem(
      STORAGE_PREFIX + 'rhythm:takes',
      JSON.stringify([
        take('eighth', 70, 30, true, 1 * day),
        take('eighth', 74, 24, true, 2 * day),
        take('eighth', 78, 26, false, 3 * day),
        take('quarter', 80, 15, true, 4 * day),
        take('pattern:campfire', 70, 20, true, 5 * day),
      ]),
    );
    localStorage.setItem(
      STORAGE_PREFIX + 'rhythm:levels',
      JSON.stringify({ eighth: { bpm: 78, failStreak: 1 }, quarter: { bpm: 84, failStreak: 0 } }),
    );
    await render(StatsPage, {
      providers: [...provideRhythm(), provideRouter([]), ...fakeRhythmAudio().providers],
    });

    expect(screen.getByRole('row', { name: /^Quarter notes/ })).toHaveTextContent(
      /84 bpm.*80 bpm.*15 ms.*1/,
    );
    expect(screen.getByRole('row', { name: /^Eighth notes/ })).toHaveTextContent(
      /78 bpm.*74 bpm.*26 ms.*3/,
    );
    expect(screen.getByRole('row', { name: /^Campfire/ })).toHaveTextContent(/70 bpm.*20 ms.*1/);
    // The chart starts on the subdivision played last: a single take is not a line yet.
    expect(
      screen.getByText('A couple more takes and your progress shows here.'),
    ).toBeInTheDocument();
  });

  it('invites you to play before there is anything to show', async () => {
    await render(StatsPage, {
      providers: [...provideRhythm(), provideRouter([]), ...fakeRhythmAudio().providers],
    });

    expect(screen.getByRole('heading', { name: 'No takes yet' })).toBeInTheDocument();
  });
});
