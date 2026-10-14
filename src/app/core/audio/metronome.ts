import { Service, signal } from '@angular/core';
import { gridTimes, hitGap } from './timing';

/** bar: the first beat of a bar; beat: the other beats; sub: the clicks between beats. */
export type ClickAccent = 'bar' | 'beat' | 'sub';

export interface Click {
  /** Seconds, on the audio clock. */
  readonly time: number;
  readonly accent: ClickAccent;
  /** Which beat of the bar the click is in, from 1. */
  readonly count: number;
}

/** Clicks for `bars` bars from `start`, with `perBeat` clicks in each beat (2 for eighths). */
export function clickSchedule(
  start: number,
  bpm: number,
  perBeat: number,
  bars: number,
  beatsPerBar = 4,
): Click[] {
  const perBar = beatsPerBar * perBeat;
  return gridTimes(start, hitGap(bpm, perBeat), bars * perBar).map((time, index) => ({
    time,
    accent: index % perBar === 0 ? 'bar' : index % perBeat === 0 ? 'beat' : 'sub',
    count: Math.floor((index % perBar) / perBeat) + 1,
  }));
}

/**
 * A high, short tick: 5 kHz is far above what the rhythm listener times (it filters out
 * everything above 1.5 kHz), so the tick from speakers doesn't count as a strike.
 */
const TICK_HZ = 5000;
const TICK_LEVEL: Readonly<Record<ClickAccent, number>> = { bar: 0.6, beat: 0.35, sub: 0.15 };

/** A beat the light shows. */
export interface LitBeat {
  /** Goes up with every beat, so the light can flash again on each. */
  readonly index: number;
  readonly count: number;
  readonly accent: ClickAccent;
}

/**
 * Plays clicks at exact times on an audio clock, with a light that follows the beats. Sound and
 * strikes share the clock, so a strike's offset from its click is exact.
 */
@Service()
export class Metronome {
  /** The beat the light shows; null when stopped. */
  readonly beat = signal<LitBeat | null>(null);

  private ticks: OscillatorNode[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];

  /** Plays the clicks: with a tick, or only with the light when `sound` is false. */
  play(context: AudioContext, clicks: readonly Click[], sound: boolean): void {
    this.stop();
    clicks.forEach((click, index) => {
      if (sound) {
        this.ticks.push(this.tick(context, click));
      }
      if (click.accent !== 'sub') {
        // The light only needs to look on time: a timer is close enough, and costs no audio.
        const delay = Math.max(0, (click.time - context.currentTime) * 1000);
        this.timers.push(
          setTimeout(
            () => this.beat.set({ index, count: click.count, accent: click.accent }),
            delay,
          ),
        );
      }
    });
    const last = clicks.at(-1);
    if (last) {
      const end = Math.max(0, (last.time - context.currentTime) * 1000 + 400);
      this.timers.push(setTimeout(() => this.beat.set(null), end));
    }
  }

  stop(): void {
    for (const tick of this.ticks) {
      try {
        tick.stop();
      } catch {
        // Already finished.
      }
    }
    this.ticks = [];
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.beat.set(null);
  }

  private tick(context: AudioContext, click: Click): OscillatorNode {
    const oscillator = new OscillatorNode(context, { frequency: TICK_HZ });
    const envelope = new GainNode(context, { gain: 0 });
    envelope.gain.setValueAtTime(0, click.time);
    envelope.gain.linearRampToValueAtTime(TICK_LEVEL[click.accent], click.time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, click.time + 0.03);
    oscillator.connect(envelope).connect(context.destination);
    oscillator.start(click.time);
    oscillator.stop(click.time + 0.04);
    return oscillator;
  }
}
