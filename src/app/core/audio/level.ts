import { DEFAULT_NOTE_STREAM_OPTIONS } from './note-stream';

/** The loudness from which the listeners hear a note: anything quieter counts as silence. */
export const HEARD_LEVEL = DEFAULT_NOTE_STREAM_OPTIONS.minLevel;

/** The quietest level the meter shows, in decibels below full scale. */
const METER_FLOOR_DB = -60;

export function rootMeanSquare(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) {
    sum += sample * sample;
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * Where a level sits on the meter, from 0 to 100: on a decibel scale, as loudness is heard, from
 * 60 dB below full scale to full scale. A boosted input can go past full scale: it stays at 100.
 */
export function meterPercent(level: number): number {
  if (level <= 0) {
    return 0;
  }
  const decibels = 20 * Math.log10(level);
  const percent = ((decibels - METER_FLOOR_DB) / -METER_FLOOR_DB) * 100;
  return Math.min(100, Math.max(0, percent));
}

/** How much of its height the bar keeps from one reading to the next as a note fades. */
const RELEASE = 0.8;

/** How long a note that reached the line keeps the meter saying it was heard. */
export const HEARD_HOLD_MS = 2000;

/** What the level meter shows after a reading. */
export interface MeterReading {
  /** The level the bar shows: it jumps up with a pluck, then falls back gradually. */
  readonly shown: number;
  /** Whether something loud enough for the listeners was heard in the last `HEARD_HOLD_MS`. */
  readonly heard: boolean;
}

/** Steadies raw levels for the meter, so a pluck can be read before it fades. */
export class LevelMeter {
  private shown = 0;
  private heardAt = -Infinity;

  /** Records the level at `time`, in milliseconds on any steady clock. */
  push(level: number, time: number): MeterReading {
    this.shown = Math.max(level, this.shown * RELEASE);
    if (level >= HEARD_LEVEL) {
      this.heardAt = time;
    }
    return { shown: this.shown, heard: time - this.heardAt <= HEARD_HOLD_MS };
  }
}
