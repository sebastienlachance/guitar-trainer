import { IntervalName, semitonesOf } from './intervals';
import { mod } from './notes';

/** A chord shape independent of key: which tone each voice plays and how far above the bass. */
export interface Voicing {
  /** Chord tones from the lowest voice to the highest. */
  readonly tones: readonly IntervalName[];
  /** Semitones above the bass for each voice; the first is always 0. */
  readonly offsets: readonly number[];
}

export type VoicingStyle = 'close' | 'drop2';

/**
 * Stacks the chord tones as tightly as possible, starting from the tone at `inversion`.
 * Expects `intervals` in ascending order with no two tones on the same pitch class.
 */
export function closeVoicing(intervals: readonly IntervalName[], inversion: number): Voicing {
  const tones = [...intervals.slice(inversion), ...intervals.slice(0, inversion)];
  const bass = semitonesOf(tones[0]);
  return { tones, offsets: tones.map((tone) => mod(semitonesOf(tone) - bass, 12)) };
}

/** Drops the second-highest voice by an octave, which spreads a close chord across four strings. */
export function dropTwo(voicing: Voicing): Voicing {
  const dropped = voicing.tones.length - 2;
  const others = (_: unknown, index: number) => index !== dropped;
  const tones = [voicing.tones[dropped], ...voicing.tones.filter(others)];
  const offsets = [voicing.offsets[dropped] - 12, ...voicing.offsets.filter(others)];
  return { tones, offsets: offsets.map((offset) => offset - offsets[0]) };
}

/** Inversion number of a voicing: 0 when the root is in the bass, 1 for the next chord tone… */
export function inversionOf(voicing: Voicing, intervals: readonly IntervalName[]): number {
  return intervals.indexOf(voicing.tones[0]);
}

/**
 * The voicing with the given chord tone in the bass. For drop 2 this is named after the
 * resulting bass note, as guitarists do, so root position drop 2 comes from a close 2nd inversion.
 */
export function voicingFor(
  intervals: readonly IntervalName[],
  style: VoicingStyle,
  inversion: number,
): Voicing {
  if (style === 'close') {
    return closeVoicing(intervals, inversion);
  }
  const voicing = intervals
    .map((_, closeInversion) => dropTwo(closeVoicing(intervals, closeInversion)))
    .find((candidate) => inversionOf(candidate, intervals) === inversion);
  if (!voicing) {
    throw new Error(`No drop 2 voicing with inversion ${inversion}`);
  }
  return voicing;
}

const INVERSION_NAMES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

export function inversionName(inversion: number): string {
  return INVERSION_NAMES[inversion];
}
