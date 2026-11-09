import { GroupTotals, SessionAnswer, SessionRecord, averageAnswerMs } from './session-log';

/** Earlier sessions a session is compared with: enough to even out one good or bad day. */
export const USUAL_SESSIONS = 5;

/** Sessions at each end of a group's history, for "at first" and "lately". */
export const PROGRESS_SESSIONS = 3;

/** Your usual time per answer, and how many sessions it covers. */
export interface Usual {
  readonly averageMs: number;
  readonly sessions: number;
}

/** How your time per answer in one group went, from your first sessions to your latest. */
export interface GroupProgress {
  readonly key: string;
  readonly sessions: number;
  /** Over your first sessions; null until there are more sessions than that. */
  readonly firstMs: number | null;
  readonly latelyMs: number;
}

export interface SlowCard {
  readonly key: string;
  readonly averageMs: number;
}

/** Each answer weighs the same, however the answers are spread over sessions. */
function averageOf(totals: readonly GroupTotals[]): number {
  const answered = totals.reduce((sum, total) => sum + total.answered, 0);
  const ms = totals.reduce((sum, total) => sum + total.totalResponseMs, 0);
  return answered > 0 ? ms / answered : 0;
}

function usualOf(totals: readonly GroupTotals[]): Usual | null {
  return totals.length > 0 ? { averageMs: averageOf(totals), sessions: totals.length } : null;
}

/** The module's sessions that started before `record`, newest first. */
function sessionsBefore(record: SessionRecord, history: readonly SessionRecord[]): SessionRecord[] {
  return history
    .filter((other) => other.module === record.module && other.startedAt < record.startedAt)
    .sort((a, b) => b.startedAt - a.startedAt);
}

function groupsOf(record: SessionRecord): string {
  return Object.keys(record.groups ?? {})
    .sort()
    .join(',');
}

/**
 * Your usual time per answer before this session, over your last few sessions with the same
 * groups (the same string sets, say), so a session is compared with others like it. Null when
 * there are none.
 */
export function usualAnswerMs(
  record: SessionRecord,
  history: readonly SessionRecord[],
): Usual | null {
  const groups = groupsOf(record);
  return usualOf(
    sessionsBefore(record, history)
      .filter((other) => groupsOf(other) === groups && averageAnswerMs(other) !== null)
      .slice(0, USUAL_SESSIONS)
      .map((other) => ({ answered: other.answered, totalResponseMs: other.totalResponseMs ?? 0 })),
  );
}

/** Your usual time per answer in one group, over your last few earlier sessions that had it. */
export function usualGroupMs(
  key: string,
  record: SessionRecord,
  history: readonly SessionRecord[],
): Usual | null {
  return usualOf(
    sessionsBefore(record, history)
      .flatMap((other) => (other.groups?.[key] ? [other.groups[key]] : []))
      .slice(0, USUAL_SESSIONS),
  );
}

/** Each group's progress in a module, in the order of `keys`, leaving out groups never played. */
export function groupProgress(
  history: readonly SessionRecord[],
  module: string,
  keys: readonly string[],
): GroupProgress[] {
  const oldestFirst = history
    .filter((record) => record.module === module)
    .sort((a, b) => a.startedAt - b.startedAt);
  return keys.flatMap((key) => {
    const totals = oldestFirst.flatMap((record) =>
      record.groups?.[key] ? [record.groups[key]] : [],
    );
    if (totals.length === 0) {
      return [];
    }
    return [
      {
        key,
        sessions: totals.length,
        firstMs:
          totals.length > PROGRESS_SESSIONS ? averageOf(totals.slice(0, PROGRESS_SESSIONS)) : null,
        latelyMs: averageOf(totals.slice(-PROGRESS_SESSIONS)),
      },
    ];
  });
}

/**
 * The cards you were slowest on in a session, slowest first, each by the average of its right
 * answers (a miss says nothing about speed). Empty unless more than `count` cards were answered
 * right in time: the slowest 3 of 3 cards say nothing.
 */
export function slowestCards(answers: readonly SessionAnswer[], count: number): SlowCard[] {
  const timesByKey = new Map<string, number[]>();
  for (const answer of answers) {
    if (answer.correct && answer.responseMs !== null) {
      timesByKey.set(answer.key, [...(timesByKey.get(answer.key) ?? []), answer.responseMs]);
    }
  }
  if (timesByKey.size <= count) {
    return [];
  }
  return [...timesByKey]
    .map(([key, times]) => ({
      key,
      averageMs: times.reduce((sum, ms) => sum + ms, 0) / times.length,
    }))
    .sort((a, b) => b.averageMs - a.averageMs)
    .slice(0, count);
}
