import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideProgressions } from '../progressions-session';
import { TakeRecord } from '../deck';
import { StatsPage } from './stats-page';

const DAY = 24 * 60 * 60_000;

function take(progression: string, bpm: number, onTime: number, day: number): TakeRecord {
  return { progression, bpm, at: day * DAY, onTime, total: 8, passed: onTime >= 7 };
}

describe('Progressions StatsPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows where each progression stands', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'progressions:takes',
      JSON.stringify([
        take('G-D-Em-C', 70, 8, 1),
        take('G-D-Em-C', 74, 6, 2),
        take('E-A-B7-A', 70, 7, 3),
      ]),
    );
    localStorage.setItem(
      STORAGE_PREFIX + 'progressions:levels',
      JSON.stringify({ 'G-D-Em-C': { bpm: 74, failStreak: 1 } }),
    );
    await render(StatsPage, { providers: [...provideProgressions(), provideRouter([])] });

    expect(screen.getByRole('row', { name: /^G D Em C/ })).toHaveTextContent(
      /74 bpm.*70 bpm.*6 of 8.*2/,
    );
    expect(screen.getByRole('row', { name: /^E A B7 A/ })).toHaveTextContent(/70 bpm.*7 of 8.*1/);
  });

  it('invites you to play before there is anything to show', async () => {
    await render(StatsPage, { providers: [...provideProgressions(), provideRouter([])] });

    expect(screen.getByRole('heading', { name: 'No takes yet' })).toBeInTheDocument();
  });
});
