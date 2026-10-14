import { Provider, signal } from '@angular/core';
import { Click, LitBeat, Metronome } from '../../core/audio/metronome';
import { RhythmListener } from '../../core/audio/rhythm-listener';
import { STORAGE_PREFIX } from '../../core/practice/storage';
import { RhythmSettings } from './settings';

/**
 * Stand-ins for the microphone and metronome in component tests. The audio clock follows
 * `Date.now()`, so fake timers move it; the metronome records the clicks it was asked to play.
 */
export function fakeRhythmAudio() {
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
  const played: Click[][] = [];
  const metronome = {
    beat: signal<LitBeat | null>(null),
    play: vi.fn((_context: AudioContext, clicks: readonly Click[]) => played.push([...clicks])),
    stop: vi.fn(),
  };
  const providers: Provider[] = [
    { provide: RhythmListener, useValue: listener },
    { provide: Metronome, useValue: metronome },
  ];
  /** The clicks of the last thing played, and a way to strike at chosen moments. */
  const lastClicks = () => played[played.length - 1].map((click) => click.time);
  return { listener, metronome, providers, lastClicks, strikes };
}

export function saveRhythmSettings(settings: Partial<RhythmSettings>): void {
  localStorage.setItem(STORAGE_PREFIX + 'rhythm:settings', JSON.stringify(settings));
}
