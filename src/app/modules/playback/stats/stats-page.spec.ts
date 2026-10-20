import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { providePlayback } from '../playback-session';
import { StatsPage } from './stats-page';

function answered(attempts: number, correct: number) {
  return { attempts, correct, totalResponseMs: attempts * 4000, lastSeen: 0 };
}

describe('Play it back StatsPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows accuracy per interval and direction, and the phrases to practise more', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'playback:stats',
      JSON.stringify({
        'interval:M3:up': answered(4, 4),
        'interval:m3:down': answered(4, 1),
        'melody:major-pentatonic:3': answered(2, 1),
      }),
    );
    await render(StatsPage, { providers: [...providePlayback(), provideRouter([])] });

    expect(screen.getByRole('heading', { name: 'Intervals by ear' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /^Up/ })).toHaveTextContent('100%');
    expect(screen.getByRole('row', { name: /^Down/ })).toHaveTextContent('25%');
    expect(screen.getByText('Minor 3rd down')).toBeInTheDocument();
    expect(screen.getByText('Major pentatonic melodies')).toBeInTheDocument();
  });

  it('invites you to practise before there is anything to show', async () => {
    await render(StatsPage, { providers: [...providePlayback(), provideRouter([])] });

    expect(screen.getByRole('heading', { name: 'No answers yet' })).toBeInTheDocument();
  });
});
