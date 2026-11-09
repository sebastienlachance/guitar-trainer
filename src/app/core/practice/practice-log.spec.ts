import { TestBed } from '@angular/core/testing';
import { PracticeLog } from './practice-log';
import { IDLE_LIMIT_MS, startTimer } from './session-log';
import { STORAGE_PREFIX } from './storage';

const SECOND = 1000;

function createLog(): PracticeLog {
  TestBed.resetTestingModule();
  return TestBed.inject(PracticeLog);
}

function savedHistory(): unknown[] {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'sessions') ?? '[]');
}

describe('PracticeLog', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 13, 18, 0));
  });

  afterEach(() => vi.useRealTimers());

  it('logs a session with its answers and active time', () => {
    const log = createLog();
    log.start('triads');
    for (const correct of [true, false, true]) {
      vi.advanceTimersByTime(10 * SECOND);
      log.recordAnswer(correct, 2 * SECOND);
    }
    expect(log.activeMs()).toBe(30 * SECOND);

    const record = log.end();

    expect(record).toMatchObject({
      module: 'triads',
      answered: 3,
      correct: 2,
      activeMs: 30 * SECOND,
      totalResponseMs: 6 * SECOND,
    });
    expect(log.current()).toBeNull();
    expect(log.history()).toEqual([record]);
    expect(savedHistory()).toEqual([record]);
  });

  it('keeps the times of each group, leaving out answers with no group or no time', () => {
    const log = createLog();
    log.start('triads');
    log.recordAnswer(true, 2 * SECOND, '1-2-3');
    log.recordAnswer(true, 3 * SECOND, '2-3-4');
    log.recordAnswer(false, 4 * SECOND, '1-2-3');
    log.recordAnswer(true, 5 * SECOND);
    log.recordAnswer(true, null, '2-3-4');

    expect(log.end()?.groups).toEqual({
      '1-2-3': { answered: 2, totalResponseMs: 6 * SECOND },
      '2-3-4': { answered: 1, totalResponseMs: 3 * SECOND },
    });
  });

  it("keeps no groups for a module that doesn't group answers", () => {
    const log = createLog();
    log.start('notes');
    log.recordAnswer(true, 2 * SECOND);

    expect(log.end()).not.toHaveProperty('groups');
  });

  it('keeps the clock still while paused', () => {
    const log = createLog();
    log.start('triads');
    vi.advanceTimersByTime(20 * SECOND);
    log.pause();
    vi.advanceTimersByTime(5 * 60 * SECOND);
    expect(log.activeMs()).toBe(20 * SECOND);
    expect(log.paused()).toBe(true);
    log.resume();
    vi.advanceTimersByTime(5 * SECOND);
    expect(log.activeMs()).toBe(25 * SECOND);
  });

  it('reports idle after the limit without activity', () => {
    const log = createLog();
    log.start('triads');
    vi.advanceTimersByTime(IDLE_LIMIT_MS + SECOND);
    expect(log.idle()).toBe(true);
    log.touch();
    expect(log.idle()).toBe(false);
  });

  it('does not log a session without answers', () => {
    const log = createLog();
    log.start('triads');
    vi.advanceTimersByTime(30 * SECOND);

    expect(log.end()?.answered).toBe(0);
    expect(log.history()).toEqual([]);
  });

  it('files a session left open when the app was closed', () => {
    const lastAnswer = Date.now() - 60 * SECOND;
    const snapshot = {
      module: 'triads',
      startedAt: lastAnswer - 5 * 60 * SECOND,
      timer: { ...startTimer(lastAnswer), accumulatedMs: 4 * 60 * SECOND },
      answered: 12,
      correct: 9,
    };
    localStorage.setItem(STORAGE_PREFIX + 'sessions:open', JSON.stringify(snapshot));

    const log = createLog();

    expect(log.current()).toBeNull();
    expect(log.history()).toEqual([
      expect.objectContaining({
        answered: 12,
        correct: 9,
        activeMs: 4 * 60 * SECOND,
        endedAt: lastAnswer,
      }),
    ]);
    expect(localStorage.getItem(STORAGE_PREFIX + 'sessions:open')).toBe('null');
  });
});
