/** One analysis frame from the microphone. */
export interface PitchFrame {
  /** Detected fundamental in Hz, or 0 when nothing was found. */
  readonly frequency: number;
  /** Pitch detector confidence from 0 to 1. */
  readonly clarity: number;
  /** Loudness of the frame (root mean square of the samples). */
  readonly level: number;
  /** Milliseconds, from any monotonic clock. */
  readonly time: number;
}

export interface NoteStreamOptions {
  readonly minClarity: number;
  /** Below this level the frame counts as silence. */
  readonly minLevel: number;
  /** How long a pitch must hold before it counts as a played note. */
  readonly stableMs: number;
}

export const DEFAULT_NOTE_STREAM_OPTIONS: NoteStreamOptions = {
  minClarity: 0.9,
  minLevel: 0.01,
  stableMs: 100,
};

/** Lowest and highest fundamentals a guitar in standard tuning produces (E2 to about fret 22 on high E). */
const MIN_GUITAR_HZ = 75;
const MAX_GUITAR_HZ = 1400;

export function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

/**
 * Turns a stream of pitch frames into discrete played notes. A note is reported once when its
 * pitch has held steady for `stableMs`; it can be reported again after silence or another note,
 * so a sustained note counts once while a re-picked one counts twice.
 */
export class NoteStream {
  private candidate: { midi: number; since: number } | null = null;
  private lastReported: number | null = null;

  constructor(private readonly options: NoteStreamOptions = DEFAULT_NOTE_STREAM_OPTIONS) {}

  /** Returns the MIDI note when this frame completes a new note, otherwise null. */
  push(frame: PitchFrame): number | null {
    if (frame.level < this.options.minLevel) {
      this.candidate = null;
      this.lastReported = null;
      return null;
    }
    const inRange = frame.frequency >= MIN_GUITAR_HZ && frame.frequency <= MAX_GUITAR_HZ;
    if (frame.clarity < this.options.minClarity || !inRange) {
      this.candidate = null;
      return null;
    }
    const midi = frequencyToMidi(frame.frequency);
    if (this.candidate?.midi !== midi) {
      this.candidate = { midi, since: frame.time };
      return null;
    }
    const held = frame.time - this.candidate.since >= this.options.stableMs;
    if (held && midi !== this.lastReported) {
      this.lastReported = midi;
      return midi;
    }
    return null;
  }
}
