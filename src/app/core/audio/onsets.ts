import { DEFAULT_NOTE_STREAM_OPTIONS } from './note-stream';

/** The loudness of one analysis frame. */
export interface LevelFrame {
  /** Root mean square of the samples. */
  readonly level: number;
  /** Milliseconds, from any monotonic clock. */
  readonly time: number;
}

export interface OnsetOptions {
  /** Below this level the frame counts as silence. */
  readonly minLevel: number;
  /** How many times louder than the quietest recent frame a frame must be to count as an attack. */
  readonly rise: number;
  /** How far back "recent" goes. */
  readonly lookbackMs: number;
  /** Shortest time between two attacks, so a strum counts once while it swells. */
  readonly holdMs: number;
}

export const DEFAULT_ONSET_OPTIONS: OnsetOptions = {
  minLevel: DEFAULT_NOTE_STREAM_OPTIONS.minLevel,
  rise: 1.5,
  lookbackMs: 90,
  holdMs: 250,
};

/**
 * Spots attacks: the moments strings are struck and the sound gets much louder at once. A chord
 * left ringing only fades, so it never makes a new attack; strumming again over it does.
 */
export class OnsetDetector {
  private recent: LevelFrame[] = [];
  private lastAttack = -Infinity;

  constructor(private readonly options: OnsetOptions = DEFAULT_ONSET_OPTIONS) {}

  /** True when this frame is the start of a new attack. */
  push(frame: LevelFrame): boolean {
    const before = this.recent.filter(
      (earlier) => frame.time - earlier.time <= this.options.lookbackMs,
    );
    this.recent = [...before, frame];
    if (frame.level < this.options.minLevel || frame.time - this.lastAttack < this.options.holdMs) {
      return false;
    }
    const quietest = Math.min(...before.map((earlier) => earlier.level));
    // With nothing heard before, the first sound is an attack: quietest is Infinity only then.
    const attack = before.length === 0 || frame.level >= this.options.rise * quietest;
    if (attack) {
      this.lastAttack = frame.time;
    }
    return attack;
  }
}
