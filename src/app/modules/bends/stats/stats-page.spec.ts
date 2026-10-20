import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideBends } from '../bends-session';
import { StatsPage } from './stats-page';

function bent(attempts: number, correct: number) {
  return { attempts, correct, totalResponseMs: attempts * 3000, lastSeen: 0 };
}

describe('Bends StatsPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows how often bends hold in tune, per string and size', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'bends:stats',
      JSON.stringify({ '3:2': bent(4, 3), '2:1': bent(2, 0) }),
    );
    await render(StatsPage, { providers: [...provideBends(), provideRouter([])] });

    expect(screen.getByRole('row', { name: /^string 3 \(G\)/ })).toHaveTextContent('75%');
    expect(screen.getByRole('row', { name: /^string 2 \(B\)/ })).toHaveTextContent('0%');
    // A column of the grid, and the card to practise more: none of its bends held yet.
    expect(screen.getByRole('columnheader', { name: 'Half step' })).toBeInTheDocument();
    expect(screen.getAllByText('Half step')).toHaveLength(2);
  });

  it('invites you to practise before there is anything to show', async () => {
    await render(StatsPage, { providers: [...provideBends(), provideRouter([])] });

    expect(screen.getByRole('heading', { name: 'No bends yet' })).toBeInTheDocument();
  });
});
