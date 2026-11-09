import {
  PROGRESS_SESSIONS,
  USUAL_SESSIONS,
  groupProgress,
  slowestCards,
  usualAnswerMs,
  usualGroupMs,
} from './session-compare';
import { SessionGroups, SessionRecord } from './session-log';

const SECOND = 1000;

/** A session that started at `startedAt`, with `answered` answers of `eachMs` each. */
function session(
  startedAt: number,
  eachMs: number,
  options: { module?: string; answered?: number; groups?: SessionGroups } = {},
): SessionRecord {
  const answered = options.answered ?? 10;
  return {
    id: `s-${startedAt}`,
    module: options.module ?? 'triads',
    startedAt,
    endedAt: startedAt + 1,
    activeMs: 60 * SECOND,
    answered,
    correct: answered,
    totalResponseMs: answered * eachMs,
    ...(options.groups ? { groups: options.groups } : {}),
  };
}

/** One group's answers: `answered` of `eachMs` each. */
function on(key: string, eachMs: number, answered = 10): SessionGroups {
  return { [key]: { answered, totalResponseMs: answered * eachMs } };
}

describe('usualAnswerMs', () => {
  it('averages your last sessions before this one, each answer weighing the same', () => {
    const now = session(100, 2 * SECOND);
    const history = [
      now,
      session(90, 3 * SECOND, { answered: 30 }),
      session(80, 1 * SECOND, { answered: 10 }),
    ];

    expect(usualAnswerMs(now, history)).toEqual({ averageMs: 2.5 * SECOND, sessions: 2 });
  });

  it('only counts the last few sessions, of the same module', () => {
    const now = session(100, 2 * SECOND);
    const older = Array.from({ length: USUAL_SESSIONS }, (_, i) => session(90 - i, 3 * SECOND));
    const history = [
      now,
      session(95, 9 * SECOND, { module: 'notes' }),
      ...older,
      session(10, 9 * SECOND),
    ];

    expect(usualAnswerMs(now, history)).toEqual({
      averageMs: 3 * SECOND,
      sessions: USUAL_SESSIONS,
    });
  });

  it('compares a session with others on the same groups', () => {
    const now = session(100, 2 * SECOND, { groups: on('2-3-4', 2 * SECOND) });
    const history = [
      now,
      session(90, 9 * SECOND, { groups: on('1-2-3', 9 * SECOND) }),
      session(80, 9 * SECOND),
      session(70, 3 * SECOND, { groups: on('2-3-4', 3 * SECOND) }),
    ];

    expect(usualAnswerMs(now, history)).toEqual({ averageMs: 3 * SECOND, sessions: 1 });
  });

  it('has nothing to compare with in a first session, or one that kept no times', () => {
    const now = session(100, 2 * SECOND);
    expect(usualAnswerMs(now, [now])).toBeNull();
    const untimed = { ...session(90, 0), totalResponseMs: undefined };
    expect(usualAnswerMs(now, [now, untimed])).toBeNull();
  });
});

describe('usualGroupMs', () => {
  it('averages the group over your last sessions that had it', () => {
    const now = session(100, 2 * SECOND, {
      groups: { ...on('1-2-3', SECOND), ...on('2-3-4', 3 * SECOND) },
    });
    const history = [
      now,
      session(90, 2 * SECOND, { groups: { ...on('1-2-3', 2 * SECOND), ...on('3-4-5', SECOND) } }),
      session(80, 2 * SECOND),
      session(70, 4 * SECOND, { groups: on('1-2-3', 4 * SECOND) }),
    ];

    expect(usualGroupMs('1-2-3', now, history)).toEqual({ averageMs: 3 * SECOND, sessions: 2 });
    expect(usualGroupMs('2-3-4', now, history)).toBeNull();
  });
});

describe('groupProgress', () => {
  it('gives each group its first and latest times, in the order given', () => {
    const times = [5, 4, 3, 3, 2, 1];
    const history = times
      .map((each, i) => session(i, each * SECOND, { groups: on('1-2-3', each * SECOND) }))
      .reverse();
    history.push(session(50, 9 * SECOND, { module: 'notes', groups: on('2-3-4', SECOND) }));

    expect(groupProgress(history, 'triads', ['2-3-4', '1-2-3'])).toEqual([
      { key: '1-2-3', sessions: 6, firstMs: 4 * SECOND, latelyMs: 2 * SECOND },
    ]);
  });

  it('has no first times until there are more sessions than it averages', () => {
    const history = Array.from({ length: PROGRESS_SESSIONS }, (_, i) =>
      session(i, 2 * SECOND, { groups: on('3-4-5', 2 * SECOND) }),
    );

    expect(groupProgress(history, 'triads', ['3-4-5'])).toEqual([
      { key: '3-4-5', sessions: PROGRESS_SESSIONS, firstMs: null, latelyMs: 2 * SECOND },
    ]);
  });
});

describe('slowestCards', () => {
  const answer = (key: string, responseMs: number | null, correct = true) => ({
    key,
    correct,
    responseMs,
  });

  it('ranks the cards by the average of their right answers', () => {
    const answers = [
      answer('C', 1000),
      answer('D', 4000),
      answer('E', 2000),
      answer('C', 5000),
      answer('F', 9000, false),
      answer('F', 500),
      answer('G', null),
    ];

    expect(slowestCards(answers, 2)).toEqual([
      { key: 'D', averageMs: 4000 },
      { key: 'C', averageMs: 3000 },
    ]);
  });

  it('names none when no more cards than asked for were answered right', () => {
    expect(
      slowestCards([answer('C', 1000), answer('D', 2000), answer('E', 3000, false)], 2),
    ).toEqual([]);
  });
});
