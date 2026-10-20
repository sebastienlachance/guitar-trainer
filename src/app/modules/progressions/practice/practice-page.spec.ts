import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { LitBeat, Metronome } from '../../../core/audio/metronome';
import { MicListener } from '../../../core/audio/mic-listener';
import { RhythmListener } from '../../../core/audio/rhythm-listener';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { CHORD_CHECKS_MS, ProgressionsSession, provideProgressions } from '../progressions-session';
import { ProgressionsSettings } from '../settings';
import { PracticePage } from './practice-page';

/** G D Em C, a bar each at 60 bpm: a chord every 4 seconds, 8 in a take. */
const G_D_EM_C_AT_60: Partial<ProgressionsSettings> = {
  presets: ['G-D-Em-C'],
  beatsPerChord: 4,
  startTempo: 60,
};

/** Rhythm listener, metronome and note listener stand-ins; the audio clock follows `Date.now()`. */
function fakeAudio() {
  const strikes = signal<readonly number[]>([]);
  const listener = {
    status: signal('listening'),
    errorMessage: signal<string | null>(null),
    strikes,
    now: () => Date.now() / 1000,
    context: {} as AudioContext,
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    clearStrikes: vi.fn(() => strikes.set([])),
  };
  const metronome = { beat: signal<LitBeat | null>(null), play: vi.fn(), stop: vi.fn() };
  const mic = {
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
  return { listener, metronome, mic, strikes };
}

async function practise(settings: Partial<ProgressionsSettings> = G_D_EM_C_AT_60) {
  localStorage.setItem(STORAGE_PREFIX + 'progressions:settings', JSON.stringify(settings));
  const audio = fakeAudio();
  await render(PracticePage, {
    providers: [
      ...provideProgressions(),
      provideRouter([]),
      { provide: RhythmListener, useValue: audio.listener },
      { provide: Metronome, useValue: audio.metronome },
      { provide: MicListener, useValue: audio.mic },
    ],
  });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  const session = TestBed.inject(ProgressionsSession);
  session.run.start();
  TestBed.tick();

  /** The spectrum sounds like these pitch classes from now on. */
  const sound = (pitchClasses: readonly number[]) =>
    audio.mic.chroma.set(Array.from({ length: 12 }, (_, pc) => +pitchClasses.includes(pc)));
  /** A strike `offset` seconds after a chord's first beat, sounding like `notes` (that chord by default). */
  const strike = (slot: number, offset: number, notes?: readonly number[]) => {
    const time = session.slots()[slot].time + offset;
    vi.advanceTimersByTime(Math.max(0, (time - Date.now() / 1000) * 1000));
    sound(notes ?? session.slots()[slot].chord.pitchClasses);
    audio.strikes.update((strikes) => [...strikes, time]);
    TestBed.tick();
  };
  /** A strike, then the time for every read of which chord it sounds like. */
  const strum = (slot: number, offset: number, notes?: readonly number[]) => {
    strike(slot, offset, notes);
    vi.advanceTimersByTime(Math.max(...CHORD_CHECKS_MS));
    TestBed.tick();
  };
  const finish = () => {
    vi.advanceTimersByTime(40_000);
    TestBed.tick();
  };
  return { ...audio, session, sound, strike, strum, finish };
}

function savedLevels() {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'progressions:levels') ?? '{}');
}

describe('Progressions PracticePage', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.useRealTimers());

  it('lands each chord struck on its beat, and moves the tempo up after a pass', async () => {
    const { session, metronome, strum, finish } = await practise();
    await session.play();
    expect(metronome.play).toHaveBeenCalled();
    expect(session.slots()).toHaveLength(8);

    for (let slot = 0; slot < 8; slot++) {
      strum(slot, 0.1);
      // Strumming on after the chord's first beat doesn't change how it landed.
      strum(slot, 1.5);
    }
    finish();

    expect(screen.getByText('8 of 8 chords on the beat')).toBeInTheDocument();
    expect(screen.getByText('Passed. Next time: 64 bpm.')).toBeInTheDocument();
    expect(savedLevels()).toEqual({ 'G-D-Em-C': { bpm: 64, failStreak: 0 } });
    expect(screen.queryByText(/Correct/)).not.toBeInTheDocument();
  });

  it('marks chords late or missed, and keeps the tempo after a first failed take', async () => {
    const { session, strum, finish } = await practise();
    await session.play();

    for (const slot of [0, 1, 3, 4, 5, 6]) {
      strum(slot, 0.05);
    }
    strum(2, 0.8);
    finish();

    expect(screen.getByText('6 of 8 chords on the beat · 1 late · 1 missed')).toBeInTheDocument();
    expect(screen.getByText('Not yet. Try again at 60 bpm.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'First time through' })).toHaveTextContent(
      /G\s*on time\s*D\s*on time\s*Em\s*late\s*C\s*on time/,
    );
    expect(screen.getByRole('list', { name: 'Second time through' })).toHaveTextContent(
      /C\s*missed/,
    );
  });

  it('lands a chord whose sound settles a moment after the strike', async () => {
    const { session, sound, strike, strum, finish } = await practise();
    await session.play();
    const [G, D] = session.slots().map((slot) => slot.chord.pitchClasses);
    strum(0, 0.1);

    // D is struck, but the spectrum still holds the G before it at the first read.
    strike(1, 0.1, G);
    vi.advanceTimersByTime(CHORD_CHECKS_MS[0] + 50);
    sound(D);
    vi.advanceTimersByTime(Math.max(...CHORD_CHECKS_MS));
    finish();

    expect(screen.getByRole('list', { name: 'First time through' })).toHaveTextContent(
      /G\s*on time\s*D\s*on time/,
    );
  });

  it('does not land a chord with a strike that sounds like another', async () => {
    const { session, strum, finish } = await practise();
    await session.play();
    const D = session.slots()[1].chord.pitchClasses;

    strum(0, 0.1, D);
    for (let slot = 1; slot < 8; slot++) {
      strum(slot, 0.1);
    }
    finish();

    expect(screen.getByText('7 of 8 chords on the beat · 1 missed')).toBeInTheDocument();
  });

  it('plays a take with Space', async () => {
    const { metronome } = await practise();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.keyboard(' ');

    expect(metronome.play).toHaveBeenCalled();
  });
});
