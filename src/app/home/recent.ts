import { SessionRecord, startOfDay } from '../core/practice/session-log';

const DAY_MS = 86_400_000;

/** A module practised lately: the day of its last session, and the time spent on it that day. */
export interface RecentModule {
  readonly module: string;
  readonly lastAt: number;
  /** Active time on the module, over the whole day of its last session. */
  readonly activeMs: number;
}

/** The modules practised most recently, latest first, at most `limit` of them. */
export function recentModules(history: readonly SessionRecord[], limit: number): RecentModule[] {
  const latest = new Map<string, number>();
  for (const session of history) {
    latest.set(session.module, Math.max(latest.get(session.module) ?? 0, session.startedAt));
  }
  return [...latest.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([module, lastAt]) => ({
      module,
      lastAt,
      activeMs: history
        .filter(
          (session) =>
            session.module === module && startOfDay(session.startedAt) === startOfDay(lastAt),
        )
        .reduce((sum, session) => sum + session.activeMs, 0),
    }));
}

/** Practice since Monday: the active time, and on how many days. */
export function weekSummary(
  history: readonly SessionRecord[],
  now: number,
): { activeMs: number; days: number } {
  const today = startOfDay(now);
  // Monday is day 1 in JavaScript's week, which starts on Sunday.
  const sinceMonday = (new Date(today).getDay() + 6) % 7;
  const weekStart = startOfDay(today - sinceMonday * DAY_MS + DAY_MS / 2);
  const thisWeek = history.filter((session) => session.startedAt >= weekStart);
  return {
    activeMs: thisWeek.reduce((sum, session) => sum + session.activeMs, 0),
    days: new Set(thisWeek.map((session) => startOfDay(session.startedAt))).size,
  };
}

/** "today", "yesterday", a weekday within the week ("Mon"), or a date further back ("12 Oct"). */
export function whenText(time: number, now: number, locale?: string): string {
  // Rounded, because a day with a daylight-saving change is 23 or 25 hours long.
  const daysAgo = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
  if (daysAgo === 0) {
    return 'today';
  }
  if (daysAgo === 1) {
    return 'yesterday';
  }
  return new Date(time).toLocaleDateString(
    locale,
    daysAgo < 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' },
  );
}
