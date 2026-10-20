import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PracticeLog } from './practice-log';
import { PracticeRun } from './practice-run';
import { Take } from './take';

function setUp() {
  const inputLost = signal(false);
  const onStop = vi.fn();
  const { run, take } = TestBed.runInInjectionContext(() => {
    const run = new PracticeRun({
      module: 'test',
      statsKey: 'test:stats',
      deck: signal([{ key: 'a' }]),
      problems: signal([]),
    });
    return { run, take: new Take<'playing'>({ run, inputLost, onStop }) };
  });
  run.start();
  return { run, take, inputLost, onStop, log: TestBed.inject(PracticeLog) };
}

/** A take under way, with an action due in a second. */
async function playing(take: Take<'playing'>) {
  await take.prepare(async () => true);
  take.stage.set('playing');
  const due = vi.fn();
  take.after(1000, due);
  TestBed.tick();
  return due;
}

describe('Take', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it('runs its actions on time and goes back to idle when it stops', async () => {
    const { take, onStop } = setUp();
    const due = await playing(take);

    vi.advanceTimersByTime(1000);
    expect(due).toHaveBeenCalledOnce();

    take.stop();
    expect(take.stage()).toBe('idle');
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('is dropped when the session pauses', async () => {
    const { take, log, onStop } = setUp();
    const due = await playing(take);

    log.pause();
    TestBed.tick();
    vi.advanceTimersByTime(1000);

    expect(take.stage()).toBe('idle');
    expect(onStop).toHaveBeenCalledOnce();
    expect(due).not.toHaveBeenCalled();
    expect(take.canStart()).toBe(false);
  });

  it('is dropped when the microphone stops, but not while it is still opening', async () => {
    const { take, inputLost } = setUp();
    // The microphone isn't listening yet while it opens.
    inputLost.set(true);
    let opened!: (ready: boolean) => void;
    const ready = take.prepare(() => new Promise<boolean>((resolve) => (opened = resolve)));
    TestBed.tick();
    expect(take.stage()).toBe('starting');

    inputLost.set(false);
    opened(true);
    expect(await ready).toBe(true);
    take.stage.set('playing');
    TestBed.tick();
    expect(take.stage()).toBe('playing');

    inputLost.set(true);
    TestBed.tick();

    expect(take.stage()).toBe('idle');
  });

  it('starts once while getting ready, however often Play is pressed', async () => {
    const { take } = setUp();
    let opened!: (ready: boolean) => void;
    const ready = vi.fn(() => new Promise<boolean>((resolve) => (opened = resolve)));

    const first = take.prepare(ready);
    const second = take.prepare(ready);
    opened(true);

    expect(await first).toBe(true);
    expect(await second).toBeNull();
    expect(ready).toHaveBeenCalledOnce();
  });

  it('gives up when not ready, or when the take was dropped while getting ready', async () => {
    const { take, log } = setUp();

    expect(await take.prepare(async () => null)).toBeNull();
    expect(take.stage()).toBe('idle');

    let opened!: (ready: boolean) => void;
    const ready = take.prepare(() => new Promise<boolean>((resolve) => (opened = resolve)));
    log.pause();
    TestBed.tick();
    opened(true);

    expect(await ready).toBeNull();
    expect(take.stage()).toBe('idle');
  });
});
