/** After this long without any activity, the session clock stops counting. */
export const IDLE_LIMIT_MS = 2 * 60 * 1000;

/**
 * Practice time that only counts while you're active. Each gap between two activities counts
 * for at most IDLE_LIMIT_MS, so the clock freezes when you walk away and never runs backwards.
 */
export interface ActiveTimer {
  readonly accumulatedMs: number;
  /** Start of the current stretch: the last activity, or the moment the timer was resumed. */
  readonly lastActivity: number;
  readonly paused: boolean;
}

export function startTimer(now: number): ActiveTimer {
  return { accumulatedMs: 0, lastActivity: now, paused: false };
}

function countedGap(timer: ActiveTimer, now: number): number {
  return timer.paused ? 0 : Math.min(Math.max(now - timer.lastActivity, 0), IDLE_LIMIT_MS);
}

/** Records activity. Does nothing while paused: noodling during a break doesn't count. */
export function touchTimer(timer: ActiveTimer, now: number): ActiveTimer {
  return timer.paused
    ? timer
    : {
        accumulatedMs: timer.accumulatedMs + countedGap(timer, now),
        lastActivity: now,
        paused: false,
      };
}

export function pauseTimer(timer: ActiveTimer, now: number): ActiveTimer {
  return timer.paused
    ? timer
    : {
        accumulatedMs: timer.accumulatedMs + countedGap(timer, now),
        lastActivity: now,
        paused: true,
      };
}

export function resumeTimer(timer: ActiveTimer, now: number): ActiveTimer {
  return timer.paused ? { ...timer, lastActivity: now, paused: false } : timer;
}

export function elapsedMs(timer: ActiveTimer, now: number): number {
  return timer.accumulatedMs + countedGap(timer, now);
}

/** True once the idle limit has passed since the last activity (and the clock has frozen). */
export function isIdle(timer: ActiveTimer, now: number): boolean {
  return !timer.paused && now - timer.lastActivity >= IDLE_LIMIT_MS;
}

/** A session in progress. */
export interface OpenSession {
  /** Module the session belongs to, e.g. "triads". */
  readonly module: string;
  readonly startedAt: number;
  readonly timer: ActiveTimer;
  readonly answered: number;
  readonly correct: number;
  /** Sum of the answers' response times; missing in snapshots from older versions. */
  readonly totalResponseMs?: number;
}

/** A finished session as kept in the history. */
export interface SessionRecord {
  readonly id: string;
  readonly module: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly activeMs: number;
  readonly answered: number;
  readonly correct: number;
  /** Sum of the answers' response times; missing in sessions saved by older versions. */
  readonly totalResponseMs?: number;
}

export function closeSession(session: OpenSession, now: number): SessionRecord {
  return {
    id: `${session.module}-${session.startedAt}`,
    module: session.module,
    startedAt: session.startedAt,
    endedAt: now,
    activeMs: elapsedMs(session.timer, now),
    answered: session.answered,
    correct: session.correct,
    ...(session.totalResponseMs === undefined ? {} : { totalResponseMs: session.totalResponseMs }),
  };
}

/** Answers per minute of active time, or null for a session too short to tell. */
export function answersPerMinute(record: SessionRecord): number | null {
  return record.activeMs > 0 && record.answered > 0
    ? record.answered / (record.activeMs / 60_000)
    : null;
}

/** Average response time over the session's answers, or null when it wasn't kept. */
export function averageAnswerMs(record: SessionRecord): number | null {
  return record.totalResponseMs !== undefined && record.answered > 0
    ? record.totalResponseMs / record.answered
    : null;
}

function hasNumbers(value: unknown, fields: readonly string[]): value is Record<string, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    fields.every((field) => typeof (value as Record<string, unknown>)[field] === 'number')
  );
}

/** A field added in a later version: absent in older saved data, a number otherwise. */
function hasOptionalNumber(value: unknown, field: string): boolean {
  const found = (value as Record<string, unknown>)[field];
  return found === undefined || typeof found === 'number';
}

/** Structural check for a session snapshot read back from storage. */
export function isOpenSession(value: unknown): value is OpenSession {
  return (
    hasNumbers(value, ['startedAt', 'answered', 'correct']) &&
    hasOptionalNumber(value, 'totalResponseMs') &&
    typeof (value as Record<string, unknown>)['module'] === 'string' &&
    hasNumbers((value as Record<string, unknown>)['timer'], ['accumulatedMs', 'lastActivity'])
  );
}

/** Structural check for the history read back from storage. */
export function isSessionRecords(value: unknown): value is SessionRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (record) =>
        hasNumbers(record, ['startedAt', 'endedAt', 'activeMs', 'answered', 'correct']) &&
        hasOptionalNumber(record, 'totalResponseMs') &&
        typeof (record as Record<string, unknown>)['id'] === 'string' &&
        typeof (record as Record<string, unknown>)['module'] === 'string',
    )
  );
}

const pad = (value: number) => String(value).padStart(2, '0');

function startOfDay(time: number): number {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

/** "Today, 18:42", "Yesterday, 20:05", or a short date such as "Sat 10 Oct, 09:15". */
export function formatSessionStart(startedAt: number, now: number, locale?: string): string {
  const start = new Date(startedAt);
  const time = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  // Rounded, because a day with a daylight-saving change is 23 or 25 hours long.
  const daysAgo = Math.round((startOfDay(now) - startOfDay(startedAt)) / 86_400_000);
  if (daysAgo === 0) {
    return `Today, ${time}`;
  }
  if (daysAgo === 1) {
    return `Yesterday, ${time}`;
  }
  const date = start.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${date}, ${time}`;
}

/** Live clock: "4:05", or "1:02:09" past an hour. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Rounded duration for summaries: "40 s", "14 min", "1 h 05 min". */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  return hours > 0 ? `${hours} h ${pad(totalMinutes % 60)} min` : `${totalMinutes} min`;
}
