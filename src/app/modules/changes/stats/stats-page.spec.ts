import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideChanges } from '../changes-session';
import { TakeRecord } from '../deck';
import { StatsPage } from './stats-page';

const DAY = 24 * 60 * 60_000;

function take(pair: string, changes: number, seconds: number, day: number): TakeRecord {
  return { pair, changes, seconds, at: day * DAY, counted: 'mic' };
}

describe('Chord changes StatsPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows the best and last changes a minute of each pair, and charts them', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'changes:takes',
      JSON.stringify([
        take('C-G', 28, 60, 1),
        take('C-G', 17, 30, 2),
        take('G-D', 40, 60, 3),
        take('C-G', 31, 60, 4),
      ]),
    );
    await render(StatsPage, { providers: [...provideChanges(), provideRouter([])] });

    expect(screen.getByRole('row', { name: /^C ⇄ G/ })).toHaveTextContent(/34.*31.*3/);
    expect(screen.getByRole('row', { name: /^G ⇄ D/ })).toHaveTextContent(/40.*40.*1/);

    // The chart starts on the pair played last; another can be picked.
    expect(screen.getByRole('radio', { name: 'C ⇄ G' })).toBeChecked();
    await userEvent.setup().click(screen.getByRole('radio', { name: 'G ⇄ D' }));
    expect(
      screen.getByText('A couple more takes and your progress shows here.'),
    ).toBeInTheDocument();
  });

  it('invites you to play before there is anything to show', async () => {
    await render(StatsPage, { providers: [...provideChanges(), provideRouter([])] });

    expect(screen.getByRole('heading', { name: 'No takes yet' })).toBeInTheDocument();
  });
});
