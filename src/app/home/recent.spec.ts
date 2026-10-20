import { SessionRecord } from '../core/practice/session-log';
import { recentModules, weekSummary, whenText } from './recent';

const MINUTE = 60_000;

/** A session of `minutes` on `module`, started on day `day` of October 2026 at `hour`. */
function session(module: string, day: number, hour: number, minutes: number): SessionRecord {
  const startedAt = new Date(2026, 9, day, hour).getTime();
  return {
    id: `${module}-${startedAt}`,
    module,
    startedAt,
    endedAt: startedAt + minutes * MINUTE,
    activeMs: minutes * MINUTE,
    answered: 10,
    correct: 9,
  };
}

/** Wednesday 21 October 2026, mid-afternoon. */
const NOW = new Date(2026, 9, 21, 15).getTime();

describe('recentModules', () => {
  it('lists the modules practised last, with the time spent on each that day', () => {
    const history = [
      session('triads', 21, 9, 5),
      session('triads', 21, 14, 7),
      session('rhythm', 20, 19, 9),
      session('notes', 16, 18, 15),
      session('triads', 18, 10, 30),
      session('scales', 11, 8, 20),
    ];

    expect(recentModules(history, 3)).toEqual([
      { module: 'triads', lastAt: history[1].startedAt, activeMs: 12 * MINUTE },
      { module: 'rhythm', lastAt: history[2].startedAt, activeMs: 9 * MINUTE },
      { module: 'notes', lastAt: history[3].startedAt, activeMs: 15 * MINUTE },
    ]);
    expect(recentModules([], 3)).toEqual([]);
  });
});

describe('weekSummary', () => {
  it('adds up practice since Monday, and the days it was on', () => {
    const history = [
      session('triads', 21, 9, 5),
      session('rhythm', 21, 20, 10),
      session('notes', 19, 7, 15),
      session('scales', 18, 22, 40),
    ];

    expect(weekSummary(history, NOW)).toEqual({ activeMs: 30 * MINUTE, days: 2 });
  });

  it('starts a new week on Monday, and counts Sunday in the week before', () => {
    const monday = new Date(2026, 9, 26, 8).getTime();
    const history = [session('triads', 25, 21, 10), session('notes', 26, 7, 5)];

    expect(weekSummary(history, monday)).toEqual({ activeMs: 5 * MINUTE, days: 1 });
  });
});

describe('whenText', () => {
  it('says today, yesterday, a weekday this week, or a date further back', () => {
    const at = (day: number) => new Date(2026, 9, day, 12).getTime();

    expect(whenText(at(21), NOW, 'en-GB')).toBe('today');
    expect(whenText(at(20), NOW, 'en-GB')).toBe('yesterday');
    expect(whenText(at(18), NOW, 'en-GB')).toBe('Sun');
    expect(whenText(at(11), NOW, 'en-GB')).toBe('11 Oct');
  });
});
