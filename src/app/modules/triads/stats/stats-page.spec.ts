import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideTriads } from '../triads-session';
import { StatsPage } from './stats-page';

const MINUTE = 60_000;

function saveSessions(records: object[]): void {
  localStorage.setItem(STORAGE_PREFIX + 'sessions', JSON.stringify(records));
}

function session(
  module: string,
  startedAt: number,
  minutes: number,
  answered: number,
  correct: number,
) {
  return {
    id: `${module}-${startedAt}`,
    module,
    startedAt,
    endedAt: startedAt + minutes * MINUTE,
    activeMs: minutes * MINUTE,
    answered,
    correct,
  };
}

describe('StatsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mid-evening, so "10 minutes ago" is always today.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 13, 18, 0));
  });

  afterEach(() => vi.useRealTimers());

  it('lists your triads sessions with totals', async () => {
    const now = Date.now();
    saveSessions([
      session('triads', now - 10 * MINUTE, 14, 52, 42),
      session('scales', now - 60 * MINUTE, 30, 10, 10),
      session('triads', now - 2 * 24 * 60 * MINUTE, 22, 74, 50),
    ]);
    await render(StatsPage, { providers: [...provideTriads(), provideRouter([])] });

    const sessions = within(screen.getByRole('region', { name: 'Sessions' }));
    expect(sessions.getByText('2 sessions · 36 min · 126 chords')).toBeInTheDocument();
    const rows = sessions.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/Today, .*14 min.*52.*81%/);
  });

  it('leaves the section out before any session', async () => {
    await render(StatsPage, { providers: [...provideTriads(), provideRouter([])] });
    expect(screen.queryByRole('region', { name: 'Sessions' })).not.toBeInTheDocument();
  });
});
