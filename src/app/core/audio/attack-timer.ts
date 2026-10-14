import { OnsetDetector, OnsetOptions } from './onsets';

/** Loudness is measured every 64 samples: about 1.3 ms at 48 kHz. */
const HOP = 64;

/**
 * Loudness is the RMS of the last 12 ms: one full cycle of the low E string, so its level
 * doesn't ripple with the waveform. A rippling level hides how loud the sound before a strike
 * was, and that is what timing a strike precisely depends on (see `startOf`).
 */
const WINDOW_MS = 12;

/**
 * For rhythm: compare with the last 40 ms only, and allow a new strike 55 ms after the last,
 * which leaves room for sixteenth notes at 240 bpm (62 ms apart).
 */
export const STRIKE_OPTIONS: OnsetOptions = {
  minLevel: 0.01,
  rise: 1.5,
  lookbackMs: 40,
  holdMs: 55,
};

/** An attack whose level jumped, waiting for its window to fill before it can be timed. */
interface PendingAttack {
  /** The time the window's level crossed the threshold. */
  readonly crossedAt: number;
  readonly level: number;
  /** The level of the sound before the attack. */
  readonly baseline: number;
}

/**
 * Times strikes to the millisecond. It reads the microphone's samples in blocks, each stamped
 * with the audio-clock time of its first sample, and reports when each strike began, one window
 * (12 ms) after it.
 */
export class AttackTimer {
  private readonly detector: OnsetDetector;
  private readonly ring: Float32Array;
  private readonly windowSeconds: number;
  private ringIndex = 0;
  private sumOfSquares = 0;
  private pending: PendingAttack | null = null;

  constructor(
    private readonly sampleRate: number,
    options: OnsetOptions = STRIKE_OPTIONS,
  ) {
    this.detector = new OnsetDetector(options);
    this.ring = new Float32Array(Math.max(HOP, Math.round((sampleRate * WINDOW_MS) / 1000)));
    this.windowSeconds = this.ring.length / sampleRate;
  }

  /**
   * Feeds a block whose first sample plays at `time` (seconds); returns the strike times it
   * settles, in seconds. Blocks are expected in order, with lengths a multiple of 64.
   */
  push(samples: Float32Array, time: number): number[] {
    const strikes: number[] = [];
    for (let start = 0; start + HOP <= samples.length; start += HOP) {
      for (let index = start; index < start + HOP; index++) {
        const square = samples[index] * samples[index];
        this.sumOfSquares += square - this.ring[this.ringIndex];
        this.ring[this.ringIndex] = square;
        this.ringIndex = (this.ringIndex + 1) % this.ring.length;
      }
      const level = Math.sqrt(Math.max(0, this.sumOfSquares) / this.ring.length);
      // The window now ends just after this step's last sample.
      const end = time + (start + HOP) / this.sampleRate;
      if (this.pending && end - this.pending.crossedAt >= this.windowSeconds) {
        strikes.push(this.startOf(this.pending, level));
        this.pending = null;
      }
      if (this.detector.push({ level, time: end * 1000 })) {
        this.pending = { crossedAt: end, level, baseline: this.detector.baseline };
      }
    }
    return strikes;
  }

  /**
   * When the level crossed the threshold, only the newest part of the window held the strike.
   * Comparing the energy then with the energy once the window is full of it says how much: the
   * strike began that share of a window before the crossing, however loud it was.
   */
  private startOf(attack: PendingAttack, settledLevel: number): number {
    const before = attack.baseline ** 2;
    const settled = settledLevel ** 2;
    const share =
      settled > before
        ? Math.min(1, Math.max(0, (attack.level ** 2 - before) / (settled - before)))
        : 1;
    return attack.crossedAt - share * this.windowSeconds;
  }
}
