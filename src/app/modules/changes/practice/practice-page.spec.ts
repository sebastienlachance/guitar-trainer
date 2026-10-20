import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MicListener } from '../../../core/audio/mic-listener';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { ChangesSession, provideChanges } from '../changes-session';
import { TakeRecord } from '../deck';
import { ChangesSettings } from '../settings';
import { PracticePage } from './practice-page';

const C = [0, 4, 7];
const G = [7, 11, 2];

/** What the microphone hears; the rest of MicListener does nothing. */
function fakeMicrophone() {
  return {
    status: signal('listening'),
    errorMessage: signal<string | null>(null),
    heard: signal<readonly number[]>([]),
    chroma: signal<readonly number[] | null>(null),
    strums: signal(0),
    pitch: signal(null),
    start: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    stop: vi.fn(),
    clearHeard: vi.fn(),
  };
}

function save(settings: Partial<ChangesSettings>, takes: TakeRecord[] = []): void {
  localStorage.setItem(STORAGE_PREFIX + 'changes:settings', JSON.stringify(settings));
  localStorage.setItem(STORAGE_PREFIX + 'changes:takes', JSON.stringify(takes));
}

function savedTakes(): TakeRecord[] {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'changes:takes') ?? '[]');
}

/** Renders the page and starts a session on its one pair, with time under the test's control. */
async function practise() {
  const mic = fakeMicrophone();
  await render(PracticePage, {
    providers: [...provideChanges(), provideRouter([]), { provide: MicListener, useValue: mic }],
  });
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
  const session = TestBed.inject(ChangesSession);
  session.run.start();
  TestBed.tick();
  /** The given notes sounding, without a new strum (still ringing). */
  const sound = (pitchClasses: number[]) => {
    mic.chroma.set(
      Array.from({ length: 12 }, (_, pitchClass) => +pitchClasses.includes(pitchClass)),
    );
    TestBed.tick();
  };
  /** A new strum that sounds like the given notes. */
  const strum = (pitchClasses: number[]) => {
    mic.strums.update((strums) => strums + 1);
    sound(pitchClasses);
  };
  /** Lets time pass: the count-in, or the rest of the take. */
  const wait = (ms: number) => {
    vi.advanceTimersByTime(ms);
    TestBed.tick();
  };
  return { mic, session, sound, strum, wait };
}

describe('Chord changes PracticePage', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.useRealTimers());

  it('counts a change each time a fresh strum sounds like the next chord', async () => {
    save({ chords: ['C', 'G'], seconds: 60, count: 'mic' });
    const { mic, session, strum, wait } = await practise();
    expect(mic.start).toHaveBeenCalledWith('spectrum');

    session.start();
    wait(3000);
    strum(C); // the first chord starts the count
    strum(G);
    strum(C);
    wait(60_000);

    expect(screen.getByText('2 changes')).toBeInTheDocument();
    expect(savedTakes()).toEqual([
      expect.objectContaining({ pair: 'C-G', changes: 2, seconds: 60, counted: 'mic' }),
    ]);
  });

  it('does not count a chord still ringing, or one strummed out of turn', async () => {
    save({ chords: ['C', 'G'], seconds: 60, count: 'mic' });
    const { session, sound, strum, wait } = await practise();

    session.start();
    wait(3000);
    strum(C);
    sound(G); // the next chord sounds, but no strum was heard for it
    strum(C); // the chord just played, again
    wait(60_000);

    expect(screen.getByText('0 changes')).toBeInTheDocument();
  });

  it('counts a tap per change with Space, after the first chord', async () => {
    save({ chords: ['C', 'G'], seconds: 30, count: 'tap' });
    const { wait } = await practise();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.keyboard(' ');
    wait(3000);
    for (let tap = 0; tap < 4; tap++) {
      await user.keyboard(' ');
    }
    wait(30_000);

    expect(screen.getByText('3 changes in 30 s')).toBeInTheDocument();
  });

  it('compares the take with your best for the pair', async () => {
    save({ chords: ['C', 'G'], seconds: 60, count: 'tap' }, [
      { pair: 'C-G', changes: 40, seconds: 60, at: 1, counted: 'tap' },
    ]);
    const { session, wait } = await practise();
    expect(screen.getByText('Your best: 40 a minute.')).toBeInTheDocument();

    session.start();
    wait(3000);
    session.tap();
    session.tap();
    wait(60_000);

    expect(screen.getByText('1 change')).toBeInTheDocument();
    expect(screen.getByText('Your best is 40 a minute.')).toBeInTheDocument();
    expect(session.run.lastCorrect()).toBe(false);
  });

  it('celebrates a new best', async () => {
    save({ chords: ['C', 'G'], seconds: 60, count: 'tap' }, [
      { pair: 'C-G', changes: 1, seconds: 60, at: 1, counted: 'tap' },
    ]);
    const { session, wait } = await practise();

    session.start();
    wait(3000);
    for (let tap = 0; tap < 4; tap++) {
      session.tap();
    }
    wait(60_000);

    expect(screen.getByText('New best: 2 more a minute than before.')).toBeInTheDocument();
    expect(session.run.lastCorrect()).toBe(true);
    // The count says it all: no "Correct" from the practice frame under it.
    expect(screen.queryByText(/Correct/)).not.toBeInTheDocument();
  });
});
