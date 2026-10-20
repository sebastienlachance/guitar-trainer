import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MicListener } from '../../../core/audio/mic-listener';
import { midiToFrequency } from '../../../core/audio/note-stream';
import { PhrasePlayer } from '../../../core/audio/phrase-player';
import { TunerPitch } from '../../../core/audio/tuner';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideBends } from '../bends-session';
import { HOLD_MS, SETTLE_MS } from '../judge';
import { BendsSettings } from '../settings';
import { PracticePage } from './practice-page';

/** With `Math.random` at 0, a whole step on the G string starts at fret 5: C4 bent up to D4. */
const C4 = 60;
const D4 = 62;
const WHOLE_STEP_ON_G: Partial<BendsSettings> = { strings: [3], sizes: [2], maxFret: 12 };

/** What the microphone hears; the rest of MicListener does nothing. */
function fakeMicrophone() {
  return {
    status: signal('listening'),
    errorMessage: signal<string | null>(null),
    heard: signal<readonly number[]>([]),
    chroma: signal<readonly number[] | null>(null),
    strums: signal(0),
    pitch: signal<TunerPitch | null>(null),
    start: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    stop: vi.fn(),
    clearHeard: vi.fn(),
  };
}

async function practise(settings: Partial<BendsSettings>) {
  localStorage.setItem(STORAGE_PREFIX + 'bends:settings', JSON.stringify(settings));
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const mic = fakeMicrophone();
  const playing = signal(false);
  const player = {
    playing,
    play: vi.fn<(notes: readonly number[]) => Promise<boolean>>(async () => true),
    stop: vi.fn(),
  };
  const user = userEvent.setup();
  await render(PracticePage, {
    providers: [
      ...provideBends(),
      provideRouter([]),
      { provide: MicListener, useValue: mic },
      { provide: PhrasePlayer, useValue: player },
    ],
  });
  await user.click(screen.getByRole('button', { name: /start session/i }));

  let time = 0;
  /** A pitch `cents` above C4 at the next frame, with a new pick first if asked. */
  const hear = (cents: number | null, picked = false) => {
    if (picked) {
      mic.strums.update((count) => count + 1);
    }
    mic.pitch.set(
      cents === null
        ? null
        : { frequency: midiToFrequency(C4) * 2 ** (cents / 1200), fading: false, time },
    );
    TestBed.tick();
    time += picked ? SETTLE_MS : 30;
  };
  /** A pick on the C, then the pitch going through `cents`, one frame each. */
  const bend = (...cents: (number | null)[]) => {
    hear(0, true);
    cents.forEach((value) => hear(value));
  };
  return { mic, player, playing, user, hear, bend };
}

/** Frames at `cents` lasting at least `ms`. */
function held(cents: number, ms: number): number[] {
  return Array.from({ length: Math.ceil(ms / 30) + 1 }, () => cents);
}

describe('Bends PracticePage', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.restoreAllMocks());

  it('asks for a bend, and plays its target first', async () => {
    const { mic, player } = await practise({ ...WHOLE_STEP_ON_G, target: 'first' });

    expect(mic.start).toHaveBeenCalledWith('pitch');
    expect(player.play).toHaveBeenCalledWith([D4]);
    expect(screen.getByRole('heading', { name: 'C → D' })).toBeInTheDocument();
    expect(screen.getByText('Bend a whole step')).toBeInTheDocument();
    expect(screen.getByText(/string 3, fret 5/)).toBeInTheDocument();
  });

  it('passes a bend held in tune, and draws it', async () => {
    const { bend } = await practise({ ...WHOLE_STEP_ON_G, target: 'ask' });

    bend(0, 90, 160, ...held(198, HOLD_MS));

    expect(screen.getByRole('status')).toHaveTextContent(
      'In tune: 2 cents flat, held for half a second.',
    );
    expect(document.querySelector('polyline.curve.held')).not.toBeNull();
    expect(screen.queryByText(/Correct/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument();
  });

  it('says how far a bend fell short, and what to do', async () => {
    const { bend } = await practise({ ...WHOLE_STEP_ON_G, target: 'ask' });

    bend(0, 90, 150, 172, 170, null);

    expect(screen.getByRole('status')).toHaveTextContent('Not quite: 28 cents flat at the top.');
    expect(screen.getByText(/Push a little further/)).toBeInTheDocument();
  });

  it('points out the target fretted rather than bent up to', async () => {
    const { hear } = await practise({ ...WHOLE_STEP_ON_G, target: 'ask' });

    hear(200, true);
    hear(200);

    expect(screen.getByRole('status')).toHaveTextContent(
      'That was the D fretted: pick the C and bend up to it.',
    );
  });

  it('does not take the target playing for a bend', async () => {
    const { playing, hear } = await practise({ ...WHOLE_STEP_ON_G, target: 'first' });
    playing.set(true);

    hear(200, true);
    held(200, HOLD_MS).forEach((cents) => hear(cents));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('plays the target again with T', async () => {
    const { player, user } = await practise({ ...WHOLE_STEP_ON_G, target: 'ask' });
    expect(player.play).not.toHaveBeenCalled();

    await user.keyboard('t');

    expect(player.play).toHaveBeenCalledWith([D4]);
  });
});
