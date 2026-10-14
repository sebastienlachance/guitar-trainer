import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PracticeLog } from './practice-log';
import { AUTO_ADVANCE_MS, PracticeRun } from './practice-run';

const deck = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];

function createRun(
  options: {
    problems?: string[];
    onStart?: () => void;
    onEnd?: () => void;
    timeLimitMs?: Signal<number | null>;
    deck?: { key: string }[];
    advanceAfterCorrect?: boolean;
  } = {},
) {
  return TestBed.runInInjectionContext(
    () =>
      new PracticeRun({
        module: 'test',
        statsKey: 'test:stats',
        deck: signal(options.deck ?? deck),
        problems: signal(options.problems ?? []),
        onStart: options.onStart,
        onEnd: options.onEnd,
        timeLimitMs: options.timeLimitMs,
        advanceAfterCorrect: options.advanceAfterCorrect,
      }),
  );
}

describe('PracticeRun', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it('is ready before a session and blocked when the settings leave nothing to practise', () => {
    expect(createRun().view()).toBe('ready');
    const blocked = createRun({ problems: ['Pick something.'] });
    expect(blocked.view()).toBe('blocked');
    expect(blocked.start()).toBe(false);
  });

  it('starts a session with a card and runs the start hook', () => {
    const onStart = vi.fn();
    const run = createRun({ onStart });

    expect(run.start()).toBe(true);

    expect(onStart).toHaveBeenCalledOnce();
    expect(run.view()).toBe('running');
    expect(run.phase()).toBe('prompt');
    expect(deck.map((card) => card.key)).toContain(run.current()?.key);
    expect(TestBed.inject(PracticeLog).current()?.module).toBe('test');
  });

  it('never shows the same card twice in a row', () => {
    const run = createRun();
    run.start();
    for (let i = 0; i < 20; i++) {
      const before = run.current()?.key;
      run.next();
      expect(run.current()?.key).not.toBe(before);
    }
  });

  it('records a self-checked answer and moves on', () => {
    const run = createRun();
    run.start();
    const card = run.current()!;

    run.reveal();
    expect(run.phase()).toBe('revealed');
    run.selfCheck(false);

    expect(run.stats()[card.key]).toMatchObject({ attempts: 1, correct: 0 });
    expect(run.phase()).toBe('prompt');
    expect(run.current()?.key).not.toBe(card.key);
  });

  it('moves on by itself after a correct checked answer', () => {
    const run = createRun();
    run.start();
    const card = run.current()!;

    run.resolve(true);
    expect(run.phase()).toBe('answered');
    expect(run.lastCorrect()).toBe(true);

    vi.advanceTimersByTime(AUTO_ADVANCE_MS);
    expect(run.phase()).toBe('prompt');
    expect(run.current()?.key).not.toBe(card.key);
  });

  it('moves straight on after a correct answer that needs no look, and remembers it', () => {
    const run = createRun();
    run.start();
    const card = run.current()!;
    vi.advanceTimersByTime(800);

    run.resolveAndMoveOn();

    expect(run.stats()[card.key]).toMatchObject({ attempts: 1, correct: 1 });
    expect(run.phase()).toBe('prompt');
    expect(run.current()?.key).not.toBe(card.key);
    expect(run.movedOn()).toEqual({ card, responseMs: 800 });

    run.reveal();
    run.selfCheck(true);
    expect(run.movedOn()).toBeNull();
  });

  it('can keep a correct answer on screen until Next', () => {
    const run = createRun({ advanceAfterCorrect: false });
    run.start();
    const card = run.current();

    run.resolve(true);
    vi.advanceTimersByTime(10 * AUTO_ADVANCE_MS);

    expect(run.phase()).toBe('answered');
    expect(run.current()).toBe(card);
  });

  it('waits for Next after a wrong checked answer', () => {
    const run = createRun();
    run.start();
    const card = run.current()!;

    run.resolve(false);
    vi.advanceTimersByTime(10 * AUTO_ADVANCE_MS);

    expect(run.phase()).toBe('answered');
    expect(run.current()).toBe(card);
    expect(run.stats()[card.key]).toMatchObject({ attempts: 1, correct: 0 });
    run.next();
    expect(run.phase()).toBe('prompt');
  });

  it('ignores a second verdict on the same card', () => {
    const run = createRun();
    run.start();
    const card = run.current()!;
    run.resolve(false);
    run.resolve(true);
    run.selfCheck(true);
    expect(run.stats()[card.key]).toMatchObject({ attempts: 1, correct: 0 });
  });

  it('ends with a summary of the session', () => {
    const onEnd = vi.fn();
    const run = createRun({ onEnd });
    run.start();
    run.resolve(true);
    vi.advanceTimersByTime(AUTO_ADVANCE_MS);
    run.reveal();
    run.selfCheck(true);

    run.end();

    expect(onEnd).toHaveBeenCalled();
    expect(run.view()).toBe('ended');
    expect(run.lastSession()).toMatchObject({ module: 'test', answered: 2, correct: 2 });
  });

  describe('with a time limit', () => {
    /** Starts a session with a 5 s limit; effects run on TestBed.tick(). */
    function startTimed(limit: number | null = 5000, cards = deck) {
      const run = createRun({ timeLimitMs: signal(limit), deck: cards });
      run.start();
      TestBed.tick();
      return run;
    }

    it('counts the card as a miss when its time runs out', () => {
      const run = startTimed();
      const card = run.current()!;
      expect(run.countdown()).toMatchObject({ ms: 5000 });

      vi.advanceTimersByTime(4999);
      expect(run.phase()).toBe('prompt');
      vi.advanceTimersByTime(1);

      expect(run.phase()).toBe('answered');
      expect(run.timedOut()).toBe(true);
      expect(run.lastCorrect()).toBe(false);
      expect(run.stats()[card.key]).toMatchObject({ attempts: 1, correct: 0 });
      TestBed.tick();
      expect(run.countdown()).toBeNull();

      run.next();
      expect(run.timedOut()).toBe(false);
    });

    it('stops while paused and starts over on resume', () => {
      const run = startTimed();
      const log = TestBed.inject(PracticeLog);

      vi.advanceTimersByTime(4000);
      log.pause();
      TestBed.tick();
      vi.advanceTimersByTime(60_000);
      expect(run.phase()).toBe('prompt');

      log.resume();
      TestBed.tick();
      vi.advanceTimersByTime(4999);
      expect(run.phase()).toBe('prompt');
      vi.advanceTimersByTime(1);
      expect(run.phase()).toBe('answered');
    });

    it('starts over for every card, even when you move straight on to the same one', () => {
      // A one-card deck shows the same card again after moving on.
      const run = startTimed(5000, [{ key: 'only' }]);

      vi.advanceTimersByTime(4000);
      run.resolveAndMoveOn();
      TestBed.tick();
      vi.advanceTimersByTime(4000);

      expect(run.phase()).toBe('prompt');
      expect(run.timedOut()).toBe(false);
    });

    it('never runs out without a limit', () => {
      const run = startTimed(null);

      vi.advanceTimersByTime(60_000);

      expect(run.phase()).toBe('prompt');
      expect(run.countdown()).toBeNull();
    });
  });
});
