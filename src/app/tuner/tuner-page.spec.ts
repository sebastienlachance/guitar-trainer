import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import { AudioInputs } from '../core/audio/audio-inputs';
import { ListenerStatus, MicListener } from '../core/audio/mic-listener';
import { SETTLE_MS, TunerPitch } from '../core/audio/tuner';
import { TunerPage } from './tuner-page';

/** What the microphone hears; the rest of MicListener does nothing. */
function fakeMicrophone() {
  return {
    status: signal<ListenerStatus>('listening'),
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

async function renderTuner() {
  const mic = fakeMicrophone();
  const { fixture } = await render(TunerPage, {
    providers: [provideRouter([]), { provide: MicListener, useValue: mic }],
  });
  /** Plays a steady `frequency`, as heard at `time`. */
  const hear = (frequency: number, time = 0) => {
    mic.pitch.set({ frequency, time, fading: false });
    TestBed.tick();
  };
  return { mic, fixture, hear };
}

function stringItem(number: number): HTMLElement {
  const strings = within(screen.getByRole('list', { name: 'Strings' })).getAllByRole('listitem');
  return strings.find((item) => item.textContent?.includes(`String ${number}:`))!;
}

afterEach(() => localStorage.clear());

describe('TunerPage', () => {
  it('listens for the pitch while open', async () => {
    const { mic, fixture } = await renderTuner();
    expect(mic.start).toHaveBeenCalledWith('pitch');

    fixture.destroy();
    expect(mic.stop).toHaveBeenCalled();
  });

  it('listens again on the input you choose', async () => {
    const { mic } = await renderTuner();

    TestBed.inject(AudioInputs).choose({ id: 'rocksmith', label: 'Rocksmith Guitar Adapter Mono' });
    TestBed.tick();

    expect(mic.start).toHaveBeenCalledTimes(2);
  });

  it('shows the note, how far off it is, and which way to turn the peg', async () => {
    const { hear } = await renderTuner();

    hear(108.74); // A2, 20 cents flat

    expect(screen.getByText('−20 cents')).toBeInTheDocument();
    expect(screen.getByText('A2, Tune up')).toBeInTheDocument();
    expect(stringItem(5)).toHaveTextContent('playing now');
    expect(stringItem(6)).not.toHaveTextContent('playing now');
  });

  it('ticks a string off once it stays in tune for a second', async () => {
    const { hear } = await renderTuner();

    hear(110, 0);
    expect(screen.getByText('A2, In tune')).toBeInTheDocument();
    hear(110.1, SETTLE_MS - 30);
    expect(stringItem(5)).not.toHaveTextContent('in tune');

    hear(110, SETTLE_MS);
    expect(stringItem(5)).toHaveTextContent('in tune');
  });

  it('names the string to tune to when the note is off by more than a quarter tone', async () => {
    const { hear } = await renderTuner();

    hear(105.64); // A♭2 30 cents sharp: the A string, tuned well down

    expect(screen.getByText('A♭2, Tune up to A')).toBeInTheDocument();
  });

  it('shows a note far from every open string without advice', async () => {
    const { hear } = await renderTuner();

    hear(92.5); // F♯2

    expect(screen.getByText('F♯2, Not an open string')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Strings' })).queryByText(/playing now/)).toBe(
      null,
    );
  });
});
