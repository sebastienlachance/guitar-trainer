import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PracticeLog } from './practice-log';
import { AUTO_ADVANCE_MS, PracticeRun } from './practice-run';

const deck = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];

function createRun(
  options: { problems?: string[]; onStart?: () => void; onEnd?: () => void } = {},
) {
  return TestBed.runInInjectionContext(
    () =>
      new PracticeRun({
        module: 'test',
        statsKey: 'test:stats',
        deck: signal(deck),
        problems: signal(options.problems ?? []),
        onStart: options.onStart,
        onEnd: options.onEnd,
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
});
