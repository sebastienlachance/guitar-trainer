import { midiToFrequency } from '../../core/audio/note-stream';
import { TunerPitch } from '../../core/audio/tuner';

/** A bend this close to the target pitch is in tune, in cents. */
export const IN_TUNE_CENTS = 10;
/** How long a bend must stay in tune to count. */
export const HOLD_MS = 500;
/**
 * Readings this soon after a pick are skipped: the pitch reading needs about this long to forget
 * the note before and the noise of the attack.
 */
export const SETTLE_MS = 120;
/** The first reading after a pick must be this close to the fretted note: else it wasn't picked. */
const START_RANGE_CENTS = 50;
/** A note that rose less than this was picked, not bent: no verdict. */
const MIN_RISE_CENTS = 25;

/** One reading of a bend: when, and how far above the fretted note, in cents. */
export interface BendPoint {
  /** Milliseconds since the pick. */
  readonly time: number;
  readonly cents: number;
}

/**
 * held: the bend stayed in tune for `HOLD_MS`, `centsOff` from the target on average while held;
 * missed: it ended without that, `centsOff` from the target at its highest (negative: flat).
 * fretted: the target note was played rather than bent up to: a hint, not a verdict.
 */
export type BendResult =
  { readonly kind: 'held' | 'missed'; readonly centsOff: number } | { readonly kind: 'fretted' };

/** What the microphone gives, frame by frame. */
export interface BendFrame {
  /** The steadied pitch, as the tuner reads it; null when nothing is sounding. */
  readonly pitch: TunerPitch | null;
  /** The microphone's count of attacks: a new one is a new pick. */
  readonly attacks: number;
  /** Milliseconds, on the clock of the pitch readings. */
  readonly time: number;
}

interface Attempt {
  readonly pickedAt: number;
  started: boolean;
  peak: number;
  holdingSince: number | null;
  holdOffsets: number[];
}

/**
 * Follows bends of one note up to a target: a pick on the fretted note, then the pitch rising,
 * with no new pick, until it holds in tune or the note ends. Playing the target note fretted
 * doesn't count: its first reading is already at the target.
 */
export class BendJudge {
  /** The readings of the current or last bend, for drawing it. */
  trace: readonly BendPoint[] = [];

  private attempt: Attempt | null = null;
  private readonly startHz: number;
  private readonly targetCents: number;

  constructor(
    start: number,
    target: number,
    /** Attacks heard before this bend was asked for, which don't start one. */
    private attacksSeen: number,
  ) {
    this.startHz = midiToFrequency(start);
    this.targetCents = (target - start) * 100;
  }

  /** Attacks heard while not listening (the target playing) don't start a bend. */
  skip(attacks: number): void {
    this.attacksSeen = attacks;
    this.attempt = null;
  }

  /** Takes a frame; returns a verdict, or a hint, when this frame brings one. */
  push(frame: BendFrame): BendResult | null {
    if (frame.attacks > this.attacksSeen) {
      this.attacksSeen = frame.attacks;
      const ended = this.end();
      this.attempt = {
        pickedAt: frame.time,
        started: false,
        peak: -Infinity,
        holdingSince: null,
        holdOffsets: [],
      };
      return ended;
    }
    const attempt = this.attempt;
    if (!attempt || frame.time - attempt.pickedAt < SETTLE_MS) {
      return null;
    }
    if (!frame.pitch || frame.pitch.fading) {
      return this.end();
    }
    const cents = 1200 * Math.log2(frame.pitch.frequency / this.startHz);
    if (!attempt.started) {
      if (Math.abs(cents - this.targetCents) <= START_RANGE_CENTS) {
        this.attempt = null;
        return { kind: 'fretted' };
      }
      if (Math.abs(cents) > START_RANGE_CENTS) {
        // Another note: not this bend.
        this.attempt = null;
        return null;
      }
      attempt.started = true;
      this.trace = [];
    }
    this.trace = [...this.trace, { time: frame.time - attempt.pickedAt, cents }];
    attempt.peak = Math.max(attempt.peak, cents);
    const offset = cents - this.targetCents;
    if (Math.abs(offset) > IN_TUNE_CENTS) {
      attempt.holdingSince = null;
      attempt.holdOffsets = [];
      return null;
    }
    attempt.holdingSince ??= frame.time;
    attempt.holdOffsets.push(offset);
    if (frame.time - attempt.holdingSince < HOLD_MS) {
      return null;
    }
    this.attempt = null;
    const average = attempt.holdOffsets.reduce((sum, value) => sum + value, 0);
    return { kind: 'held', centsOff: average / attempt.holdOffsets.length };
  }

  /** The bend is over (the note faded, or a new pick): a miss if it rose at all. */
  private end(): BendResult | null {
    const attempt = this.attempt;
    this.attempt = null;
    if (!attempt?.started || attempt.peak < MIN_RISE_CENTS) {
      return null;
    }
    return { kind: 'missed', centsOff: attempt.peak - this.targetCents };
  }
}
