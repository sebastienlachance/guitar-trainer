import {
  IDLE_LIMIT_MS,
  SessionRecord,
  answersPerMinute,
  averageAnswerMs,
  closeSession,
  elapsedMs,
  formatClock,
  formatDuration,
  formatSessionStart,
  isIdle,
  isOpenSession,
  isSessionRecords,
  pauseTimer,
  resumeTimer,
  startTimer,
  touchTimer,
} from './session-log';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

describe('active timer', () => {
  it('counts the time between activities', () => {
    let timer = startTimer(0);
    timer = touchTimer(timer, 20 * SECOND);
    timer = touchTimer(timer, 50 * SECOND);
    expect(elapsedMs(timer, 50 * SECOND)).toBe(50 * SECOND);
    expect(elapsedMs(timer, 60 * SECOND)).toBe(60 * SECOND);
  });

  it('counts at most the idle limit for a long gap', () => {
    let timer = startTimer(0);
    timer = touchTimer(timer, MINUTE);
    timer = touchTimer(timer, MINUTE + 3 * 60 * MINUTE); // back three hours later
    expect(elapsedMs(timer, MINUTE + 3 * 60 * MINUTE)).toBe(MINUTE + IDLE_LIMIT_MS);
  });

  it('freezes while idle instead of running backwards', () => {
    const timer = touchTimer(startTimer(0), MINUTE);
    const atLimit = elapsedMs(timer, MINUTE + IDLE_LIMIT_MS);
    expect(isIdle(timer, MINUTE + IDLE_LIMIT_MS)).toBe(true);
    expect(elapsedMs(timer, MINUTE + IDLE_LIMIT_MS + 10 * MINUTE)).toBe(atLimit);
    expect(isIdle(timer, MINUTE + 30 * SECOND)).toBe(false);
  });

  it('leaves paused time out and ignores activity while paused', () => {
    let timer = startTimer(0);
    timer = pauseTimer(timer, 30 * SECOND);
    timer = touchTimer(timer, 40 * SECOND);
    expect(elapsedMs(timer, 10 * MINUTE)).toBe(30 * SECOND);
    expect(isIdle(timer, 10 * MINUTE)).toBe(false);
    timer = resumeTimer(timer, 10 * MINUTE);
    expect(elapsedMs(timer, 10 * MINUTE + 15 * SECOND)).toBe(45 * SECOND);
  });

  it('closes a session into a record', () => {
    const open = {
      module: 'triads',
      startedAt: 0,
      timer: startTimer(0),
      answered: 4,
      correct: 3,
      totalResponseMs: 10 * SECOND,
    };
    expect(closeSession(open, 90 * SECOND)).toEqual({
      id: 'triads-0',
      module: 'triads',
      startedAt: 0,
      endedAt: 90 * SECOND,
      activeMs: 90 * SECOND,
      answered: 4,
      correct: 3,
      totalResponseMs: 10 * SECOND,
    });
  });
});

describe('session pace', () => {
  const record: SessionRecord = {
    id: 'triads-0',
    module: 'triads',
    startedAt: 0,
    endedAt: 0,
    activeMs: 2 * MINUTE,
    answered: 24,
    correct: 24,
    totalResponseMs: 60 * SECOND,
  };

  it('gives answers per minute of active time', () => {
    expect(answersPerMinute(record)).toBe(12);
    expect(answersPerMinute({ ...record, activeMs: 0 })).toBeNull();
  });

  it('gives the average time per answer, when it was kept', () => {
    expect(averageAnswerMs(record)).toBe(2500);
    const older: SessionRecord = { ...record, totalResponseMs: undefined };
    expect(averageAnswerMs(older)).toBeNull();
  });
});

describe('formatting', () => {
  it('shows a live clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(4 * MINUTE + 5 * SECOND + 900)).toBe('4:05');
    expect(formatClock(62 * MINUTE + 9 * SECOND)).toBe('1:02:09');
  });

  it('rounds durations for summaries', () => {
    expect(formatDuration(40 * SECOND)).toBe('40 s');
    expect(formatDuration(59.7 * SECOND)).toBe('1 min');
    expect(formatDuration(14 * MINUTE + 10 * SECOND)).toBe('14 min');
    expect(formatDuration(65 * MINUTE)).toBe('1 h 05 min');
  });

  it('names recent days', () => {
    const now = new Date(2026, 9, 13, 21, 0).getTime();
    expect(formatSessionStart(new Date(2026, 9, 13, 18, 42).getTime(), now)).toMatch(/^Today, /);
    expect(formatSessionStart(new Date(2026, 9, 12, 23, 59).getTime(), now)).toMatch(
      /^Yesterday, /,
    );
    expect(formatSessionStart(new Date(2026, 9, 10, 9, 15).getTime(), now)).not.toMatch(
      /^(Today|Yesterday)/,
    );
  });
});

describe('saved data checks', () => {
  it('accepts well-formed records and rejects the rest', () => {
    const record = {
      id: 'triads-1',
      module: 'triads',
      startedAt: 1,
      endedAt: 2,
      activeMs: 1,
      answered: 1,
      correct: 1,
    };
    expect(isSessionRecords([record])).toBe(true);
    expect(isSessionRecords([{ ...record, totalResponseMs: 900 }])).toBe(true);
    expect(isSessionRecords([{ ...record, totalResponseMs: '900' }])).toBe(false);
    expect(isSessionRecords([{ ...record, answered: '1' }])).toBe(false);
    expect(isSessionRecords({})).toBe(false);
  });

  it('accepts a well-formed open session only', () => {
    const open = { module: 'triads', startedAt: 0, timer: startTimer(0), answered: 0, correct: 0 };
    expect(isOpenSession(open)).toBe(true);
    expect(isOpenSession({ ...open, timer: null })).toBe(false);
    expect(isOpenSession(null)).toBe(false);
  });
});
