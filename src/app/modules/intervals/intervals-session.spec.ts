import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MicListener } from '../../core/audio/mic-listener';
import { STORAGE_PREFIX } from '../../core/practice/storage';
import { IntervalsSession, provideIntervals } from './intervals-session';
import { IntervalsSettings } from './settings';

/** Notes heard by the microphone, as MIDI numbers; the rest of MicListener does nothing. */
function fakeMicrophone() {
  return {
    heard: signal<readonly number[]>([]),
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    clearHeard: vi.fn(),
  };
}

/** With Math.random at 0: find the ♭3 (A) of F♯ minor pentatonic, frets 1–5. */
function startFindingMinorThird() {
  const settings: Partial<IntervalsSettings> = {
    tasks: ['find'],
    scales: ['minor-pentatonic'],
    rootStrings: [6],
    micMode: 'play',
  };
  localStorage.setItem(STORAGE_PREFIX + 'intervals:settings', JSON.stringify(settings));
  const mic = fakeMicrophone();
  TestBed.configureTestingModule({
    providers: [...provideIntervals(), { provide: MicListener, useValue: mic }],
  });
  const session = TestBed.inject(IntervalsSession);
  session.run.start();
  return { session, mic };
}

describe('IntervalsSession with the microphone', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('listens once a session starts', () => {
    const { mic } = startFindingMinorThird();

    expect(mic.start).toHaveBeenCalledWith('notes');
  });

  it('answers a Find question with the interval played in the position', () => {
    const { session, mic } = startFindingMinorThird();

    mic.heard.set([57]); // A3, string 3 fret 2
    TestBed.tick();

    expect(session.run.lastCorrect()).toBe(true);
    expect(session.tapped()).toEqual({ string: 3, fret: 2 });
  });

  it('ignores other notes, even ones of the scale', () => {
    const { session, mic } = startFindingMinorThird();

    mic.heard.set([52]); // E3, the ♭7
    TestBed.tick();
    mic.heard.set([52, 81]); // A5: the right note, but above the position
    TestBed.tick();

    expect(session.run.phase()).toBe('prompt');
  });
});
