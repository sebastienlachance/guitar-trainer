import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideTriads } from '../triads-session';
import { StatsPage } from './stats-page';

const MINUTE = 60_000;

function saveSessions(records: object[]): void {
  localStorage.setItem(STORAGE_PREFIX + 'sessions', JSON.stringify(records));
}

function saveStats(stats: object): void {
  localStorage.setItem(STORAGE_PREFIX + 'triads:stats', JSON.stringify(stats));
}

/** A chord answered right every time: first in `firstMs`, lately in `nowMs`. */
function practised(firstMs: number, nowMs: number, correct = 8) {
  return {
    attempts: correct,
    correct,
    totalResponseMs: correct * nowMs,
    lastSeen: 0,
    earlyMs: [firstMs, firstMs, firstMs],
    recentMs: [nowMs, nowMs, nowMs, nowMs, nowMs],
  };
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
    // 52 chords in 14 minutes: 3.7 a minute. Time per chord wasn't kept for these sessions.
    expect(rows[0]).toHaveTextContent(/Today, .*14 min.*52.*3\.7.*–.*81%/);
  });

  it('charts your pace session after session, and time per chord once it is kept', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const now = Date.now();
    saveSessions([
      { ...session('triads', now - 10 * MINUTE, 10, 100, 100), totalResponseMs: 200_000 },
      { ...session('triads', now - 24 * 60 * MINUTE, 10, 60, 60), totalResponseMs: 240_000 },
      session('triads', now - 2 * 24 * 60 * MINUTE, 10, 40, 40),
    ]);
    await render(StatsPage, { providers: [...provideTriads(), provideRouter([])] });

    expect(
      screen.getByRole('img', {
        name: 'Over 3 sessions, from 4.0 chords per minute to 10.0 chords per minute.',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Time each' }));
    expect(
      screen.getByRole('img', {
        name: 'Over 2 sessions, from 4.0 s per chord to 2.0 s per chord.',
      }),
    ).toBeInTheDocument();
  });

  it('shows how fast you play each chord, or your accuracy', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    saveStats({ 'C|sus4': practised(3000, 1400), 'D|sus4': practised(6000, 4600) });
    saveSessions([session('triads', Date.now() - 10 * MINUTE, 5, 16, 16)]);
    await render(StatsPage, { providers: [...provideTriads(), provideRouter([])] });

    const sus4 = () => screen.getByRole('row', { name: /^sus4/ });
    expect(within(sus4()).getByRole('cell', { name: '1.4' })).toHaveClass('high');
    expect(within(sus4()).getByRole('cell', { name: '4.6' })).toHaveClass('low');

    await user.click(screen.getByRole('radio', { name: 'Accuracy' }));
    expect(within(sus4()).getAllByRole('cell', { name: '100%' })).toHaveLength(2);
  });

  it('puts your slowest chords first, with how fast you were at first', async () => {
    // Your median is 2.6 s: D and E are slower than usual, C and G aren't.
    saveStats({
      'C|sus4': practised(3000, 1400),
      'G|sus4': practised(3000, 1600),
      'D|sus4': practised(6000, 4600),
      'E|sus4': practised(5000, 3600),
    });
    saveSessions([session('triads', Date.now() - 10 * MINUTE, 5, 24, 24)]);
    await render(StatsPage, { providers: [...provideTriads(), provideRouter([])] });

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Dsus4 Any shape 4.6 s · was 6.0 s',
      'Esus4 Any shape 3.6 s · was 5.0 s',
    ]);
  });

  it('times each string set, at first and lately, and shows the strings of each session', async () => {
    const now = Date.now();
    const HOUR = 60 * MINUTE;
    const on = (key: string, eachMs: number) => ({
      [key]: { answered: 10, totalResponseMs: 10 * eachMs },
    });
    const timed = (startedAt: number, eachMs: number, groups?: object) => ({
      ...session('triads', startedAt, 5, 10, 10),
      totalResponseMs: 10 * eachMs,
      ...(groups ? { groups } : {}),
    });
    saveSessions([
      timed(now - 10 * MINUTE, 3400, on('3-4-5', 3400)),
      timed(now - 20 * MINUTE, 2000, { ...on('4-5-6', 2000), ...on('2-3-4', 2000) }),
      timed(now - 30 * MINUTE, 2000),
      ...[1600, 1600, 1600, 2900, 2900, 2900].map((eachMs, i) =>
        timed(now - (i + 1) * HOUR, eachMs, on('1-2-3', eachMs)),
      ),
    ]);
    await render(StatsPage, { providers: [...provideTriads(), provideRouter([])] });

    const bySet = within(screen.getByRole('region', { name: 'By string set' }));
    const cells = (row: HTMLElement) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent?.trim());
    expect(bySet.getAllByRole('row').slice(1).map(cells)).toEqual([
      ['1-2-3', '6', '2.9 s', '1.6 s'],
      ['2-3-4', '1', '–', '2.0 s'],
      ['3-4-5', '1', '–', '3.4 s'],
      ['4-5-6', '1', '–', '2.0 s'],
    ]);
    expect(bySet.getByRole('cell', { name: '1.6 s' })).toHaveClass('fast');
    expect(bySet.getByText(/counts here when you picked a single string set/)).toBeInTheDocument();

    const sessions = within(screen.getByRole('region', { name: 'Sessions' }));
    expect(sessions.getByRole('columnheader', { name: 'Strings' })).toBeInTheDocument();
    const strings = sessions
      .getAllByRole('row')
      .slice(1, 4)
      .map((row) => cells(row)[1]);
    expect(strings).toEqual(['3-4-5', '2 string sets', '–']);
  });

  it('leaves the section out before any session', async () => {
    await render(StatsPage, { providers: [...provideTriads(), provideRouter([])] });
    expect(screen.queryByRole('region', { name: 'Sessions' })).not.toBeInTheDocument();
  });
});
