/*
 * Rhythm timing: where the hits of a take should fall, and how far each strike was from them.
 * Times are in seconds on the audio clock (AudioContext.currentTime), offsets in milliseconds.
 */

/** Times of evenly spaced hits: `count` of them, `gap` seconds apart, from `start`. */
export function gridTimes(start: number, gap: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => start + index * gap);
}

/** Seconds between hits at a tempo, with `perBeat` hits in each beat (2 for eighth notes). */
export function hitGap(bpm: number, perBeat: number): number {
  return 60 / bpm / perBeat;
}

/** How far from the beat a hit still counts as on time: 15% of the gap, kept within 25–50 ms. */
export function toleranceMs(gapMs: number): number {
  return Math.min(50, Math.max(25, 0.15 * gapMs));
}

/** One expected hit: how early (negative) or late it was played, or null when missed. */
export interface HitResult {
  readonly expected: number;
  readonly offsetMs: number | null;
}

export interface TakeScore {
  readonly hits: readonly HitResult[];
  readonly toleranceMs: number;
  /** Hits within the tolerance, as a share of all expected hits. */
  readonly onTimeRatio: number;
  readonly missed: number;
  /** Strikes that matched no expected hit. */
  readonly extra: number;
  /** Average offset of the hits played: positive when you tend to be late. */
  readonly biasMs: number;
  /** How much the offsets vary around that average (standard deviation): your steadiness. */
  readonly spreadMs: number;
  /** Average distance from the beat, early or late alike. */
  readonly meanAbsMs: number;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

/**
 * Matches each expected hit with the closest strike less than half a gap away (each strike used
 * once), after taking the measured latency off the strikes.
 */
export function scoreTake(
  expected: readonly number[],
  strikes: readonly number[],
  latencyMs: number,
  gap: number,
): TakeScore {
  const heard = strikes.map((strike) => strike - latencyMs / 1000);
  const used = new Set<number>();
  const hits = expected.map((time): HitResult => {
    let best = -1;
    for (let index = 0; index < heard.length; index++) {
      const distance = Math.abs(heard[index] - time);
      const closer = best < 0 || distance < Math.abs(heard[best] - time);
      if (!used.has(index) && distance < gap / 2 && closer) {
        best = index;
      }
    }
    if (best < 0) {
      return { expected: time, offsetMs: null };
    }
    used.add(best);
    return { expected: time, offsetMs: (heard[best] - time) * 1000 };
  });
  const offsets = hits.flatMap((hit) => (hit.offsetMs === null ? [] : [hit.offsetMs]));
  const tolerance = toleranceMs(gap * 1000);
  return {
    hits,
    toleranceMs: tolerance,
    onTimeRatio:
      hits.length === 0
        ? 0
        : offsets.filter((offset) => Math.abs(offset) <= tolerance).length / hits.length,
    missed: hits.length - offsets.length,
    extra: heard.length - used.size,
    biasMs: mean(offsets),
    spreadMs: standardDeviation(offsets),
    meanAbsMs: mean(offsets.map(Math.abs)),
  };
}

/** A take passes with at least 80% of hits on time and no more than 10% missed. */
export function passes(score: TakeScore): boolean {
  return score.onTimeRatio >= 0.8 && score.missed <= 0.1 * score.hits.length;
}

export interface Calibration {
  /** The median delay from a click to your strike: sound out, sound in and your reaction. */
  readonly latencyMs: number;
  /** How much your strikes varied around it. */
  readonly spreadMs: number;
  /** Clicks you were heard striking along with. */
  readonly matched: number;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length === 0) {
    return 0;
  }
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** A value brought into (-half, half], as a position within one repeating cycle. */
function wrap(value: number, cycle: number): number {
  return value - cycle * Math.round(value / cycle);
}

/** A delay brought into [-¼, ¾) of a cycle: sound arrives late, never early. */
function wrapLate(value: number, cycle: number): number {
  return value - cycle * Math.floor(value / cycle + 0.25);
}

/**
 * Measures the delay between the clicks you played along to and your strikes.
 *
 * The clicks repeat every beat, so a delay is only known within one beat: a strike half a beat
 * late is as close to the next click as to its own. The offsets are therefore averaged as
 * positions on that cycle, then measured around that average, which keeps a group of strikes
 * near the half beat together instead of splitting it in two. The median keeps one stray strike
 * from moving the result. The delay comes out between a quarter of a beat early and three
 * quarters late, since speakers, Bluetooth and sound cards only ever add delay: up to 560 ms at
 * 80 bpm.
 */
export function estimateLatency(
  clicks: readonly number[],
  strikes: readonly number[],
): Calibration {
  const gapMs = (clicks.length > 1 ? clicks[1] - clicks[0] : 1) * 1000;
  const offsets = clicks.flatMap((click) => {
    const near = strikes.filter((strike) => Math.abs(strike - click) * 1000 < gapMs / 2);
    if (near.length === 0) {
      return [];
    }
    const closest = near.reduce((a, b) => (Math.abs(a - click) <= Math.abs(b - click) ? a : b));
    return [(closest - click) * 1000];
  });
  const angle = (ms: number) => (2 * Math.PI * ms) / gapMs;
  const center =
    (Math.atan2(
      offsets.reduce((sum, offset) => sum + Math.sin(angle(offset)), 0),
      offsets.reduce((sum, offset) => sum + Math.cos(angle(offset)), 0),
    ) *
      gapMs) /
    (2 * Math.PI);
  const deviations = offsets.map((offset) => wrap(offset - center, gapMs));
  const middle = median(deviations);
  return {
    latencyMs: wrapLate(center + middle, gapMs),
    spreadMs: Math.sqrt(mean(deviations.map((deviation) => (deviation - middle) ** 2))),
    matched: offsets.length,
  };
}

/** How long after a click its own sound can come back through the microphone. */
const LEAK_WINDOW_S = 0.15;

/**
 * True when strikes land just after the count-in clicks, while you aren't playing: the click is
 * reaching the microphone through the speakers.
 */
export function clickLeak(countInClicks: readonly number[], strikes: readonly number[]): boolean {
  const echoed = countInClicks.filter((click) =>
    strikes.some((strike) => strike >= click && strike - click <= LEAK_WINDOW_S),
  );
  return echoed.length >= 2;
}
